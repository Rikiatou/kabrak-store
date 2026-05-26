import { Request, Response } from 'express';
import { prisma } from '../../config/prisma';

export const getTenantBySlug = async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug } = req.params;
    const tenant = await prisma.tenant.findUnique({
      where: { slug: slug as string },
      select: { id: true, name: true, logo: true, invoiceColor: true, phone: true, businessMode: true, businessCategories: true },
    });
    if (!tenant) { res.status(404).json({ success: false, message: 'Tenant not found' }); return; }
    res.json({ success: true, data: tenant });
  } catch (error) {
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
  }
};

export const getPublicProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug } = req.params;
    const { category, search, limit = '50' } = req.query;
    const tenant = await prisma.tenant.findUnique({ where: { slug: slug as string } });
    if (!tenant) { res.status(404).json({ success: false, message: 'Tenant not found' }); return; }
    const where: Record<string, unknown> = { tenantId: tenant.id, isActive: true };
    if (category) where.businessType = category;
    if (search) where.name = { contains: search, mode: 'insensitive' };
    const products = await prisma.product.findMany({
      where,
      take: parseInt(limit as string),
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, description: true, image: true, sellingPrice: true, totalStock: true, businessType: true, adaptiveFields: true },
    });
    res.json({ success: true, data: products });
  } catch (error) {
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
  }
};

export const getPublicOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.params;
    const order = await prisma.order.findFirst({
      where: { reference: token as string },
      include: {
        client: true,
        items: { include: { product: true } },
        tenant: { select: { id: true, name: true, logo: true, invoiceColor: true, phone: true } },
      },
    });
    if (!order) { res.status(404).json({ success: false, message: 'Order not found' }); return; }
    res.json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
  }
};
