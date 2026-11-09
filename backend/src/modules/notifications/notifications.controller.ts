import { Request, Response } from 'express';
import { prisma } from '../../config/prisma';
import { notifyLowStock } from '../../utils/stock';

export const getAll = async (req: Request, res: Response): Promise<void> => {
  try {
    const { unreadOnly } = req.query;
    const where: Record<string, unknown> = { tenantId: req.user!.tenantId };
    if (unreadOnly === 'true') where.isRead = false;

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const unreadCount = await prisma.notification.count({
      where: { tenantId: req.user!.tenantId, isRead: false },
    });

    res.json({ success: true, data: notifications, unreadCount });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur';
    res.status(500).json({ success: false, message });
  }
};

export const markRead = async (req: Request, res: Response): Promise<void> => {
  try {
    const notifId = req.params.id as string;
    await prisma.notification.updateMany({
      where: { id: notifId, tenantId: req.user!.tenantId },
      data: { isRead: true },
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur' });
  }
};

export const markAllRead = async (req: Request, res: Response): Promise<void> => {
  try {
    await prisma.notification.updateMany({
      where: { tenantId: req.user!.tenantId, isRead: false },
      data: { isRead: true },
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur' });
  }
};

export const checkStockAlerts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { products, created } = await notifyLowStock(req.user!.tenantId);
    res.json({
      success: true,
      data: { lowStockCount: products.length, newAlerts: created, products },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur';
    res.status(500).json({ success: false, message });
  }
};
