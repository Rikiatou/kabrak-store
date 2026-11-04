import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { validate } from '../../middleware/validate';
import { create as createOrder } from '../orders/orders.controller';

type Variant = { name: string; stock: number };

const orderSchema = z.object({
  name: z.string().trim().min(1).max(100),
  phone: z.string().trim().min(6).max(30),
  notes: z.string().max(500).optional(),
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().min(1).max(999),
    variant: z.string().optional(),
  })).min(1).max(50),
});

const shopWhere = (slug: string) => ({ slug, isActive: true });

const router = Router();

router.get('/shop/:slug', async (req: Request, res: Response) => {
  try {
    const tenant = await prisma.tenant.findFirst({
      where: shopWhere(req.params.slug as string),
      select: { id: true, name: true, slug: true, phone: true, address: true, invoiceColor: true, businessMode: true },
    });
    if (!tenant || tenant.businessMode !== 'PRODUCT') { res.status(404).json({ success: false, message: 'Shop not found' }); return; }
    const products = await prisma.product.findMany({
      where: { tenantId: tenant.id, isActive: true },
      select: { id: true, name: true, description: true, sellingPrice: true, image: true, totalStock: true, variants: true, category: { select: { name: true } } },
      orderBy: { name: 'asc' },
    });
    const { id: _id, ...shop } = tenant;
    res.json({
      success: true,
      data: {
        shop,
        products: products.map(({ totalStock, variants, ...p }) => ({
          ...p,
          inStock: totalStock > 0,
          variants: Array.isArray(variants) ? (variants as unknown as Variant[]).map((v) => ({ name: v.name, inStock: v.stock > 0 })) : [],
        })),
      },
    });
  } catch {
    res.status(500).json({ success: false, message: 'Error' });
  }
});

router.post('/shop/:slug/orders', validate(orderSchema), async (req: Request, res: Response) => {
  try {
    const data = req.body as z.infer<typeof orderSchema>;
    const tenant = await prisma.tenant.findFirst({ where: shopWhere(req.params.slug as string), select: { id: true } });
    const owner = tenant && await prisma.user.findFirst({ where: { tenantId: tenant.id, role: 'OWNER', isActive: true } });
    if (!tenant || !owner) { res.status(404).json({ success: false, message: 'Shop not found' }); return; }

    const products = await prisma.product.findMany({
      where: { id: { in: data.items.map((i) => i.productId) }, tenantId: tenant.id, isActive: true },
      select: { id: true, sellingPrice: true },
    });
    if (products.length !== new Set(data.items.map((i) => i.productId)).size) {
      res.status(400).json({ success: false, message: 'Produit indisponible' });
      return;
    }

    const client = await prisma.client.findFirst({ where: { tenantId: tenant.id, phone: data.phone } })
      ?? await prisma.client.create({ data: { tenantId: tenant.id, name: data.name, phone: data.phone } });

    // Reuse the regular order flow (stock checks, reference, loyalty) as the shop owner, with server-side prices.
    req.user = { id: owner.id, email: owner.email, role: owner.role, tenantId: tenant.id };
    req.body = {
      clientId: client.id,
      discount: 0,
      amountPaid: 0,
      paymentMethod: 'CASH',
      notes: [`Commande en ligne — ${data.name} (${data.phone})`, data.notes].filter(Boolean).join('\n'),
      items: data.items.map((i) => ({ ...i, unitPrice: products.find((p) => p.id === i.productId)!.sellingPrice })),
    };
    let status = 200;
    let body: { success?: boolean; message?: string; code?: string; variant?: string; data?: { reference: string; finalAmount: number } } = {};
    const capture = {
      status(code: number) { status = code; return capture; },
      json(payload: typeof body) { body = payload; return capture; },
    } as unknown as Response;
    await createOrder(req, capture);
    res.status(status).json(
      body.success
        ? { success: true, data: { reference: body.data!.reference, total: body.data!.finalAmount } }
        : { success: false, message: body.message, code: body.code, variant: body.variant },
    );
  } catch {
    res.status(500).json({ success: false, message: 'Error' });
  }
});

export default router;
