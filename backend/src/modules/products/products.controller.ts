import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';
import { prisma } from '../../config/prisma';
import { CreateProductInput, UpdateProductInput } from './products.schema';
import { StockError, STOCK_SELECT, lowStockLines, moveStock, notifyLowStock, readVariants, readTiers } from '../../utils/stock';
import { canSeeCosts, hideProductCost } from '../../utils/costs';

const PAYMENT_METHODS = ['CASH', 'MOBILE_MONEY', 'ORANGE_MONEY', 'MTN_MOMO', 'BANK_TRANSFER', 'OTHER'];

export const getAll = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = '1', limit = '20', search, categoryId, businessType } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where: Record<string, unknown> = { tenantId: req.user!.tenantId };
    if (req.query.includeInactive !== 'true') where.isActive = true;
    if (search) {
      const q = (search as string).trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { barcode: q },
        { sku: q },
      ];
    }
    if (categoryId) where.categoryId = categoryId as string;
    if (businessType) where.businessType = businessType as string;

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: { category: true },
        skip,
        take: parseInt(limit as string),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.product.count({ where }),
    ]);

    res.json({
      success: true,
      data: canSeeCosts(req.user!.role) ? products : products.map(hideProductCost),
      pagination: {
        total,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        pages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch products';
    res.status(500).json({ success: false, message });
  }
};

export const getOne = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const product = await prisma.product.findFirst({
      where: { id, tenantId: req.user!.tenantId },
      include: { category: true },
    });

    if (!product) {
      res.status(404).json({ success: false, message: 'Produit non trouvé' });
      return;
    }

    res.json({ success: true, data: canSeeCosts(req.user!.role) ? product : hideProductCost(product) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch product';
    res.status(500).json({ success: false, message });
  }
};

const normalizeBarcode = (value: unknown): string | null | undefined => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const code = String(value).trim();
  return code || null;
};

// A barcode must point to a single product (or variant) of the shop, otherwise scanning would add the wrong item.
const barcodeTakenBy = async (tenantId: string, barcode: string | null | undefined, excludeId?: string) => {
  if (!barcode) return null;
  return prisma.product.findFirst({
    where: {
      tenantId, isActive: true, ...(excludeId ? { id: { not: excludeId } } : {}),
      OR: [{ barcode }, { variants: { array_contains: [{ barcode }] } }],
    },
    select: { name: true },
  });
};

type VariantInput = { variants?: unknown; totalStock?: number; packSize?: number | null; packPrice?: number | null; priceTiers?: unknown };

/** Cleans variants (unique names, stock as integers) and keeps totalStock = sum of variant stock. Returns an error message or null. */
const prepareVariants = (data: VariantInput): string | null => {
  if (data.priceTiers !== undefined) {
    const tiers = readTiers(data.priceTiers);
    data.priceTiers = tiers.length ? tiers : Prisma.DbNull;
  }
  if (data.variants === undefined) return null;
  const variants = readVariants(data.variants);
  const names = new Set<string>();
  for (const v of variants) {
    const key = v.name.toLowerCase();
    if (names.has(key)) return `La variante « ${v.name} » existe deux fois`;
    names.add(key);
  }
  const codes = variants.map((v) => v.barcode).filter(Boolean);
  if (new Set(codes).size !== codes.length) return 'Deux variantes ont le même code-barres';
  data.variants = variants.length ? variants : Prisma.DbNull;
  if (variants.length) data.totalStock = variants.reduce((sum, v) => sum + v.stock, 0);
  if (!data.packSize) { data.packSize = null; data.packPrice = null; }
  return null;
};

const variantBarcodeTaken = async (tenantId: string, variants: unknown, excludeId?: string) => {
  for (const v of readVariants(variants)) {
    if (!v.barcode) continue;
    const taken = await barcodeTakenBy(tenantId, v.barcode, excludeId);
    if (taken) return { code: v.barcode, name: taken.name };
  }
  return null;
};

export const create = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = req.body as CreateProductInput;
    data.barcode = normalizeBarcode(data.barcode);
    const invalid = prepareVariants(data);
    if (invalid) { res.status(400).json({ success: false, code: 'INVALID_VARIANTS', message: invalid }); return; }
    const taken = await barcodeTakenBy(req.user!.tenantId, data.barcode) || await variantBarcodeTaken(req.user!.tenantId, data.variants);
    if (taken) {
      res.status(409).json({ success: false, message: `Ce code-barres est déjà utilisé par « ${taken.name} »` });
      return;
    }

    const product = await prisma.product.create({
      data: {
        ...data,
        variants: data.variants as Prisma.InputJsonValue | typeof Prisma.DbNull | undefined, priceTiers: data.priceTiers as Prisma.InputJsonValue | typeof Prisma.DbNull | undefined,
        tenantId: req.user!.tenantId,
      },
      include: { category: true },
    });

    res.status(201).json({ success: true, data: product });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create product';
    res.status(500).json({ success: false, message });
  }
};

export const update = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const data = req.body as UpdateProductInput;

    const existing = await prisma.product.findFirst({
      where: { id, tenantId: req.user!.tenantId },
    });

    if (!existing) {
      res.status(404).json({ success: false, message: 'Produit non trouvé' });
      return;
    }

    data.barcode = normalizeBarcode(data.barcode);
    const invalid = prepareVariants(data);
    if (invalid) { res.status(400).json({ success: false, code: 'INVALID_VARIANTS', message: invalid }); return; }
    const taken = await barcodeTakenBy(req.user!.tenantId, data.barcode, id) || await variantBarcodeTaken(req.user!.tenantId, data.variants, id);
    if (taken) {
      res.status(409).json({ success: false, message: `Ce code-barres est déjà utilisé par « ${taken.name} »` });
      return;
    }

    const product = await prisma.product.update({
      where: { id },
      data: { ...data, variants: data.variants as Prisma.InputJsonValue | typeof Prisma.DbNull | undefined, priceTiers: data.priceTiers as Prisma.InputJsonValue | typeof Prisma.DbNull | undefined },
      include: { category: true },
    });

    res.json({ success: true, data: product });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update product';
    res.status(500).json({ success: false, message });
  }
};

export const remove = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const existing = await prisma.product.findFirst({
      where: { id, tenantId: req.user!.tenantId },
    });

    if (!existing) {
      res.status(404).json({ success: false, message: 'Produit non trouvé' });
      return;
    }

    const soldCount = await prisma.orderItem.count({ where: { productId: id } });
    if (soldCount > 0) {
      await prisma.product.update({ where: { id }, data: { isActive: false } });
      res.json({ success: true, archived: true, message: 'Produit archivé (déjà vendu)' });
      return;
    }

    await prisma.product.delete({ where: { id } });
    res.json({ success: true, message: 'Produit supprimé' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete product';
    res.status(500).json({ success: false, message });
  }
};

export const findByBarcode = async (req: Request, res: Response): Promise<void> => {
  try {
    const code = req.params.code as string;
    const product = await prisma.product.findFirst({
      where: {
        tenantId: req.user!.tenantId,
        isActive: true,
        OR: [{ barcode: code.trim() }, { sku: code.trim() }, { variants: { array_contains: [{ barcode: code.trim() }] } }],
      },
      include: { category: true },
    });

    if (!product) {
      res.status(404).json({ success: false, message: 'Produit non trouvé avec ce code' });
      return;
    }

    const variant = readVariants(product.variants).find((v) => v.barcode === code.trim());
    res.json({ success: true, data: canSeeCosts(req.user!.role) ? product : hideProductCost(product), variant: variant?.name ?? null });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur recherche code-barres';
    res.status(500).json({ success: false, message });
  }
};

export const getLowStock = async (req: Request, res: Response): Promise<void> => {
  try {
    const products = await prisma.product.findMany({
      where: { tenantId: req.user!.tenantId, isActive: true, isService: false },
      include: { category: true },
      orderBy: { totalStock: 'asc' },
    });
    const low = products.filter((p) => lowStockLines(p).length > 0);
    res.json({ success: true, data: canSeeCosts(req.user!.role) ? low : low.map(hideProductCost) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch low stock products';
    res.status(500).json({ success: false, message });
  }
};

export const restock = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const tenantId = req.user!.tenantId;
    const quantity = Math.floor(Number(req.body.quantity));
    const unitCost = req.body.unitCost === undefined || req.body.unitCost === '' ? null : Number(req.body.unitCost);
    const variant = typeof req.body.variant === 'string' && req.body.variant.trim() ? req.body.variant.trim() : null;
    const supplierId = typeof req.body.supplierId === 'string' && req.body.supplierId ? req.body.supplierId : null;
    const recordExpense = req.body.recordExpense !== false;
    const paymentMethod = PAYMENT_METHODS.includes(req.body.paymentMethod) ? req.body.paymentMethod : 'CASH';

    if (!Number.isFinite(quantity) || quantity <= 0) {
      res.status(400).json({ success: false, code: 'INVALID_QUANTITY', message: 'Quantité invalide' });
      return;
    }
    if (unitCost !== null && (!Number.isFinite(unitCost) || unitCost < 0)) {
      res.status(400).json({ success: false, code: 'INVALID_COST', message: "Prix d'achat invalide" });
      return;
    }

    const product = await prisma.product.findFirst({ where: { id, tenantId }, select: STOCK_SELECT });
    if (!product) {
      res.status(404).json({ success: false, message: 'Produit introuvable' });
      return;
    }
    if (supplierId && !(await prisma.supplier.findFirst({ where: { id: supplierId, tenantId } }))) {
      res.status(404).json({ success: false, message: 'Fournisseur introuvable' });
      return;
    }

    const variants = readVariants(product.variants);
    const v = variants.find((x) => x.name.toLowerCase() === (variant || '').toLowerCase());
    if (variants.length > 0 && !v) {
      res.status(400).json({ success: false, code: 'UNKNOWN_VARIANT', message: variant ? `Variante inconnue : ${variant}` : 'Choisissez la variante' });
      return;
    }

    const updated = await prisma.$transaction(async (tx) => {
      // With variants, the purchase price is the variant's own; otherwise the product's.
      await moveStock(tx, product, variant, quantity, true, v && unitCost !== null ? { costPrice: unitCost } : undefined);
      const p = unitCost !== null && !v
        ? await tx.product.update({ where: { id }, data: { costPrice: unitCost } })
        : await tx.product.findUniqueOrThrow({ where: { id } });
      const cost = unitCost ?? v?.costPrice ?? product.costPrice ?? 0;
      if (recordExpense && cost > 0) {
        await tx.expense.create({
          data: {
            amount: cost * quantity,
            category: 'STOCK',
            description: `${product.name}${variant ? ` · ${variant}` : ''} × ${quantity}`,
            paymentMethod,
            supplierId,
            tenantId,
            createdById: req.user!.id,
          },
        });
      }
      return p;
    });

    await notifyLowStock(tenantId, [id]).catch((e) => console.error('low stock alert', e));
    res.json({ success: true, data: updated });
  } catch (error) {
    if (error instanceof StockError) {
      res.status(400).json({ success: false, code: 'UNKNOWN_VARIANT', message: error.message });
      return;
    }
    const message = error instanceof Error ? error.message : 'Failed to restock product';
    res.status(500).json({ success: false, message });
  }
};
