import { Request, Response } from 'express';
import { prisma } from '../../config/prisma';

export const getAll = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = '1', limit = '20', category, from, to } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const where: Record<string, unknown> = { tenantId: req.user!.tenantId };
    if (category) where.category = category;
    if (from || to) {
      where.date = {};
      if (from) (where.date as Record<string, unknown>).gte = new Date(from as string);
      if (to) (where.date as Record<string, unknown>).lte = new Date(to as string);
    }
    const [expenses, total] = await Promise.all([
      prisma.expense.findMany({
        where, skip, take: parseInt(limit as string),
        include: { supplier: true, createdBy: { select: { id: true, firstName: true, lastName: true } } },
        orderBy: { date: 'desc' },
      }),
      prisma.expense.count({ where }),
    ]);
    res.json({ success: true, data: expenses, pagination: { total, page: parseInt(page as string), limit: parseInt(limit as string), pages: Math.ceil(total / parseInt(limit as string)) } });
  } catch (error) {
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
  }
};

export const getSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const { from, to } = req.query;
    const tenantId = req.user!.tenantId;
    
    const dateFilter: Record<string, unknown> = {};
    if (from) {
      try {
        dateFilter.gte = new Date(from as string);
      } catch {
        // Invalid date, ignore
      }
    }
    if (to) {
      try {
        dateFilter.lte = new Date(to as string);
      } catch {
        // Invalid date, ignore
      }
    }

    const hasDateFilter = Object.keys(dateFilter).length > 0;

    const [expenseAgg, revenueAgg] = await Promise.all([
      prisma.expense.aggregate({
        where: { tenantId, ...(hasDateFilter ? { date: dateFilter } : {}) },
        _sum: { amount: true },
      }),
      prisma.order.aggregate({
        where: { tenantId, paymentStatus: { in: ['PAID', 'PARTIAL'] }, ...(hasDateFilter ? { createdAt: dateFilter } : {}) },
        _sum: { amountPaid: true },
      }),
    ]);

    const totalExpenses = expenseAgg._sum.amount || 0;
    const totalRevenue = revenueAgg._sum.amountPaid || 0;
    const profit = totalRevenue - totalExpenses;
    const margin = totalRevenue > 0 ? Math.round((profit / totalRevenue) * 100) : 0;

    let byCategory: any[] = [];
    try {
      byCategory = await prisma.expense.groupBy({
        by: ['category'],
        where: { tenantId, ...(hasDateFilter ? { date: dateFilter } : {}) },
        _sum: { amount: true },
      });
    } catch {
      // groupBy might fail if no data, return empty array
    }

    res.json({ success: true, data: { totalExpenses, totalRevenue, profit, margin, byCategory } });
  } catch (error) {
    console.error('Expenses summary error:', error);
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
  }
};

export const create = async (req: Request, res: Response): Promise<void> => {
  try {
    const { amount, category, description, date, reference, paymentMethod, supplierId } = req.body;
    const expense = await prisma.expense.create({
      data: {
        amount: parseFloat(amount),
        category: category || 'OTHER',
        description,
        date: date ? new Date(date) : new Date(),
        reference,
        paymentMethod: paymentMethod || 'CASH',
        supplierId: supplierId || undefined,
        tenantId: req.user!.tenantId,
        createdById: req.user!.id,
      },
      include: { supplier: true },
    });
    res.status(201).json({ success: true, data: expense });
  } catch (error) {
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
  }
};

export const update = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const existing = await prisma.expense.findFirst({ where: { id: id as string, tenantId: req.user!.tenantId as string } });
    if (!existing) { res.status(404).json({ success: false, message: 'Not found' }); return; }
    const { amount, category, description, date, reference, paymentMethod, supplierId } = req.body;
    const expense = await prisma.expense.update({
      where: { id: id as string },
      data: {
        ...(amount !== undefined && { amount: parseFloat(amount) }),
        ...(category && { category }),
        ...(description !== undefined && { description }),
        ...(date && { date: new Date(date) }),
        ...(reference !== undefined && { reference }),
        ...(paymentMethod && { paymentMethod }),
        supplierId: supplierId || null,
      },
      include: { supplier: true },
    });
    res.json({ success: true, data: expense });
  } catch (error) {
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
  }
};

export const remove = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const existing = await prisma.expense.findFirst({ where: { id: id as string, tenantId: req.user!.tenantId as string } });
    if (!existing) { res.status(404).json({ success: false, message: 'Not found' }); return; }
    await prisma.expense.delete({ where: { id: id as string } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
  }
};
