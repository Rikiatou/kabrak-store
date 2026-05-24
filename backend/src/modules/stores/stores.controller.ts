import { Request, Response } from 'express';
import { prisma } from '../../config/prisma';

export const getAll = async (req: Request, res: Response): Promise<void> => {
  try {
    const stores = await prisma.store.findMany({
      where: { tenantId: req.user!.tenantId },
      include: {
        _count: { select: { users: true, products: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ success: true, data: stores });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur';
    res.status(500).json({ success: false, message });
  }
};

export const create = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: req.user!.tenantId },
    });

    if (tenant?.plan !== 'BUSINESS') {
      res.status(403).json({
        success: false,
        message: 'Multi-magasins disponible uniquement avec le plan BUSINESS',
      });
      return;
    }

    const { name, address, phone } = req.body;
    const existingCount = await prisma.store.count({
      where: { tenantId: req.user!.tenantId },
    });

    const store = await prisma.store.create({
      data: {
        name: name as string,
        address: address as string | undefined,
        phone: phone as string | undefined,
        isMain: existingCount === 0,
        tenantId: req.user!.tenantId,
      },
    });

    res.status(201).json({ success: true, data: store });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur';
    res.status(500).json({ success: false, message });
  }
};

export const update = async (req: Request, res: Response): Promise<void> => {
  try {
    const storeId = req.params.id as string;
    const { name, address, phone, isActive } = req.body;
    const store = await prisma.store.updateMany({
      where: { id: storeId, tenantId: req.user!.tenantId },
      data: {
        name: name as string | undefined,
        address: address as string | undefined,
        phone: phone as string | undefined,
        isActive: isActive as boolean | undefined,
      },
    });

    if (store.count === 0) {
      res.status(404).json({ success: false, message: 'Magasin non trouvé' });
      return;
    }

    res.json({ success: true, message: 'Magasin mis à jour' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur';
    res.status(500).json({ success: false, message });
  }
};

export const remove = async (req: Request, res: Response): Promise<void> => {
  try {
    const storeId = req.params.id as string;
    const store = await prisma.store.findFirst({
      where: { id: storeId, tenantId: req.user!.tenantId },
    });

    if (!store) {
      res.status(404).json({ success: false, message: 'Magasin non trouvé' });
      return;
    }

    if (store.isMain) {
      res.status(400).json({ success: false, message: 'Impossible de supprimer le magasin principal' });
      return;
    }

    await prisma.store.delete({ where: { id: storeId } });
    res.json({ success: true, message: 'Magasin supprimé' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur';
    res.status(500).json({ success: false, message });
  }
};
