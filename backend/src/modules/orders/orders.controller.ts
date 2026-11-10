import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';
import { randomBytes } from 'crypto';
import { prisma } from '../../config/prisma';
import { generateInvoiceNumber } from '../../utils/invoiceNumber';
import { CreateOrderInput, FixDiscountInput, ReturnItemsInput } from './orders.schema';
import { StockError, STOCK_SELECT, itemCost, moveStock, notifyLowStock, unitsPerItem } from '../../utils/stock';

export function generateReference(): string {
  const date = new Date();
  const prefix = 'KB';
  const dateStr = date.toISOString().slice(2, 10).replace(/-/g, '');
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${dateStr}-${rand}`;
}

export function generatePublicToken(): string {
  return randomBytes(24).toString('hex');
}

export const getAll = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = '1', limit = '20', status, clientId, from, to, search } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where: Record<string, unknown> = { tenantId: req.user!.tenantId };
    if (status) where.status = status as string;
    if (clientId) where.clientId = clientId as string;

    // Search by reference or client name
    if (search) {
      where.OR = [
        { reference: { contains: search as string, mode: 'insensitive' } },
        { client: { name: { contains: search as string, mode: 'insensitive' } } },
      ];
    }

    // Date range filter
    if (from || to) {
      where.createdAt = {} as { gte?: Date; lte?: Date };
      if (from) (where.createdAt as { gte?: Date; lte?: Date }).gte = new Date(from as string);
      if (to) {
        const toDate = new Date(to as string);
        toDate.setHours(23, 59, 59, 999);
        (where.createdAt as { gte?: Date; lte?: Date }).lte = toDate;
      }
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          client: true,
          items: { include: { product: true } },
          createdBy: { select: { id: true, firstName: true, lastName: true } },
          seller: { select: { id: true, firstName: true, lastName: true } },
        },
        skip,
        take: parseInt(limit as string),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.order.count({ where }),
    ]);

    res.json({
      success: true,
      data: orders,
      pagination: {
        total,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        pages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch orders';
    res.status(500).json({ success: false, message });
  }
};

export const getOne = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const order = await prisma.order.findFirst({
      where: { id, tenantId: req.user!.tenantId },
      include: {
        client: true,
        items: { include: { product: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        seller: { select: { id: true, firstName: true, lastName: true } },
        invoice: true,
        delivery: true,
      },
    });

    if (!order) {
      res.status(404).json({ success: false, message: 'Commande non trouvée' });
      return;
    }

    res.json({ success: true, data: order });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch order';
    res.status(500).json({ success: false, message });
  }
};


export const create = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = req.body as CreateOrderInput;

    // Offline sales are replayed with a client-generated id; a replay returns the order already saved.
    if (data.offlineId) {
      const replayed = await prisma.order.findFirst({
        where: { offlineId: data.offlineId, tenantId: req.user!.tenantId },
        include: { client: true, items: { include: { product: true } }, invoice: { include: { lineItems: true, payments: true } } },
      });
      if (replayed) {
        res.status(200).json({ success: true, data: replayed });
        return;
      }
    }
    const isReplay = Boolean(data.offlineId && data.createdAt);
    const createdAt = data.createdAt && new Date(data.createdAt) <= new Date() ? new Date(data.createdAt) : undefined;

    const totalAmount = data.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    if (data.discount > totalAmount) {
      res.status(400).json({ success: false, code: 'DISCOUNT_TOO_HIGH', message: 'La remise dépasse le total' });
      return;
    }
    const finalAmount = totalAmount - data.discount;

    const order = await prisma.$transaction(async (tx) => {
      const catalog = await tx.product.findMany({
        where: { id: { in: data.items.map((i) => i.productId) }, tenantId: req.user!.tenantId },
        select: STOCK_SELECT,
      });
      const byId = new Map(catalog.map((p) => [p.id, p]));

      const newOrder = await tx.order.create({
        data: {
          offlineId: data.offlineId,
          dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
          ...(createdAt ? { createdAt } : {}),
          reference: generateReference(),
          publicToken: generatePublicToken(),
          totalAmount,
          discount: data.discount,
          finalAmount,
          notes: data.notes,
          tenantId: req.user!.tenantId,
          clientId: data.clientId ?? undefined,
          createdById: req.user!.id,
          sellerId: data.sellerId ?? undefined,
          items: {
            create: data.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.unitPrice * item.quantity,
              unitCost: byId.has(item.productId) ? itemCost(byId.get(item.productId)!, item.variant, item.pack) : null,
              variant: item.variant,
              packSize: byId.has(item.productId) && unitsPerItem(byId.get(item.productId)!, item.pack) > 1 ? byId.get(item.productId)!.packSize : null,
            })),
          },
        },
        include: {
          client: true,
          items: { include: { product: true } },
          createdBy: { select: { id: true, firstName: true, lastName: true } },
        },
      });

      // Update product stock with validation (tenant-scoped to prevent cross-tenant references)
      for (const item of data.items) {
        const product = await tx.product.findFirst({
          where: { id: item.productId, tenantId: req.user!.tenantId },
          select: STOCK_SELECT,
        });

        if (!product) {
          throw new StockError(`Product ${item.productId} not found in your catalog`);
        }

        // Skip stock decrement for services or made-to-order products
        if (product.isService) continue;

        // Offline replays record sales that already happened, so they are never blocked on stock.
        await moveStock(tx, product, item.variant, -item.quantity * unitsPerItem(product, item.pack), !isReplay);
      }

      // Update client stats (orders count only, payment stats handled by invoice)
      if (data.clientId) {
        await tx.client.update({
          where: { id: data.clientId },
          data: {
            totalOrders: { increment: 1 },
          },
        });
      }

      // Always create invoice
      const invoiceNumber = await generateInvoiceNumber(req.user!.tenantId, tx);

      const paymentStatus = data.amountPaid >= finalAmount ? 'PAID' : data.amountPaid > 0 ? 'PARTIAL' : 'PENDING';
      const amountDue = Math.max(0, finalAmount - data.amountPaid);

      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          totalAmount: finalAmount,
          amountPaid: data.amountPaid,
          amountDue,
          paymentStatus,
          paidAt: paymentStatus === 'PAID' ? new Date() : undefined,
          orderId: newOrder.id,
          clientId: data.clientId ?? undefined,
          tenantId: req.user!.tenantId,
          createdById: req.user!.id,
          payments: data.amountPaid > 0 ? {
            create: {
              amount: data.amountPaid,
              method: data.paymentMethod || 'CASH',
              reference: data.paymentReference || null,
              notes: data.paymentNotes || null,
            },
          } : undefined,
        },
      });

      // Update client spent amount + loyalty points when payment is made
      if (data.clientId && data.amountPaid > 0) {
        const pointsEarned = Math.floor(data.amountPaid / 1000); // 1 point per 1000 FCFA
        const currentClient = await tx.client.findUnique({
          where: { id: data.clientId },
          select: { loyaltyPoints: true },
        });
        const newPoints = (currentClient?.loyaltyPoints || 0) + pointsEarned;
        const newTier =
          newPoints >= 1000 ? 'PLATINUM' :
          newPoints >= 500  ? 'GOLD' :
          newPoints >= 100  ? 'SILVER' : 'BRONZE';
        await tx.client.update({
          where: { id: data.clientId },
          data: {
            totalSpent: { increment: data.amountPaid },
            loyaltyPoints: { increment: pointsEarned },
            loyaltyTier: newTier,
          },
        });
      }

      return newOrder;
    });

    await notifyLowStock(req.user!.tenantId, data.items.map((i) => i.productId)).catch((e) => console.error('low stock alert', e));

    const orderWithInvoice = await prisma.order.findUnique({
      where: { id: order.id },
      include: {
        client: true,
        items: { include: { product: true } },
        invoice: { include: { lineItems: true, payments: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    res.status(201).json({ success: true, data: orderWithInvoice });
  } catch (error) {
    if (error instanceof StockError) {
      res.status(400).json({ success: false, code: 'INSUFFICIENT_STOCK', message: error.message });
      return;
    }
    // Two replays of the same offline sale raced: return the order the first one saved.
    const offlineId = (req.body as CreateOrderInput).offlineId;
    if (offlineId && error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const existing = await prisma.order.findFirst({
        where: { offlineId, tenantId: req.user!.tenantId },
        include: { client: true, items: { include: { product: true } }, invoice: { include: { lineItems: true, payments: true } } },
      });
      if (existing) {
        res.status(200).json({ success: true, data: existing });
        return;
      }
    }
    const message = error instanceof Error ? error.message : 'Failed to create order';
    res.status(500).json({ success: false, message });
  }
};

export const updateStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { status } = req.body;

    const existing = await prisma.order.findFirst({
      where: { id, tenantId: req.user!.tenantId },
      include: { items: { include: { product: { select: { id: true, isService: true, adaptiveFields: true } } } } },
    });

    if (!existing) {
      res.status(404).json({ success: false, message: 'Commande non trouvée' });
      return;
    }

    // Prevent changing status of terminal orders
    if (existing.status === 'CANCELLED') {
      res.status(400).json({ success: false, message: 'Impossible de modifier une commande annulée' });
      return;
    }
    if (existing.status === 'DELIVERED' && status !== 'DELIVERED') {
      res.status(400).json({ success: false, message: 'Impossible de modifier une commande livrée' });
      return;
    }
    // No-op if same status
    if (existing.status === status) {
      res.json({ success: true, data: existing });
      return;
    }

    const order = await prisma.$transaction(async (tx) => {
      const claimed = await tx.order.updateMany({
        where: { id, tenantId: req.user!.tenantId, status: existing.status },
        data: { status },
      });
      if (claimed.count === 0) throw new Error('STATUS_CONFLICT');

      // Restore stock when cancelling (only for non-service items)
      if (status === 'CANCELLED') {
        for (const item of existing.items) {
          if (item.product?.isService) continue;
          const current = await tx.product.findUnique({ where: { id: item.productId }, select: STOCK_SELECT });
          if (current) await moveStock(tx, current, item.variant, item.quantity * (item.packSize || 1), false);
        }
      }

      return tx.order.findUniqueOrThrow({
        where: { id },
        include: {
          client: true,
          items: { include: { product: true } },
        },
      });
    });

    res.json({ success: true, data: order });
  } catch (error) {
    if (error instanceof Error && error.message === 'STATUS_CONFLICT') {
      res.status(409).json({ success: false, code: 'STATUS_CONFLICT', message: 'La commande a déjà été modifiée' });
      return;
    }
    const message = error instanceof Error ? error.message : 'Failed to update order';
    res.status(500).json({ success: false, message });
  }
};

/**
 * Owner fixes a wrong discount on a past sale (e.g. the amount received typed in the "Remise" box).
 * The sale keeps its date; money received is recorded on the sale's day so that day's Z becomes right.
 */
export const fixDiscount = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const { discount, amountPaid, method } = req.body as FixDiscountInput;
  try {
    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({ where: { id, tenantId: req.user!.tenantId }, include: { invoice: true } });
      if (!order) throw new ReturnError(404, 'Commande non trouvée');
      if (order.status === 'CANCELLED') throw new ReturnError(400, 'Cette vente est annulée');
      if (discount > order.totalAmount) throw new ReturnError(400, 'La remise dépasse le total');
      const finalAmount = order.totalAmount - discount;
      const inv = order.invoice;
      const alreadyPaid = inv?.amountPaid ?? 0;
      if (finalAmount < alreadyPaid) throw new ReturnError(400, 'Le client a déjà payé plus que ce total : utilisez un retour');
      if (alreadyPaid + amountPaid > finalAmount) throw new ReturnError(400, `Au plus ${finalAmount - alreadyPaid} F restent à payer`);

      const who = await tx.user.findUnique({ where: { id: req.user!.id }, select: { firstName: true, lastName: true } });
      const stamp = new Date().toLocaleDateString('fr-FR');
      await tx.order.update({
        where: { id },
        data: {
          discount,
          finalAmount,
          notes: [order.notes, `Remise corrigée ${stamp} par ${`${who?.firstName ?? ''} ${who?.lastName ?? ''}`.trim()} : ${order.discount} F → ${discount} F`].filter(Boolean).join('\n'),
        },
      });
      if (inv) {
        if (amountPaid > 0) {
          await tx.payment.create({ data: { invoiceId: inv.id, amount: amountPaid, method, createdAt: order.createdAt, notes: 'Correction de remise' } });
        }
        const paid = alreadyPaid + amountPaid;
        await tx.invoice.update({
          where: { id: inv.id },
          data: {
            totalAmount: finalAmount,
            amountPaid: paid,
            amountDue: Math.max(0, finalAmount - paid),
            paymentStatus: paid >= finalAmount ? 'PAID' : paid > 0 ? 'PARTIAL' : 'PENDING',
            paidAt: paid >= finalAmount ? (inv.paidAt ?? new Date()) : null,
          },
        });
        if (order.clientId && amountPaid > 0) {
          await tx.client.update({ where: { id: order.clientId }, data: { totalSpent: { increment: amountPaid } } });
        }
      }
      return tx.order.findUniqueOrThrow({ where: { id }, include: { client: true, items: { include: { product: true } }, invoice: true } });
    });
    res.json({ success: true, data: result });
  } catch (error) {
    if (error instanceof ReturnError) {
      res.status(error.status).json({ success: false, message: error.message });
      return;
    }
    const message = error instanceof Error ? error.message : 'Failed to fix discount';
    res.status(500).json({ success: false, message });
  }
};

class ReturnError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

/**
 * Client brings items back: each line goes back to its own stock (variant, unit or pack), the order and invoice
 * totals shrink, and money already paid above the new total is refunded as a negative payment (counted today in the cash closing).
 */
export const returnItems = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const { items, method, note } = req.body as ReturnItemsInput;
  try {
    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: { id, tenantId: req.user!.tenantId },
        include: { items: { include: { product: { select: { name: true, isService: true } } } }, invoice: true },
      });
      if (!order) throw new ReturnError(404, 'Commande non trouvée');
      if (order.status === 'CANCELLED') throw new ReturnError(400, 'Cette vente est annulée');

      let value = 0;
      const lines: string[] = [];
      const returned = new Map<string, number>();
      for (const r of items) {
        const it = order.items.find((i) => i.id === r.itemId);
        if (!it) throw new ReturnError(400, 'Article introuvable dans cette vente');
        const claimed = await tx.orderItem.updateMany({
          where: { id: it.id, quantity: { gte: r.quantity } },
          data: { quantity: { decrement: r.quantity }, returnedQty: { increment: r.quantity }, totalPrice: { decrement: it.unitPrice * r.quantity } },
        });
        if (claimed.count === 0) throw new ReturnError(400, `Au plus ${it.quantity - (returned.get(it.id) ?? 0)} × ${it.product.name} peuvent être rendus`);
        if (!it.product.isService) {
          const current = await tx.product.findUnique({ where: { id: it.productId }, select: STOCK_SELECT });
          if (current) await moveStock(tx, current, it.variant, r.quantity * (it.packSize || 1), false);
        }
        returned.set(it.id, (returned.get(it.id) ?? 0) + r.quantity);
        value += it.unitPrice * r.quantity;
        lines.push(`${r.quantity} × ${[it.product.name, it.variant].filter(Boolean).join(' · ')}`);
      }

      // The order discount is shared out over the returned lines
      const ratio = order.totalAmount > 0 ? order.finalAmount / order.totalAmount : 1;
      const lost = Math.round(value * ratio);
      const allReturned = order.items.every((i) => i.quantity - (returned.get(i.id) ?? 0) <= 0);
      const stamp = new Date().toLocaleDateString('fr-FR');
      await tx.order.update({
        where: { id },
        data: {
          totalAmount: Math.max(0, order.totalAmount - value),
          finalAmount: Math.max(0, order.finalAmount - lost),
          notes: [order.notes, `Retour ${stamp} : ${lines.join(', ')} (−${lost} F)${note ? ` · ${note}` : ''}`].filter(Boolean).join('\n'),
        },
      });

      let refund = 0;
      if (order.invoice) {
        const inv = order.invoice;
        const total = Math.max(0, inv.totalAmount - lost);
        refund = Math.max(0, Math.round((inv.amountPaid - total) * 100) / 100);
        const paid = inv.amountPaid - refund;
        if (refund > 0) {
          await tx.payment.create({ data: { invoiceId: inv.id, amount: -refund, method, notes: `Remboursement retour${note ? ` · ${note}` : ''}` } });
        }
        await tx.invoice.update({
          where: { id: inv.id },
          data: {
            totalAmount: total,
            amountPaid: paid,
            amountDue: Math.max(0, total - paid),
            paymentStatus: allReturned ? 'REFUNDED' : paid >= total ? 'PAID' : paid > 0 ? 'PARTIAL' : 'PENDING',
          },
        });
      }
      return { value: lost, refund };
    });
    res.json({ success: true, data: result });
  } catch (error) {
    if (error instanceof ReturnError) {
      res.status(error.status).json({ success: false, message: error.message });
      return;
    }
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Failed to return items' });
  }
};

/** Upcoming orders with a pickup/delivery date (cakes, made-to-order). */
export const getAgenda = async (req: Request, res: Response): Promise<void> => {
  try {
    const from = req.query.from ? new Date(req.query.from as string) : new Date(new Date().setHours(0, 0, 0, 0));
    const to = req.query.to ? new Date(req.query.to as string) : new Date(from.getTime() + 31 * 24 * 3600 * 1000);
    const orders = await prisma.order.findMany({
      where: { tenantId: req.user!.tenantId, dueDate: { gte: from, lt: to }, status: { not: 'CANCELLED' } },
      orderBy: { dueDate: 'asc' },
      include: {
        client: { select: { id: true, name: true, phone: true } },
        items: { include: { product: { select: { id: true, name: true } } } },
        invoice: { select: { id: true, amountPaid: true, amountDue: true, paymentStatus: true } },
      },
    });
    res.json({ success: true, data: orders });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch agenda';
    res.status(500).json({ success: false, message });
  }
};
