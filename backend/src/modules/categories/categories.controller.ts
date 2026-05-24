import { Request, Response } from 'express';
import { prisma } from '../../config/prisma';

export const getAll = async (req: Request, res: Response): Promise<void> => {
  try {
    const categories = await prisma.category.findMany({
      where: { tenantId: req.user!.tenantId },
      include: { _count: { select: { products: true } } },
      orderBy: { name: 'asc' },
    });

    res.json({ success: true, data: categories });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch categories';
    res.status(500).json({ success: false, message });
  }
};

export const create = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, icon } = req.body;

    const category = await prisma.category.create({
      data: { name, icon, tenantId: req.user!.tenantId },
    });

    res.status(201).json({ success: true, data: category });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create category';
    res.status(500).json({ success: false, message });
  }
};

export const update = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { name, icon } = req.body;

    const existing = await prisma.category.findFirst({
      where: { id, tenantId: req.user!.tenantId },
    });

    if (!existing) {
      res.status(404).json({ success: false, message: 'Catégorie non trouvée' });
      return;
    }

    const category = await prisma.category.update({
      where: { id },
      data: { name, icon },
    });

    res.json({ success: true, data: category });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update category';
    res.status(500).json({ success: false, message });
  }
};

export const remove = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const existing = await prisma.category.findFirst({
      where: { id, tenantId: req.user!.tenantId },
    });

    if (!existing) {
      res.status(404).json({ success: false, message: 'Catégorie non trouvée' });
      return;
    }

    await prisma.category.delete({ where: { id } });
    res.json({ success: true, message: 'Catégorie supprimée' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete category';
    res.status(500).json({ success: false, message });
  }
};
