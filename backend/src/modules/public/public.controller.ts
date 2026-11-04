import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { adjustSizes, generatePublicToken, generateReference } from '../orders/orders.controller';

/** Storefront is a BUSINESS feature; every plan gets it during the free trial. */
async function isStorefrontOpen(tenantId: string): Promise<boolean> {
  const sub = await prisma.subscription.findUnique({ where: { tenantId } });
  if (!sub) return false;
  const now = new Date();
  if (sub.status === 'TRIAL') return Boolean(sub.trialEndsAt && sub.trialEndsAt > now);
  return sub.plan === 'BUSINESS' && sub.status === 'ACTIVE' && sub.endDate > now;
}

const storefrontOrderSchema = z.object({
  customerName: z.string().trim().min(2).max(80),
  customerPhone: z.string().trim().min(6).max(25),
  note: z.string().trim().max(500).optional(),
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().min(1).max(100),
    variant: z.string().trim().max(40).optional(),
    option: z.string().trim().max(60).optional(),
  })).min(1).max(30),
});

class StorefrontError extends Error {
  constructor(public code: string, message: string) { super(message); }
}

export const getTenantBySlug = async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug } = req.params;
    const tenant = await prisma.tenant.findUnique({
      where: { slug: slug as string },
      select: { id: true, name: true, logo: true, invoiceColor: true, phone: true, email: true, businessMode: true, businessCategories: true },
    });
    if (!tenant) { res.status(404).json({ success: false, message: 'Tenant not found' }); return; }
    res.json({ success: true, data: { ...tenant, storefrontOpen: await isStorefrontOpen(tenant.id) } });
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
    if (!(await isStorefrontOpen(tenant.id))) {
      res.status(403).json({ success: false, code: 'STOREFRONT_LOCKED', message: 'Boutique en ligne indisponible' });
      return;
    }
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
    // Prefer secure publicToken; fall back to reference for legacy orders
    const order = await prisma.order.findFirst({
      where: {
        OR: [
          { publicToken: token as string },
          { reference: token as string },
        ],
      },
      include: {
        client: { select: { id: true, name: true, phone: true } },
        items: { include: { product: { select: { id: true, name: true, image: true, description: true } } } },
        tenant: { select: { id: true, name: true, logo: true, invoiceColor: true, phone: true } },
      },
    });
    if (!order) { res.status(404).json({ success: false, message: 'Order not found' }); return; }
    res.json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
  }
};

export const createStorefrontOrder = async (req: Request, res: Response): Promise<void> => {
  const parsed = storefrontOrderSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, code: 'INVALID_ORDER', message: 'Nom, téléphone et articles sont obligatoires' });
    return;
  }
  const data = parsed.data;
  try {
    const tenant = await prisma.tenant.findUnique({ where: { slug: req.params.slug as string }, select: { id: true } });
    if (!tenant) { res.status(404).json({ success: false, message: 'Tenant not found' }); return; }
    if (!(await isStorefrontOpen(tenant.id))) {
      res.status(403).json({ success: false, code: 'STOREFRONT_LOCKED', message: 'Boutique en ligne indisponible' });
      return;
    }
    const owner = await prisma.user.findFirst({ where: { tenantId: tenant.id, role: 'OWNER' }, orderBy: { createdAt: 'asc' }, select: { id: true } });
    if (!owner) { res.status(500).json({ success: false, message: 'Shop owner not found' }); return; }

    const order = await prisma.$transaction(async (tx) => {
      const products = await tx.product.findMany({
        where: { id: { in: data.items.map((i) => i.productId) }, tenantId: tenant.id, isActive: true },
        select: { id: true, name: true, sellingPrice: true, costPrice: true, totalStock: true, isService: true, adaptiveFields: true },
      });
      const byId = new Map(products.map((p) => [p.id, p]));

      const lines = data.items.map((item) => {
        const p = byId.get(item.productId);
        if (!p) throw new StorefrontError('PRODUCT_UNAVAILABLE', 'Un produit n’est plus disponible');
        return { item, p };
      });

      for (const { item, p } of lines) {
        if (p.isService) continue;
        const fresh = await tx.product.findUnique({ where: { id: p.id }, select: { totalStock: true, adaptiveFields: true } });
        if (!fresh || fresh.totalStock < item.quantity) {
          throw new StorefrontError('INSUFFICIENT_STOCK', `Stock insuffisant pour "${p.name}"`);
        }
        const sized = item.variant ? adjustSizes(fresh.adaptiveFields, item.variant, -item.quantity) : null;
        if (item.variant && (!sized || sized.remaining < 0)) {
          throw new StorefrontError('INSUFFICIENT_STOCK', `Stock insuffisant pour "${p.name} · ${item.variant}"`);
        }
        await tx.product.update({
          where: { id: p.id },
          data: {
            totalStock: { decrement: item.quantity },
            ...(sized ? { adaptiveFields: sized.fields as Prisma.InputJsonValue } : {}),
          },
        });
      }

      const phoneKey = (v: string) => v.replace(/[^\d]/g, '').slice(-9);
      const phoneDigits = phoneKey(data.customerPhone);
      const candidates = await tx.client.findMany({ where: { tenantId: tenant.id, phone: { not: null } }, select: { id: true, phone: true } });
      const existing = candidates.find((c) => phoneKey(c.phone || '') === phoneDigits);
      const clientId = existing?.id ?? (await tx.client.create({
        data: { name: data.customerName, phone: data.customerPhone, tenantId: tenant.id },
        select: { id: true },
      })).id;

      const total = lines.reduce((sum, { item, p }) => sum + p.sellingPrice * item.quantity, 0);
      const options = lines.filter(({ item }) => item.option).map(({ item, p }) => `${p.name}: ${item.option}`);
      const notes = [
        `Commande en ligne (vitrine) · ${data.customerName} · ${data.customerPhone}`,
        ...options,
        data.note ? `Note: ${data.note}` : '',
      ].filter(Boolean).join('\n');

      const created = await tx.order.create({
        data: {
          reference: generateReference(),
          publicToken: generatePublicToken(),
          totalAmount: total,
          discount: 0,
          finalAmount: total,
          notes,
          tenantId: tenant.id,
          clientId,
          createdById: owner.id,
          items: {
            create: lines.map(({ item, p }) => ({
              productId: p.id,
              quantity: item.quantity,
              unitPrice: p.sellingPrice,
              totalPrice: p.sellingPrice * item.quantity,
              unitCost: p.costPrice,
              variant: item.variant,
            })),
          },
        },
        select: { id: true, reference: true, finalAmount: true },
      });
      await tx.client.update({ where: { id: clientId }, data: { totalOrders: { increment: 1 } } });

      const invDateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
      await tx.invoice.create({
        data: {
          invoiceNumber: `INV-${invDateStr}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
          totalAmount: total,
          amountPaid: 0,
          amountDue: total,
          paymentStatus: 'PENDING',
          orderId: created.id,
          clientId,
          tenantId: tenant.id,
          createdById: owner.id,
        },
      });

      await tx.notification.create({
        data: {
          type: 'NEW_ORDER',
          title: 'Nouvelle commande en ligne',
          message: `${data.customerName} a commandé ${lines.reduce((n, { item }) => n + item.quantity, 0)} article(s) · ${total} FCFA (${created.reference})`,
          metadata: { orderId: created.id, reference: created.reference, source: 'STOREFRONT' },
          tenantId: tenant.id,
        },
      });
      return created;
    });

    res.status(201).json({ success: true, data: order });
  } catch (error) {
    if (error instanceof StorefrontError) {
      res.status(400).json({ success: false, code: error.code, message: error.message });
      return;
    }
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
  }
};
