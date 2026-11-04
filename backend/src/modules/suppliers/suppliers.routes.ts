import { Router, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';

type Variant = { name: string; stock: number };

const supplierSchema = z.object({
  name: z.string().trim().min(1),
  phone: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const purchaseSchema = z.object({
  supplierId: z.string().uuid().optional().nullable(),
  date: z.string().optional(),
  amountPaid: z.number().min(0).optional(),
  notes: z.string().optional().nullable(),
  items: z.array(z.object({
    productId: z.string().uuid(),
    variant: z.string().optional().nullable(),
    quantity: z.number().int().min(1),
    unitCost: z.number().min(0),
  })).min(1),
});

class NotFound extends Error {}

const fail = (res: Response, error: unknown) =>
  error instanceof NotFound
    ? res.status(404).json({ success: false, message: 'Not found' })
    : res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Error' });

/** Adds (or removes, with a negative quantity) purchased units to a product and its variant. */
async function moveStock(tx: Prisma.TransactionClient, tenantId: string, productId: string, variant: string | null | undefined, quantity: number, unitCost?: number) {
  const product = await tx.product.findFirst({ where: { id: productId, tenantId } });
  if (!product) throw new NotFound();
  let variants = Array.isArray(product.variants) ? (product.variants as unknown as Variant[]) : null;
  if (variant) {
    const list = variants ?? [];
    variants = list.some((v) => v.name === variant)
      ? list.map((v) => (v.name === variant ? { ...v, stock: Math.max(0, v.stock + quantity) } : v))
      : quantity > 0 ? [...list, { name: variant, stock: quantity }] : list;
  }
  await tx.product.update({
    where: { id: productId },
    data: {
      totalStock: variants && variants.length ? variants.reduce((sum, v) => sum + v.stock, 0) : Math.max(0, product.totalStock + quantity),
      ...(variant ? { variants: variants as unknown as Prisma.InputJsonValue } : {}),
      ...(unitCost !== undefined ? { costPrice: unitCost } : {}),
    },
  });
}

const router = Router();
const managers = authorize('OWNER', 'MANAGER');

router.get('/', async (req: Request, res: Response) => {
  try {
    const suppliers = await prisma.supplier.findMany({
      where: { tenantId: req.user!.tenantId },
      include: { _count: { select: { purchases: true } } },
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: suppliers });
  } catch (error) { fail(res, error); }
});

router.post('/', managers, validate(supplierSchema), async (req: Request, res: Response) => {
  try {
    const supplier = await prisma.supplier.create({ data: { ...req.body, tenantId: req.user!.tenantId } });
    res.status(201).json({ success: true, data: supplier });
  } catch (error) { fail(res, error); }
});

router.get('/purchases', async (req: Request, res: Response) => {
  try {
    const purchases = await prisma.purchase.findMany({
      where: { tenantId: req.user!.tenantId },
      include: { supplier: { select: { id: true, name: true } }, items: { include: { product: { select: { id: true, name: true } } } } },
      orderBy: { date: 'desc' },
      take: 200,
    });
    res.json({ success: true, data: purchases });
  } catch (error) { fail(res, error); }
});

router.post('/purchases', managers, validate(purchaseSchema), async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const data = req.body as z.infer<typeof purchaseSchema>;
    const totalCost = data.items.reduce((sum, i) => sum + i.unitCost * i.quantity, 0);
    const purchase = await prisma.$transaction(async (tx) => {
      if (data.supplierId && !(await tx.supplier.findFirst({ where: { id: data.supplierId, tenantId } }))) throw new NotFound();
      for (const item of data.items) await moveStock(tx, tenantId, item.productId, item.variant, item.quantity, item.unitCost);
      return tx.purchase.create({
        data: {
          tenantId,
          supplierId: data.supplierId || undefined,
          totalCost,
          amountPaid: Math.min(data.amountPaid ?? totalCost, totalCost),
          notes: data.notes,
          ...(data.date ? { date: new Date(data.date) } : {}),
          items: { create: data.items.map((i) => ({ productId: i.productId, variant: i.variant || null, quantity: i.quantity, unitCost: i.unitCost })) },
        },
      });
    });
    res.status(201).json({ success: true, data: purchase });
  } catch (error) { fail(res, error); }
});

router.delete('/purchases/:id', managers, async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    await prisma.$transaction(async (tx) => {
      const purchase = await tx.purchase.findFirst({ where: { id: req.params.id as string, tenantId }, include: { items: true } });
      if (!purchase) throw new NotFound();
      for (const item of purchase.items) await moveStock(tx, tenantId, item.productId, item.variant, -item.quantity);
      await tx.purchase.delete({ where: { id: purchase.id } });
    });
    res.json({ success: true });
  } catch (error) { fail(res, error); }
});

router.put('/:id', managers, validate(supplierSchema), async (req: Request, res: Response) => {
  try {
    const { count } = await prisma.supplier.updateMany({ where: { id: req.params.id as string, tenantId: req.user!.tenantId }, data: req.body });
    if (!count) throw new NotFound();
    res.json({ success: true });
  } catch (error) { fail(res, error); }
});

router.delete('/:id', managers, async (req: Request, res: Response) => {
  try {
    const { count } = await prisma.supplier.deleteMany({ where: { id: req.params.id as string, tenantId: req.user!.tenantId } });
    if (!count) throw new NotFound();
    res.json({ success: true });
  } catch (error) { fail(res, error); }
});

export default router;
