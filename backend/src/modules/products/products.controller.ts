import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { CreateProductInput, UpdateProductInput } from './products.schema';

export const getAll = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = '1', limit = '20', search, categoryId, businessType } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where: Record<string, unknown> = { tenantId: req.user!.tenantId, isActive: true };
    if (search) where.name = { contains: search as string, mode: 'insensitive' };
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

// When a product has variants, its total stock is the sum of the variant stocks.
function variantData(variants: { name: string; stock: number }[] | null | undefined) {
  if (!variants || variants.length === 0) return { variants: Prisma.JsonNull };
  return { variants, totalStock: variants.reduce((sum, v) => sum + v.stock, 0) };
}

export const create = async (req: Request, res: Response): Promise<void> => {
  try {
    const { variants, ...data } = req.body as CreateProductInput;

    const product = await prisma.product.create({
      data: {
        ...data,
        ...variantData(variants),
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
    const { variants, ...data } = req.body as UpdateProductInput;

    const existing = await prisma.product.findFirst({
      where: { id, tenantId: req.user!.tenantId },
    });

    if (!existing) {
      res.status(404).json({ success: false, message: 'Produit non trouvé' });
      return;
    }

    const product = await prisma.product.update({
      where: { id },
      data: { ...data, ...(variants !== undefined ? variantData(variants) : {}) },
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

    // Products that were already sold are archived so past orders, invoices and reports stay intact.
    const sold = await prisma.orderItem.count({ where: { productId: id } });
    if (sold > 0) {
      await prisma.product.update({ where: { id }, data: { isActive: false } });
    } else {
      await prisma.product.delete({ where: { id } });
    }
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
        OR: [{ barcode: code }, { sku: code }],
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
