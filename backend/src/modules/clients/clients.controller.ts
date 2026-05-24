import { Request, Response } from 'express';
import { prisma } from '../../config/prisma';

export const getAll = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = '1', limit = '20', search } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where: Record<string, unknown> = { tenantId: req.user!.tenantId };
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { phone: { contains: search as string } },
        { email: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const [clients, total] = await Promise.all([
      prisma.client.findMany({ where, skip, take: parseInt(limit as string), orderBy: { createdAt: 'desc' } }),
      prisma.client.count({ where }),
    ]);

    res.json({
      success: true,
      data: clients,
      pagination: { total, page: parseInt(page as string), limit: parseInt(limit as string), pages: Math.ceil(total / parseInt(limit as string)) },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch clients';
    res.status(500).json({ success: false, message });
  }
};

export const getOne = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const client = await prisma.client.findFirst({
      where: { id, tenantId: req.user!.tenantId },
      include: {
        orders: { orderBy: { createdAt: 'desc' }, take: 10, include: { items: { include: { product: true } } } },
      },
    });

    if (!client) {
      res.status(404).json({ success: false, message: 'Client non trouvé' });
      return;
    }

    res.json({ success: true, data: client });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch client';
    res.status(500).json({ success: false, message });
  }
};

export const create = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, phone, email, address } = req.body;

    const client = await prisma.client.create({
      data: { name, phone, email, address, tenantId: req.user!.tenantId },
    });

    res.status(201).json({ success: true, data: client });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create client';
    res.status(500).json({ success: false, message });
  }
};

export const update = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { name, phone, email, address } = req.body;

    const existing = await prisma.client.findFirst({
      where: { id, tenantId: req.user!.tenantId },
    });

    if (!existing) {
      res.status(404).json({ success: false, message: 'Client non trouvé' });
      return;
    }

    const client = await prisma.client.update({
      where: { id },
      data: { name, phone, email, address },
    });

    res.json({ success: true, data: client });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update client';
    res.status(500).json({ success: false, message });
  }
};

export const remove = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const existing = await prisma.client.findFirst({
      where: { id, tenantId: req.user!.tenantId },
    });

    if (!existing) {
      res.status(404).json({ success: false, message: 'Client non trouvé' });
      return;
    }

    await prisma.client.delete({ where: { id } });
    res.json({ success: true, message: 'Client supprimé' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete client';
    res.status(500).json({ success: false, message });
  }
};
