import { Request, Response } from 'express';
import { prisma } from '../../config/prisma';

export const getAll = async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, page = '1', limit = '20' } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const where: Record<string, unknown> = { tenantId: req.user!.tenantId };
    if (search) where.name = { contains: search, mode: 'insensitive' };
    const [suppliers, total] = await Promise.all([
      prisma.supplier.findMany({ where, skip, take: parseInt(limit as string), orderBy: { name: 'asc' } }),
      prisma.supplier.count({ where }),
    ]);
    res.json({ success: true, data: suppliers, pagination: { total, page: parseInt(page as string), limit: parseInt(limit as string), pages: Math.ceil(total / parseInt(limit as string)) } });
  } catch (error) {
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
  }
};

export const create = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, phone, email, address, notes } = req.body;
    if (!name) { res.status(400).json({ success: false, message: 'Nom requis' }); return; }
    const supplier = await prisma.supplier.create({
      data: { name, phone, email, address, notes, tenantId: req.user!.tenantId },
    });
    res.status(201).json({ success: true, data: supplier });
  } catch (error) {
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
  }
};

export const update = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const existing = await prisma.supplier.findFirst({ where: { id: id as string, tenantId: req.user!.tenantId as string } });
    if (!existing) { res.status(404).json({ success: false, message: 'Not found' }); return; }
    const supplier = await prisma.supplier.update({ where: { id: id as string }, data: req.body });
    res.json({ success: true, data: supplier });
  } catch (error) {
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
  }
};

export const remove = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const existing = await prisma.supplier.findFirst({ where: { id: id as string, tenantId: req.user!.tenantId as string } });
    if (!existing) { res.status(404).json({ success: false, message: 'Not found' }); return; }
    await prisma.supplier.delete({ where: { id: id as string } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
  }
};
