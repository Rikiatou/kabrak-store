import { Request, Response } from 'express';
import { prisma } from '../../config/prisma';

export const getAll = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status } = req.query;
    const where: Record<string, unknown> = { tenantId: req.user!.tenantId };
    if (status) where.status = status as string;

    const deliveries = await prisma.delivery.findMany({
      where,
      include: {
        order: { include: { items: { include: { product: true } } } },
        client: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: deliveries });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch deliveries';
    res.status(500).json({ success: false, message });
  }
};

export const create = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId, address, phone, notes, deliveryDate } = req.body;

    const order = await prisma.order.findFirst({
      where: { id: orderId, tenantId: req.user!.tenantId },
      include: { delivery: true },
    });

    if (!order) {
      res.status(404).json({ success: false, message: 'Commande non trouvée' });
      return;
    }

    if (order.delivery) {
      res.status(400).json({ success: false, message: 'Livraison déjà créée' });
      return;
    }

    const delivery = await prisma.delivery.create({
      data: {
        address,
        phone,
        notes,
        deliveryDate: deliveryDate ? new Date(deliveryDate) : undefined,
        tenantId: req.user!.tenantId,
        orderId,
        clientId: order.clientId,
      },
      include: { order: true, client: true },
    });

    res.status(201).json({ success: true, data: delivery });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create delivery';
    res.status(500).json({ success: false, message });
  }
};

export const updateStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { status } = req.body;

    const existing = await prisma.delivery.findFirst({
      where: { id, tenantId: req.user!.tenantId },
    });

    if (!existing) {
      res.status(404).json({ success: false, message: 'Livraison non trouvée' });
      return;
    }

    const delivery = await prisma.delivery.update({
      where: { id },
      data: {
        status,
        deliveredAt: status === 'DELIVERED' ? new Date() : undefined,
      },
      include: { order: true, client: true },
    });

    if (status === 'DELIVERED') {
      await prisma.order.update({
        where: { id: delivery.orderId },
        data: { status: 'DELIVERED' },
      });
    }

    res.json({ success: true, data: delivery });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update delivery';
    res.status(500).json({ success: false, message });
  }
};
