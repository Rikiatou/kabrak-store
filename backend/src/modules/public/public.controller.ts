import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { billingTenantId } from '../../utils/branches';
import { generateInvoiceNumber } from '../../utils/invoiceNumber';
import { generatePublicToken, generateReference } from '../orders/orders.controller';
import { StockError, STOCK_SELECT, itemCost, moveStock, notifyLowStock, isMainMode, readVariants, tieredItemPrice, unitsPerItem } from '../../utils/stock';

/** Storefront is a BUSINESS feature; every plan gets it during the free trial. */
async function isStorefrontOpen(tenantId: string): Promise<boolean> {
  const sub = await prisma.subscription.findUnique({ where: { tenantId: await billingTenantId(tenantId) } });
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
    pack: z.boolean().optional(),
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
      select: { id: true, name: true, logo: true, invoiceColor: true, phone: true, email: true, businessMode: true, businessCategories: true, language: true },
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
      select: { id: true, name: true, description: true, image: true, images: true, sellingPrice: true, totalStock: true, businessType: true, adaptiveFields: true, variants: true, packSize: true, packPrice: true, packName: true, priceTiers: true },
    });
    // Never expose purchase prices on the public storefront
    const data = products.map((p) => ({
      ...p,
      variants: readVariants(p.variants).map(({ name, sellingPrice, stock, packPrice }) => ({ name, sellingPrice, stock, packPrice })),
    }));
    res.json({ success: true, data });
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
        select: STOCK_SELECT,
      });
      const byId = new Map(products.map((p) => [p.id, p]));

      const lines = data.items.map((item) => {
        const p = byId.get(item.productId);
        if (!p) throw new StorefrontError('PRODUCT_UNAVAILABLE', 'Un produit n’est plus disponible');
        return { item, p };
      });

      for (const { item, p } of lines) {
        if (p.isService) continue;
        const fresh = await tx.product.findUnique({ where: { id: p.id }, select: STOCK_SELECT });
        if (!fresh) throw new StorefrontError('PRODUCT_UNAVAILABLE', 'Un produit n’est plus disponible');
        try {
          await moveStock(tx, fresh, item.variant, -item.quantity * unitsPerItem(fresh, item.pack), true);
        } catch (e) {
          if (e instanceof StockError) throw new StorefrontError('INSUFFICIENT_STOCK', e.message);
          throw e;
        }
      }

      const phoneKey = (v: string) => v.replace(/[^\d]/g, '').slice(-9);
      const phoneDigits = phoneKey(data.customerPhone);
      const candidates = await tx.client.findMany({ where: { tenantId: tenant.id, phone: { not: null } }, select: { id: true, phone: true } });
      const existing = candidates.find((c) => phoneKey(c.phone || '') === phoneDigits);
      const clientId = existing?.id ?? (await tx.client.create({
        data: { name: data.customerName, phone: data.customerPhone, tenantId: tenant.id },
        select: { id: true },
      })).id;

      const mainQty = new Map<string, number>();
      for (const { item, p } of lines) if (isMainMode(p, item.pack)) mainQty.set(p.id, (mainQty.get(p.id) ?? 0) + item.quantity);
      const priceOf = (p: (typeof lines)[number]['p'], item: (typeof lines)[number]['item']) => tieredItemPrice(p, item.variant, item.pack, mainQty.get(p.id) ?? 0);
      const total = lines.reduce((sum, { item, p }) => sum + priceOf(p, item) * item.quantity, 0);
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
              unitPrice: priceOf(p, item),
              totalPrice: priceOf(p, item) * item.quantity,
              unitCost: itemCost(p, item.variant, item.pack),
              variant: item.variant,
              packSize: unitsPerItem(p, item.pack) > 1 ? p.packSize : null,
            })),
          },
        },
        select: { id: true, reference: true, finalAmount: true },
      });
      await tx.client.update({ where: { id: clientId }, data: { totalOrders: { increment: 1 } } });

      await tx.invoice.create({
        data: {
          invoiceNumber: await generateInvoiceNumber(tenant.id, tx),
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

    await notifyLowStock(tenant.id, data.items.map((i) => i.productId)).catch((e) => console.error('low stock alert', e));
    res.status(201).json({ success: true, data: order });
  } catch (error) {
    if (error instanceof StorefrontError) {
      res.status(400).json({ success: false, code: error.code, message: error.message });
      return;
    }
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
  }
};
