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

    res.status(201).json({ success: true, data: invoice });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create invoice';
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
