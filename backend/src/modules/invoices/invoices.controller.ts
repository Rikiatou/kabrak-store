import { Request, Response } from 'express';
import { prisma } from '../../config/prisma';

function generateInvoiceNumber(): string {
  const date = new Date();
  const y = date.getFullYear().toString().slice(2);
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `FAC-${y}${m}-${rand}`;
}

export const getAll = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = '1', limit = '20', status } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where: Record<string, unknown> = { tenantId: req.user!.tenantId };
    if (status) where.paymentStatus = status as string;

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: {
          client: true,
          order: { include: { items: { include: { product: true } } } },
          lineItems: true,
          payments: true,
          createdBy: { select: { id: true, firstName: true, lastName: true } },
        },
        skip,
        take: parseInt(limit as string),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.invoice.count({ where }),
    ]);

    res.json({
      success: true,
      data: invoices,
      pagination: { total, page: parseInt(page as string), limit: parseInt(limit as string), pages: Math.ceil(total / parseInt(limit as string)) },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch invoices';
    res.status(500).json({ success: false, message });
  }
};

export const createFromOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId } = req.body;

    const order = await prisma.order.findFirst({
      where: { id: orderId, tenantId: req.user!.tenantId },
      include: { invoice: true },
    });

    if (!order) {
      res.status(404).json({ success: false, message: 'Commande non trouvée' });
      return;
    }

    if (order.invoice) {
      res.status(400).json({ success: false, message: 'Facture déjà créée pour cette commande' });
      return;
    }

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: generateInvoiceNumber(),
        totalAmount: order.finalAmount,
        amountPaid: order.amountPaid,
        amountDue: order.amountRemaining,
        paymentStatus: order.paymentStatus,
        tenantId: req.user!.tenantId,
        orderId: order.id,
        clientId: order.clientId,
        createdById: req.user!.id,
      },
      include: {
        client: true,
        order: { include: { items: { include: { product: true } } } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    // Update loyalty points (from Beauty Spa Pro pattern)
    if (order.clientId && order.paymentStatus === 'PAID') {
      try {
        const pointsPerXFCFA = parseInt(process.env.LOYALTY_POINTS_PER_FCFA || '1000');
        const pointsEarned = Math.floor(order.finalAmount / pointsPerXFCFA);
        if (pointsEarned > 0) {
          const client = await prisma.client.update({
            where: { id: order.clientId },
            data: {
              loyaltyPoints: { increment: pointsEarned },
              totalSpent: { increment: order.finalAmount },
              totalOrders: { increment: 1 },
              lastVisit: new Date(),
            },
          });
          // Auto-upgrade loyalty tier
          const TIERS = [
            { name: 'PLATINUM', min: 1000 },
            { name: 'GOLD', min: 500 },
            { name: 'SILVER', min: 100 },
            { name: 'BRONZE', min: 0 },
          ];
          const newTier = TIERS.find((t) => client.loyaltyPoints >= t.min)?.name || 'BRONZE';
          if (newTier !== client.loyaltyTier) {
            await prisma.client.update({
              where: { id: order.clientId },
              data: { loyaltyTier: newTier },
            });
          }
        }
      } catch (loyaltyErr) {
        console.warn('Loyalty update skipped:', (loyaltyErr as Error).message);
      }
    }

    // Create stock alert notifications for low stock
    try {
      const orderWithItems = await prisma.order.findUnique({
        where: { id: order.id },
        include: { items: { include: { product: true } } },
      });
      if (orderWithItems?.items) {
        for (const item of orderWithItems.items) {
          if (item.product.totalStock <= item.product.lowStockAlert) {
            const existing = await prisma.notification.findFirst({
              where: {
                tenantId: req.user!.tenantId,
                type: 'STOCK_ALERT',
                metadata: { path: ['productId'], equals: item.productId },
                isRead: false,
              },
            });
            if (!existing) {
              await prisma.notification.create({
                data: {
                  type: 'STOCK_ALERT',
                  title: 'Stock faible',
                  message: `${item.product.name}: ${item.product.totalStock} en stock (seuil: ${item.product.lowStockAlert})`,
                  tenantId: req.user!.tenantId,
                  metadata: { productId: item.productId, stock: item.product.totalStock },
                },
              });
            }
          }
        }
      }
    } catch (notifErr) {
      console.warn('Notification creation skipped:', (notifErr as Error).message);
    }

    res.status(201).json({ success: true, data: invoice });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create invoice';
    res.status(500).json({ success: false, message });
  }
};

export const createStandalone = async (req: Request, res: Response): Promise<void> => {
  try {
    const { clientId, projectId, items, notes, dueDate } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ success: false, message: 'At least one line item is required' });
      return;
    }

    const totalAmount = items.reduce((sum: number, item: { quantity: number; unitPrice: number }) => {
      return sum + (item.quantity * item.unitPrice);
    }, 0);

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: generateInvoiceNumber(),
        totalAmount,
        amountPaid: 0,
        amountDue: totalAmount,
        paymentStatus: 'PENDING',
        notes: notes || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        tenantId: req.user!.tenantId,
        clientId: clientId || null,
        projectId: projectId || null,
        createdById: req.user!.id,
        lineItems: {
          create: items.map((item: { description: string; quantity: number; unitPrice: number }) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.quantity * item.unitPrice,
          })),
        },
      },
      include: {
        client: true,
        lineItems: true,
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    res.status(201).json({ success: true, data: invoice });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create standalone invoice';
    res.status(500).json({ success: false, message });
  }
};

export const getOne = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const invoice = await prisma.invoice.findFirst({
      where: { id, tenantId: req.user!.tenantId },
      include: {
        client: true,
        order: { include: { items: { include: { product: true } } } },
        lineItems: true,
        payments: true,
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    if (!invoice) {
      res.status(404).json({ success: false, message: 'Facture non trouvée' });
      return;
    }

    res.json({ success: true, data: invoice });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch invoice';
    res.status(500).json({ success: false, message });
  }
};
