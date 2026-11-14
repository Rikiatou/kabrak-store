import { Request, Response } from 'express';
import { PaymentMethod, Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { logActivity } from '../../utils/activity';
import { STOCK_SELECT, StockError, findVariant, moveStock, notifyLowStock, readVariants } from '../../utils/stock';

const PAYMENT_METHODS: PaymentMethod[] = ['CASH', 'MOBILE_MONEY', 'ORANGE_MONEY', 'MTN_MOMO', 'BANK_TRANSFER', 'OTHER'];

interface PurchaseItem { productId: string; name: string; variant: string | null; quantity: number; unitCost: number }

const fail = (res: Response, error: unknown): void => {
  if (error instanceof StockError) { res.status(400).json({ success: false, message: error.message }); return; }
  res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
};
const methodOf = (m: unknown): PaymentMethod => (PAYMENT_METHODS.includes(m as PaymentMethod) ? (m as PaymentMethod) : 'CASH');
const label = (p: { number: number }) => `Achat N°${p.number}`;

export const getAll = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.user!.tenantId;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 30));
    const where: Prisma.PurchaseWhereInput = { tenantId };
    if (typeof req.query.supplierId === 'string' && req.query.supplierId) where.supplierId = req.query.supplierId;
    if (req.query.unpaid === '1') where.status = 'RECEIVED';
    const month = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const [rows, total, monthSum, open] = await Promise.all([
      prisma.purchase.findMany({
        where, orderBy: { date: 'desc' }, skip: (page - 1) * limit, take: limit,
        include: { supplier: { select: { id: true, name: true, phone: true } }, createdBy: { select: { firstName: true, lastName: true } } },
      }),
      prisma.purchase.count({ where }),
      prisma.purchase.aggregate({ where: { tenantId, status: 'RECEIVED', date: { gte: month } }, _sum: { total: true }, _count: true }),
      prisma.purchase.findMany({ where: { tenantId, status: 'RECEIVED' }, select: { total: true, amountPaid: true } }),
    ]);
    const data = req.query.unpaid === '1' ? rows.filter((p) => p.total - p.amountPaid > 0.5) : rows;
    res.json({
      success: true,
      data,
      summary: {
        monthTotal: monthSum._sum.total || 0,
        monthCount: monthSum._count,
        owed: open.reduce((s, p) => s + Math.max(0, p.total - p.amountPaid), 0),
      },
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    fail(res, error);
  }
};

export const create = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.user!.tenantId;
    const raw: unknown[] = Array.isArray(req.body.items) ? req.body.items : [];
    const supplierId = typeof req.body.supplierId === 'string' && req.body.supplierId ? req.body.supplierId : null;
    const date = req.body.date ? new Date(req.body.date) : new Date();
    const note = typeof req.body.note === 'string' && req.body.note.trim() ? req.body.note.trim().slice(0, 500) : null;
    const paymentMethod = methodOf(req.body.paymentMethod);

    if (!raw.length || raw.length > 200) { res.status(400).json({ success: false, message: 'Ajoutez au moins un article' }); return; }
    if (Number.isNaN(date.getTime())) { res.status(400).json({ success: false, message: 'Date invalide' }); return; }
    if (supplierId && !(await prisma.supplier.findFirst({ where: { id: supplierId, tenantId } }))) {
      res.status(404).json({ success: false, message: 'Fournisseur introuvable' });
      return;
    }

    const lines = raw.map((r) => {
      const x = (r ?? {}) as Record<string, unknown>;
      return {
        productId: String(x.productId ?? ''),
        variant: typeof x.variant === 'string' && x.variant.trim() ? x.variant.trim() : null,
        quantity: Math.floor(Number(x.quantity)),
        unitCost: Number(x.unitCost),
        sellingPrice: x.sellingPrice === undefined || x.sellingPrice === null || x.sellingPrice === '' ? null : Number(x.sellingPrice),
      };
    });
    const bad = lines.find((l) => !l.productId || !Number.isFinite(l.quantity) || l.quantity <= 0 || !Number.isFinite(l.unitCost) || l.unitCost < 0
      || (l.sellingPrice !== null && (!Number.isFinite(l.sellingPrice) || l.sellingPrice < 0)));
    if (bad) { res.status(400).json({ success: false, message: 'Quantité ou prix invalide sur une ligne' }); return; }

    const products = await prisma.product.findMany({ where: { tenantId, id: { in: [...new Set(lines.map((l) => l.productId))] } }, select: STOCK_SELECT });
    const byId = new Map(products.map((p) => [p.id, p]));
    const missing = lines.find((l) => !byId.has(l.productId));
    if (missing) { res.status(404).json({ success: false, message: 'Produit introuvable' }); return; }

    const items: PurchaseItem[] = [];
    const total = Math.round(lines.reduce((s, l) => s + l.quantity * l.unitCost, 0));
    const amountPaid = Math.min(total, Math.max(0, Number(req.body.amountPaid) || 0));

    const purchase = await prisma.$transaction(async (tx) => {
      for (const l of lines) {
        // Re-read inside the transaction: the same product can appear on several lines
        const product = await tx.product.findUniqueOrThrow({ where: { id: l.productId }, select: STOCK_SELECT });
        const variants = readVariants(product.variants);
        if (variants.length && !findVariant(variants, l.variant)) {
          throw new StockError(l.variant ? `Variante inconnue : ${product.name} · ${l.variant}` : `Choisissez la variante de "${product.name}"`);
        }
        const patch = variants.length ? { costPrice: l.unitCost, ...(l.sellingPrice !== null ? { sellingPrice: l.sellingPrice } : {}) } : undefined;
        await moveStock(tx, product, l.variant, l.quantity, true, patch);
        if (!variants.length) {
          await tx.product.update({
            where: { id: product.id },
            data: { costPrice: l.unitCost, ...(l.sellingPrice !== null ? { sellingPrice: l.sellingPrice } : {}) },
          });
        }
        items.push({ productId: product.id, name: product.name, variant: l.variant, quantity: l.quantity, unitCost: l.unitCost });
      }
      const number = (await tx.purchase.count({ where: { tenantId } })) + 1;
      const p = await tx.purchase.create({
        data: { number, supplierId, date, items: items as unknown as Prisma.InputJsonValue, total, amountPaid, note, tenantId, createdById: req.user!.id },
        include: { supplier: { select: { id: true, name: true, phone: true } } },
      });
      if (amountPaid > 0) {
        await tx.expense.create({
          data: {
            amount: amountPaid, category: 'STOCK', date, paymentMethod, supplierId, purchaseId: p.id, tenantId, createdById: req.user!.id,
            reference: label(p), description: `${label(p)}${p.supplier ? ` · ${p.supplier.name}` : ''}`,
          },
        });
      }
      return p;
    });

    await notifyLowStock(tenantId, products.map((p) => p.id)).catch((e) => console.error('low stock alert', e));
    logActivity(req, 'PURCHASE_CREATE', `${label(purchase)}${purchase.supplier ? ` (${purchase.supplier.name})` : ''} : ${items.length} article(s), +${items.reduce((s, i) => s + i.quantity, 0)} en stock, ${total} F`, { type: 'purchase', id: purchase.id });
    res.status(201).json({ success: true, data: purchase });
  } catch (error) {
    fail(res, error);
  }
};

export const pay = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.user!.tenantId;
    const p = await prisma.purchase.findFirst({ where: { id: req.params.id as string, tenantId }, include: { supplier: { select: { name: true } } } });
    if (!p || p.status !== 'RECEIVED') { res.status(404).json({ success: false, message: 'Achat introuvable' }); return; }
    const due = p.total - p.amountPaid;
    const amount = Math.min(due, Number(req.body.amount) || 0);
    if (amount <= 0) { res.status(400).json({ success: false, message: 'Montant invalide' }); return; }
    const updated = await prisma.$transaction(async (tx) => {
      await tx.expense.create({
        data: {
          amount, category: 'STOCK', paymentMethod: methodOf(req.body.paymentMethod), supplierId: p.supplierId, purchaseId: p.id, tenantId, createdById: req.user!.id,
          reference: label(p), description: `Paiement ${label(p)}${p.supplier ? ` · ${p.supplier.name}` : ''}`,
        },
      });
      return tx.purchase.update({ where: { id: p.id }, data: { amountPaid: { increment: amount } } });
    });
    logActivity(req, 'PURCHASE_PAY', `${label(p)}${p.supplier ? ` (${p.supplier.name})` : ''} : ${amount} F payés`, { type: 'purchase', id: p.id });
    res.json({ success: true, data: updated });
  } catch (error) {
    fail(res, error);
  }
};

/** Undo a wrong arrival: takes the quantities back out of stock and removes its payments from expenses. */
export const cancel = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.user!.tenantId;
    const p = await prisma.purchase.findFirst({ where: { id: req.params.id as string, tenantId } });
    if (!p || p.status !== 'RECEIVED') { res.status(404).json({ success: false, message: 'Achat introuvable' }); return; }
    const items = (Array.isArray(p.items) ? p.items : []) as unknown as PurchaseItem[];
    await prisma.$transaction(async (tx) => {
      for (const it of items) {
        const product = await tx.product.findFirst({ where: { id: it.productId, tenantId }, select: STOCK_SELECT });
        if (product) await moveStock(tx, product, it.variant, -it.quantity, true);
      }
      await tx.expense.deleteMany({ where: { purchaseId: p.id, tenantId } });
      await tx.purchase.update({ where: { id: p.id }, data: { status: 'CANCELLED' } });
    });
    logActivity(req, 'PURCHASE_CANCEL', `${label(p)} annulé : stock retiré, ${p.amountPaid} F retirés des dépenses`, { type: 'purchase', id: p.id });
    res.json({ success: true });
  } catch (error) {
    if (error instanceof StockError) {
      res.status(400).json({ success: false, message: `Impossible d'annuler : une partie de cet arrivage est déjà vendue. ${error.message}` });
      return;
    }
    fail(res, error);
  }
};
