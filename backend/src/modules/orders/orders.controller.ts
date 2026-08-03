import { Request, Response } from 'express';
import { randomBytes } from 'crypto';
import { prisma } from '../../config/prisma';
import { CreateOrderInput } from './orders.schema';

function generateReference(): string {
  const date = new Date();
  const prefix = 'KB';
  const dateStr = date.toISOString().slice(2, 10).replace(/-/g, '');
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${dateStr}-${rand}`;
}

function generatePublicToken(): string {
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

    const totalAmount = data.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const finalAmount = Math.max(0, totalAmount - data.discount);

    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
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

      // Update product stock with validation (tenant-scoped to prevent cross-tenant references)
      for (const item of data.items) {
        const product = await tx.product.findFirst({
          where: { id: item.productId, tenantId: req.user!.tenantId },
          select: { id: true, totalStock: true, name: true, isService: true },
        });

        if (!product) {
          throw new Error(`Product ${item.productId} not found in your catalog`);
        }

        // Skip stock decrement for services or made-to-order products
        if (product.isService) continue;

        if (product.totalStock < item.quantity) {
          throw new Error(`Stock insuffisant pour "${product.name}". Disponible: ${product.totalStock}, Demandé: ${item.quantity}`);
        }

        await tx.product.update({
          where: { id: item.productId },
          data: { totalStock: { decrement: item.quantity } },
        });
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
      const invDate = new Date();
      const invDateStr = invDate.toISOString().slice(2, 10).replace(/-/g, '');
      const invRand = Math.random().toString(36).substring(2, 6).toUpperCase();
      const invoiceNumber = `INV-${invDateStr}-${invRand}`;

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
      include: { items: { include: { product: { select: { id: true, isService: true } } } } },
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
      // Restore stock when cancelling (only for non-service items)
      if (status === 'CANCELLED') {
        for (const item of existing.items) {
          if (item.product?.isService) continue;
          await tx.product.update({
            where: { id: item.productId },
            data: { totalStock: { increment: item.quantity } },
          });
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
