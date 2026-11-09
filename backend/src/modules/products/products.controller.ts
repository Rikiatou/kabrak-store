import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';
import { prisma } from '../../config/prisma';
import { CreateProductInput, UpdateProductInput } from './products.schema';
import { adjustSizes } from '../orders/orders.controller';

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
      data: products,
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

    res.json({ success: true, data: product });
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

// A barcode must point to a single product of the shop, otherwise scanning would add the wrong item.
const barcodeTakenBy = async (tenantId: string, barcode: string | null | undefined, excludeId?: string) => {
  if (!barcode) return null;
  return prisma.product.findFirst({
    where: { tenantId, isActive: true, barcode, ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { name: true },
  });
};

export const create = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = req.body as CreateProductInput;
    data.barcode = normalizeBarcode(data.barcode);
    const taken = await barcodeTakenBy(req.user!.tenantId, data.barcode);
    if (taken) {
      res.status(409).json({ success: false, message: `Ce code-barres est déjà utilisé par « ${taken.name} »` });
      return;
    }

    const product = await prisma.product.create({
      data: {
        ...data,
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
    const taken = await barcodeTakenBy(req.user!.tenantId, data.barcode, id);
    if (taken) {
      res.status(409).json({ success: false, message: `Ce code-barres est déjà utilisé par « ${taken.name} »` });
      return;
    }

    const product = await prisma.product.update({
      where: { id },
      data,
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
        OR: [{ barcode: code.trim() }, { sku: code.trim() }],
      },
      include: { category: true },
    });

    if (!product) {
      res.status(404).json({ success: false, message: 'Produit non trouvé avec ce code' });
      return;
    }

    res.json({ success: true, data: product });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur recherche code-barres';
    res.status(500).json({ success: false, message });
  }
};

export const getLowStock = async (req: Request, res: Response): Promise<void> => {
  try {
    const products = await prisma.$queryRaw<
      Array<{ id: string }>
    >`
      SELECT id FROM products
      WHERE "tenantId" = ${req.user!.tenantId}
        AND "isActive" = true
        AND "totalStock" <= "lowStockAlert"
      ORDER BY "totalStock" ASC
    `;

    const ids = products.map((p) => p.id);
    const fullProducts = ids.length > 0
      ? await prisma.product.findMany({
          where: { id: { in: ids } },
          include: { category: true },
          orderBy: { totalStock: 'asc' },
        })
      : [];

    res.json({ success: true, data: fullProducts });
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

    const product = await prisma.product.findFirst({ where: { id, tenantId } });
    if (!product) {
      res.status(404).json({ success: false, message: 'Produit introuvable' });
      return;
    }
    if (supplierId && !(await prisma.supplier.findFirst({ where: { id: supplierId, tenantId } }))) {
      res.status(404).json({ success: false, message: 'Fournisseur introuvable' });
      return;
    }

    let adaptiveFields: Record<string, unknown> | undefined;
    if (variant) {
      const adjusted = adjustSizes(product.adaptiveFields, variant, quantity);
      if (!adjusted) {
        res.status(400).json({ success: false, code: 'UNKNOWN_VARIANT', message: `Variante inconnue : ${variant}` });
        return;
      }
      adaptiveFields = adjusted.fields;
    }

    const updated = await prisma.$transaction(async (tx) => {
      const p = await tx.product.update({
        where: { id },
        data: {
          totalStock: { increment: quantity },
          ...(unitCost !== null ? { costPrice: unitCost } : {}),
          ...(adaptiveFields ? { adaptiveFields: adaptiveFields as Prisma.InputJsonValue } : {}),
        },
      });
      const cost = unitCost ?? product.costPrice ?? 0;
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

    res.json({ success: true, data: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to restock product';
    res.status(500).json({ success: false, message });
  }
};
