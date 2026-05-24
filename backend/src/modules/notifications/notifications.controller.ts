import { Request, Response } from 'express';
import { prisma } from '../../config/prisma';

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
    const alertProducts = await prisma.$queryRaw<
      Array<{ id: string; name: string; totalStock: number; lowStockAlert: number }>
    >`
      SELECT id, name, "totalStock", "lowStockAlert"
      FROM products
      WHERE "tenantId" = ${req.user!.tenantId}
        AND "isActive" = true
        AND "totalStock" <= "lowStockAlert"
    `;

    const created: string[] = [];
    for (const product of alertProducts) {
      const exists = await prisma.notification.findFirst({
        where: {
          tenantId: req.user!.tenantId,
          type: 'STOCK_ALERT',
          metadata: { path: ['productId'], equals: product.id },
          isRead: false,
        },
      });

      if (!exists) {
        await prisma.notification.create({
          data: {
            type: 'STOCK_ALERT',
            title: 'Stock faible',
            message: `${product.name}: ${product.totalStock} en stock (seuil: ${product.lowStockAlert})`,
            tenantId: req.user!.tenantId,
            metadata: { productId: product.id, stock: product.totalStock },
          },
        });
        created.push(product.name);
      }
    }

    res.json({
      success: true,
      data: {
        lowStockCount: alertProducts.length,
        newAlerts: created.length,
        products: alertProducts,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur';
    res.status(500).json({ success: false, message });
  }
};
