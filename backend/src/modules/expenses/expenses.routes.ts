import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';

export const EXPENSE_CATEGORIES = ['RENT', 'SALARY', 'TRANSPORT', 'UTILITIES', 'STOCK', 'MARKETING', 'OTHER'] as const;

const expenseSchema = z.object({
  label: z.string().trim().min(1),
  category: z.enum(EXPENSE_CATEGORIES).default('OTHER'),
  amount: z.number().positive(),
  date: z.string().optional(),
  notes: z.string().optional().nullable(),
});

const fail = (res: Response, error: unknown) =>
  res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Error' });

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const { from, to } = req.query;
    const expenses = await prisma.expense.findMany({
      where: {
        tenantId: req.user!.tenantId,
        ...(from || to ? { date: { ...(from ? { gte: new Date(from as string) } : {}), ...(to ? { lte: new Date(to as string) } : {}) } } : {}),
      },
      orderBy: { date: 'desc' },
    });
    res.json({ success: true, data: expenses });
  } catch (error) { fail(res, error); }
});

router.post('/', authorize('OWNER', 'MANAGER'), validate(expenseSchema), async (req: Request, res: Response) => {
  try {
    const { date, ...rest } = req.body as z.infer<typeof expenseSchema>;
    const expense = await prisma.expense.create({
      data: { ...rest, ...(date ? { date: new Date(date) } : {}), tenantId: req.user!.tenantId },
    });
    res.status(201).json({ success: true, data: expense });
  } catch (error) { fail(res, error); }
});

router.put('/:id', authorize('OWNER', 'MANAGER'), validate(expenseSchema), async (req: Request, res: Response) => {
  try {
    const { date, ...rest } = req.body as z.infer<typeof expenseSchema>;
    const { count } = await prisma.expense.updateMany({
      where: { id: req.params.id as string, tenantId: req.user!.tenantId },
      data: { ...rest, ...(date ? { date: new Date(date) } : {}) },
    });
    if (!count) { res.status(404).json({ success: false, message: 'Not found' }); return; }
    res.json({ success: true });
  } catch (error) { fail(res, error); }
});

router.delete('/:id', authorize('OWNER', 'MANAGER'), async (req: Request, res: Response) => {
  try {
    const { count } = await prisma.expense.deleteMany({ where: { id: req.params.id as string, tenantId: req.user!.tenantId } });
    if (!count) { res.status(404).json({ success: false, message: 'Not found' }); return; }
    res.json({ success: true });
  } catch (error) { fail(res, error); }
});

export default router;
