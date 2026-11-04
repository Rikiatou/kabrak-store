import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { CreateOrderInput } from './orders.schema';
import { calculateTier, POINTS_PER_FCFA } from '../loyalty/loyalty.controller';

type ProductVariant = { name: string; stock: number };

async function adjustVariantStock(tx: Prisma.TransactionClient, productId: string, variant: string | null | undefined, delta: number) {
  if (!variant) return;
  const product = await tx.product.findUnique({ where: { id: productId }, select: { variants: true } });
  if (!Array.isArray(product?.variants)) return;
  const variants = product.variants as unknown as ProductVariant[];
  const next = variants.map((v) => (v.name === variant ? { ...v, stock: v.stock + delta } : v));
  await tx.product.update({ where: { id: productId }, data: { variants: next } });
}

class InsufficientStockError extends Error {
  constructor(variant: string) {
    super(`Stock insuffisant pour la variante ${variant}`);
  }
}

function generateReference(): string {
  const date = new Date();
  const prefix = 'KB';
  const dateStr = date.toISOString().slice(2, 10).replace(/-/g, '');
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${dateStr}-${rand}`;
}

export const getAll = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = '1', limit = '20', status, clientId, from, to } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where: Record<string, unknown> = { tenantId: req.user!.tenantId };
    if (status) where.status = status as string;
    if (clientId) where.clientId = clientId as string;
    if (from || to) {
      where.createdAt = {};
      if (from) (where.createdAt as Record<string, unknown>).gte = new Date(from as string);
      if (to) (where.createdAt as Record<string, unknown>).lte = new Date(to as string);
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
      const existing = await prisma.order.findFirst({
        where: { offlineId: data.offlineId, tenantId: req.user!.tenantId },
        include: { client: true, items: { include: { product: true } } },
      });
      if (existing) {
        res.status(200).json({ success: true, data: existing });
        return;
      }
    }

    const totalAmount = data.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const finalAmount = totalAmount - data.discount;
    const amountRemaining = finalAmount - data.amountPaid;
    const paymentStatus = data.amountPaid >= finalAmount ? 'PAID' : data.amountPaid > 0 ? 'PARTIAL' : 'PENDING';

    const order = await prisma.$transaction(async (tx) => {
      const products = await tx.product.findMany({
        where: { id: { in: data.items.map((i) => i.productId) }, tenantId: req.user!.tenantId },
        select: { id: true, costPrice: true, variants: true },
      });
      const costById = new Map(products.map((p) => [p.id, p.costPrice]));

      // Offline replays record sales that already happened, so only live sales are blocked on variant stock.
      if (!data.createdAt) {
        for (const item of data.items) {
          if (!item.variant) continue;
          const variants = products.find((p) => p.id === item.productId)?.variants as unknown as ProductVariant[] | null;
          const requested = data.items
            .filter((i) => i.productId === item.productId && i.variant === item.variant)
            .reduce((sum, i) => sum + i.quantity, 0);
          const available = Array.isArray(variants) ? variants.find((v) => v.name === item.variant)?.stock ?? 0 : Infinity;
          if (requested > available) throw new InsufficientStockError(item.variant);
        }
      }

      const newOrder = await tx.order.create({
        data: {
          reference: generateReference(),
          totalAmount,
          discount: data.discount,
          finalAmount,
          amountPaid: data.amountPaid,
          amountRemaining: amountRemaining < 0 ? 0 : amountRemaining,
          paymentMethod: data.paymentMethod,
          paymentStatus,
          offlineId: data.offlineId,
          ...(data.createdAt && new Date(data.createdAt) <= new Date() ? { createdAt: new Date(data.createdAt) } : {}),
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
              unitCost: costById.get(item.productId) ?? null,
              variant: item.variant,
            })),
          },
        },
        include: {
          client: true,
          items: { include: { product: true } },
          createdBy: { select: { id: true, firstName: true, lastName: true } },
        },
      });

      // Update product stock
      for (const item of data.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { totalStock: { decrement: item.quantity } },
        });
        await adjustVariantStock(tx, item.productId, item.variant, -item.quantity);
      }

      // Update client stats
      if (data.clientId) {
        const client = await tx.client.update({
          where: { id: data.clientId },
          data: {
            totalSpent: { increment: data.amountPaid },
            totalOrders: { increment: 1 },
            loyaltyPoints: { increment: Math.floor(data.amountPaid / POINTS_PER_FCFA) },
            lastVisit: new Date(),
          },
        });
        const tier = calculateTier(client.loyaltyPoints);
        if (tier !== client.loyaltyTier) {
          await tx.client.update({ where: { id: client.id }, data: { loyaltyTier: tier } });
        }
      }

      return newOrder;
    });

    res.status(201).json({ success: true, data: order });
  } catch (error) {
    if (error instanceof InsufficientStockError) {
      res.status(400).json({ success: false, message: error.message });
      return;
    }
    // Two replays of the same offline sale raced: return the order the first one saved.
    const offlineId = (req.body as CreateOrderInput).offlineId;
    if (offlineId && error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const existing = await prisma.order.findFirst({
        where: { offlineId, tenantId: req.user!.tenantId },
        include: { client: true, items: { include: { product: true } } },
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
      include: { items: true },
    });

    if (!existing) {
      res.status(404).json({ success: false, message: 'Commande non trouvée' });
      return;
    }

    // Cancelling returns items to stock; reopening a cancelled order takes them out again.
    const wasCancelled = existing.status === 'CANCELLED';
    const isCancelled = status === 'CANCELLED';

    const order = await prisma.$transaction(async (tx) => {
      if (wasCancelled !== isCancelled) {
        for (const item of existing.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { totalStock: isCancelled ? { increment: item.quantity } : { decrement: item.quantity } },
          });
          await adjustVariantStock(tx, item.productId, item.variant, isCancelled ? item.quantity : -item.quantity);
        }
      }
      return tx.order.update({
        where: { id },
        data: { status },
        include: {
          client: true,
          items: { include: { product: true } },
        },
      });
    });

    res.json({ success: true, data: order });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update order';
    res.status(500).json({ success: false, message });
  }
};

export const addPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { amount, method = 'CASH', reference, notes } = req.body;

    const order = await prisma.order.findFirst({
      where: { id, tenantId: req.user!.tenantId },
    });

    if (!order) {
      res.status(404).json({ success: false, message: 'Commande non trouvée' });
      return;
    }

    const newPaid = order.amountPaid + amount;
    const newRemaining = order.finalAmount - newPaid;
    const paymentStatus = newPaid >= order.finalAmount ? 'PAID' : 'PARTIAL';

    const updatedOrder = await prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id },
        data: {
          amountPaid: newPaid,
          amountRemaining: newRemaining < 0 ? 0 : newRemaining,
          paymentStatus,
        },
      });

      if (order.clientId) {
        const pointsEarned =
          Math.floor(Math.min(newPaid, order.finalAmount) / POINTS_PER_FCFA) -
          Math.floor(order.amountPaid / POINTS_PER_FCFA);
        const client = await tx.client.update({
          where: { id: order.clientId },
          data: { totalSpent: { increment: amount }, loyaltyPoints: { increment: Math.max(0, pointsEarned) } },
        });
        const tier = calculateTier(client.loyaltyPoints);
        if (tier !== client.loyaltyTier) {
          await tx.client.update({ where: { id: client.id }, data: { loyaltyTier: tier } });
        }
      }

      // Create invoice payment if invoice exists
      const invoice = await tx.invoice.findUnique({ where: { orderId: order.id } });
      if (invoice) {
        await tx.payment.create({
          data: { amount, method, reference, notes, invoiceId: invoice.id },
        });
        await tx.invoice.update({
          where: { id: invoice.id },
          data: {
            amountPaid: { increment: amount },
            amountDue: { decrement: amount },
            paymentStatus,
            paidAt: paymentStatus === 'PAID' ? new Date() : undefined,
          },
        });
      }

      return updated;
    });

    res.json({ success: true, data: updatedOrder });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to add payment';
    res.status(500).json({ success: false, message });
  }
};
