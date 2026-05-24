import { Request, Response } from 'express';
import { prisma } from '../../config/prisma';
import { CreateProductInput, UpdateProductInput } from './products.schema';

export const getAll = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = '1', limit = '20', search, categoryId, businessType } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where: Record<string, unknown> = { tenantId: req.user!.tenantId };
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

export const create = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = req.body as CreateProductInput;

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

    await prisma.product.delete({ where: { id } });
    res.json({ success: true, message: 'Produit supprimé' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete product';
    res.status(500).json({ success: false, message });
  }
};

export const getLowStock = async (req: Request, res: Response): Promise<void> => {
  try {
    const products = await prisma.product.findMany({
      where: {
        tenantId: req.user!.tenantId,
        totalStock: { lte: prisma.product.fields.lowStockAlert as unknown as number },
      },
      include: { category: true },
      orderBy: { totalStock: 'asc' },
    });

    res.json({ success: true, data: products });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch low stock products';
    res.status(500).json({ success: false, message });
  }
};
