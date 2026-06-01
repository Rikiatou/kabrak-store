import { Request, Response } from 'express';
import { prisma } from '../../config/prisma';
import { CreateOrderInput } from './orders.schema';

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

    const totalAmount = data.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const finalAmount = Math.max(0, totalAmount - data.discount);
    const amountRemaining = finalAmount - data.amountPaid;
    const paymentStatus = data.amountPaid >= finalAmount ? 'PAID' : data.amountPaid > 0 ? 'PARTIAL' : 'PENDING';

    const order = await prisma.$transaction(async (tx) => {
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

      // Update product stock with validation
      for (const item of data.items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
          select: { totalStock: true },
        });

        if (!product) {
          throw new Error(`Product ${item.productId} not found`);
        }

        if (product.totalStock < item.quantity) {
          throw new Error(`Insufficient stock for product ${item.productId}. Available: ${product.totalStock}, Requested: ${item.quantity}`);
        }

        await tx.product.update({
          where: { id: item.productId },
          data: { totalStock: { decrement: item.quantity } },
        });
      }

      // Update client stats
      if (data.clientId) {
        await tx.client.update({
          where: { id: data.clientId },
          data: {
            totalSpent: { increment: data.amountPaid },
            totalOrders: { increment: 1 },
          },
        });
      }

      // Auto-create invoice when payment is made at order creation
      if (data.amountPaid > 0) {
        const invDate = new Date();
        const invDateStr = invDate.toISOString().slice(2, 10).replace(/-/g, '');
        const invRand = Math.random().toString(36).substring(2, 6).toUpperCase();
        const invoiceNumber = `INV-${invDateStr}-${invRand}`;
        await tx.invoice.create({
          data: {
            invoiceNumber,
            totalAmount: finalAmount,
            amountPaid: data.amountPaid,
            amountDue: Math.max(0, amountRemaining),
            paymentStatus,
            paidAt: paymentStatus === 'PAID' ? new Date() : undefined,
            orderId: newOrder.id,
            clientId: data.clientId ?? undefined,
            tenantId: req.user!.tenantId,
            createdById: req.user!.id,
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
    });

    if (!existing) {
      res.status(404).json({ success: false, message: 'Commande non trouvée' });
      return;
    }

    const order = await prisma.order.update({
      where: { id },
      data: { status },
      include: {
        client: true,
        items: { include: { product: true } },
      },
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
        await tx.client.update({
          where: { id: order.clientId },
          data: { totalSpent: { increment: amount } },
        });
      }

      // Auto-create invoice if it doesn't exist (on first payment)
      let invoice = await tx.invoice.findUnique({ where: { orderId: order.id } });
      if (!invoice) {
        // Generate invoice number
        const date = new Date();
        const dateStr = date.toISOString().slice(2, 10).replace(/-/g, '');
        const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
        const invoiceNumber = `INV-${dateStr}-${rand}`;

        invoice = await tx.invoice.create({
          data: {
            invoiceNumber,
            totalAmount: order.finalAmount,
            amountPaid: amount,
            amountDue: order.finalAmount - amount,
            paymentStatus,
            paidAt: paymentStatus === 'PAID' ? new Date() : undefined,
            orderId: order.id,
            clientId: order.clientId,
            tenantId: req.user!.tenantId,
            createdById: req.user!.id,
          },
        });
      }

      // Create payment and update invoice
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

      // Ensure amountDue doesn't go negative
      await tx.invoice.update({
        where: { id: invoice.id },
        data: { amountDue: { set: Math.max(0, invoice.amountDue - amount) } },
      });

      return updated;
    });

    res.json({ success: true, data: updatedOrder });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to add payment';
    res.status(500).json({ success: false, message });
  }
};
