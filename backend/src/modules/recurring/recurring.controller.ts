import { Request, Response } from 'express';
import { prisma } from '../../config/prisma';
import { CreateRecurringInput, UpdateRecurringInput } from './recurring.schema';

export const getAll = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = '1', limit = '20', isActive } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where: Record<string, unknown> = { tenantId: req.user!.tenantId };
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const [items, total] = await Promise.all([
      prisma.recurringBilling.findMany({
        where,
        include: {
          client: { select: { id: true, name: true, phone: true } },
          product: { select: { id: true, name: true } },
        },
        skip,
        take: parseInt(limit as string),
        orderBy: { nextBillingDate: 'asc' },
      }),
      prisma.recurringBilling.count({ where }),
    ]);

    res.json({
      success: true,
      data: items,
      pagination: {
        total,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        pages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch recurring billings';
    res.status(500).json({ success: false, message });
  }
};

export const create = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = req.body as CreateRecurringInput;

    const recurring = await prisma.recurringBilling.create({
      data: {
        amount: data.amount,
        frequency: data.frequency,
        nextBillingDate: new Date(data.nextBillingDate),
        clientId: data.clientId,
        productId: data.productId,
        tenantId: req.user!.tenantId,
      },
      include: {
        client: { select: { id: true, name: true } },
        product: { select: { id: true, name: true } },
      },
    });

    res.status(201).json({ success: true, data: recurring });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create recurring billing';
    res.status(500).json({ success: false, message });
  }
};

export const update = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = req.body as UpdateRecurringInput;

    const itemId = req.params.id as string;
    const existing = await prisma.recurringBilling.findFirst({
      where: { id: itemId, tenantId: req.user!.tenantId },
    });

    if (!existing) {
      res.status(404).json({ success: false, message: 'Facturation récurrente non trouvée' });
      return;
    }

    const updateData: Record<string, unknown> = {};
    if (data.amount !== undefined) updateData.amount = data.amount;
    if (data.frequency !== undefined) updateData.frequency = data.frequency;
    if (data.nextBillingDate !== undefined) updateData.nextBillingDate = new Date(data.nextBillingDate);
    if (data.clientId !== undefined) updateData.clientId = data.clientId;
    if (data.productId !== undefined) updateData.productId = data.productId;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const recurring = await prisma.recurringBilling.update({
      where: { id: itemId },
      data: updateData,
      include: {
        client: { select: { id: true, name: true } },
        product: { select: { id: true, name: true } },
      },
    });

    res.json({ success: true, data: recurring });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update recurring billing';
    res.status(500).json({ success: false, message });
  }
};

export const remove = async (req: Request, res: Response): Promise<void> => {
  try {
    const itemId = req.params.id as string;
    const existing = await prisma.recurringBilling.findFirst({
      where: { id: itemId, tenantId: req.user!.tenantId },
    });

    if (!existing) {
      res.status(404).json({ success: false, message: 'Facturation récurrente non trouvée' });
      return;
    }

    await prisma.recurringBilling.delete({ where: { id: itemId } });
    res.json({ success: true, message: 'Facturation récurrente supprimée' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete recurring billing';
    res.status(500).json({ success: false, message });
  }
};
