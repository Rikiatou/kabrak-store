import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { config } from '../../config';
import { groupTenants, isInGroup } from '../../utils/branches';
import { PLAN_PRICES } from '../../config/pricing';
import { logActivity } from '../../utils/activity';
import { StockError, StockProduct, moveStock, readVariants, stockValue } from '../../utils/stock';
import { canSeeCosts } from '../../utils/costs';

const fail = (res: Response, error: unknown) => {
  const message = error instanceof Error ? error.message : 'Erreur';
  res.status(500).json({ success: false, message });
};

const slugify = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Date.now().toString(36);

/** Creating boutiques and moving stock needs the owner's own boutique on an active BUSINESS plan. */
export const requireBusinessHome = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const home = await prisma.tenant.findUnique({ where: { id: req.user!.homeTenantId }, include: { subscription: true } });
  const sub = home?.subscription;
  const now = new Date();
  const active = !!sub && (sub.status === 'TRIAL' ? !!sub.trialEndsAt && sub.trialEndsAt > now : sub.status === 'ACTIVE' && sub.endDate > now);
  if (home?.plan !== 'BUSINESS' || !active) {
    res.status(403).json({
      success: false,
      code: 'PLAN_REQUIRED',
      message: 'Plusieurs boutiques : il faut un abonnement BUSINESS actif sur la boutique principale.',
    });
    return;
  }
  next();
};

export const getAll = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenants = await groupTenants(req.user!.homeTenantId);
    const ids = tenants.map((t) => t.id);
    const [subs, products, users] = await Promise.all([
      prisma.subscription.findMany({ where: { tenantId: { in: ids } } }),
      prisma.product.groupBy({ by: ['tenantId'], where: { tenantId: { in: ids } }, _count: true }),
      prisma.user.groupBy({ by: ['tenantId'], where: { tenantId: { in: ids } }, _count: true }),
    ]);
    const home = tenants.find((t) => t.id === req.user!.homeTenantId);
    const homeSub = subs.find((s) => s.tenantId === home?.id) || null;
    res.json({
      success: true,
      data: tenants.map((t) => {
        const sub = t.includedInParent ? homeSub : subs.find((s) => s.tenantId === t.id) || null;
        return {
          id: t.id,
          name: t.name,
          address: t.address,
          phone: t.phone,
          plan: t.plan,
          isMain: !t.parentTenantId,
          included: t.includedInParent,
          isCurrent: t.id === req.user!.tenantId,
          subscription: sub && { status: sub.status, endDate: sub.endDate, trialEndsAt: sub.trialEndsAt, plan: sub.plan },
          products: products.find((p) => p.tenantId === t.id)?._count ?? 0,
          users: (users.find((u) => u.tenantId === t.id)?._count ?? 0) + (t.parentTenantId ? 1 : 0),
        };
      }),
    });
  } catch (error) {
    fail(res, error);
  }
};

const createSchema = z.object({
  name: z.string().trim().min(2).max(80),
  address: z.string().trim().max(200).optional(),
  phone: z.string().trim().max(30).optional(),
  plan: z.enum(['STORE', 'SHOP', 'BUSINESS']).default('BUSINESS'),
});

/** The 2nd boutique is included in BUSINESS; from the 3rd on, each boutique has its own paid plan. */
export const create = async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: 'Nom de la boutique obligatoire (2 caractères minimum)' });
      return;
    }
    const { name, address, phone, plan } = parsed.data;
    const homeId = req.user!.homeTenantId;
    const home = await prisma.tenant.findUnique({ where: { id: homeId }, include: { categories: { select: { name: true } } } });
    if (!home) {
      res.status(404).json({ success: false, message: 'Boutique introuvable' });
      return;
    }
    const included = (await prisma.tenant.count({ where: { parentTenantId: homeId, includedInParent: true } })) === 0;

    const branch = await prisma.$transaction(async (tx) => {
      const t = await tx.tenant.create({
        data: {
          name,
          slug: slugify(name),
          address: address || null,
          phone: phone || home.phone,
          email: home.email,
          plan: included ? home.plan : plan,
          businessMode: home.businessMode,
          businessCategories: home.businessCategories,
          currency: home.currency,
          language: home.language,
          logo: home.logo,
          invoiceColor: home.invoiceColor,
          invoiceHeader: home.invoiceHeader,
          parentTenantId: homeId,
          includedInParent: included,
        },
      });
      if (home.categories.length) {
        await tx.category.createMany({ data: home.categories.map((c) => ({ name: c.name, tenantId: t.id })) });
      }
      if (!included) {
        await tx.subscription.create({
          data: { plan, status: 'EXPIRED', priceMonthly: PLAN_PRICES[plan], startDate: new Date(), endDate: new Date(), tenantId: t.id },
        });
      }
      return t;
    });

    res.status(201).json({ success: true, data: { id: branch.id, name: branch.name, included } });
  } catch (error) {
    fail(res, error);
  }
};

export const update = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    if (!(await isInGroup(req.user!.homeTenantId, id))) {
      res.status(404).json({ success: false, message: 'Boutique introuvable' });
      return;
    }
    const { name, address, phone } = req.body as { name?: string; address?: string; phone?: string };
    await prisma.tenant.update({
      where: { id },
      data: {
        ...(name?.trim() ? { name: name.trim() } : {}),
        ...(address !== undefined ? { address: address.trim() || null } : {}),
        ...(phone !== undefined ? { phone: phone.trim() || null } : {}),
      },
    });
    res.json({ success: true, message: 'Boutique mise à jour' });
  } catch (error) {
    fail(res, error);
  }
};

export const remove = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const branch = await prisma.tenant.findFirst({
      where: { id, parentTenantId: req.user!.homeTenantId },
      include: { _count: { select: { products: true, orders: true, invoices: true, users: true } } },
    });
    if (!branch) {
      res.status(400).json({ success: false, message: 'Impossible de supprimer la boutique principale' });
      return;
    }
    const c = branch._count;
    if (c.products || c.orders || c.invoices || c.users) {
      res.status(400).json({ success: false, message: 'Cette boutique a déjà des produits, ventes ou employés : suppression impossible' });
      return;
    }
    await prisma.tenant.delete({ where: { id } });
    res.json({ success: true, message: 'Boutique supprimée' });
  } catch (error) {
    fail(res, error);
  }
};

/** Returns a token that opens the chosen boutique for the same owner. */
export const switchTo = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const homeId = req.user!.homeTenantId;
    if (!(await isInGroup(homeId, id))) {
      res.status(404).json({ success: false, message: 'Boutique introuvable' });
      return;
    }
    const payload = id === homeId ? { userId: req.user!.id } : { userId: req.user!.id, tenantId: id };
    const token = jwt.sign(payload, config.jwtSecret, { expiresIn: 60 * 60 * 24 * 7 });
    res.json({ success: true, data: { token, tenantId: id } });
  } catch (error) {
    fail(res, error);
  }
};

export const overview = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenants = await groupTenants(req.user!.homeTenantId);
    const today = new Date(new Date().setHours(0, 0, 0, 0));
    const month = new Date(today.getFullYear(), today.getMonth(), 1);
    const rows = await Promise.all(tenants.map(async (t) => {
      const [day, mon, debts, products, paidToday] = await Promise.all([
        prisma.order.aggregate({ where: { tenantId: t.id, createdAt: { gte: today }, status: { not: 'CANCELLED' } }, _sum: { finalAmount: true }, _count: true }),
        prisma.order.aggregate({ where: { tenantId: t.id, createdAt: { gte: month }, status: { not: 'CANCELLED' } }, _sum: { finalAmount: true } }),
        prisma.invoice.aggregate({ where: { tenantId: t.id, amountDue: { gt: 0 } }, _sum: { amountDue: true } }),
        prisma.product.findMany({ where: { tenantId: t.id, isActive: true, isService: false }, select: { totalStock: true, lowStockAlert: true, costPrice: true, sellingPrice: true, variants: true } }),
        prisma.payment.aggregate({ where: { invoice: { tenantId: t.id }, createdAt: { gte: today } }, _sum: { amount: true } }),
      ]);
      const stock = stockValue(products);
      return {
        id: t.id,
        name: t.name,
        isMain: !t.parentTenantId,
        salesToday: day._sum.finalAmount || 0,
        ordersToday: day._count,
        salesMonth: mon._sum.finalAmount || 0,
        debts: debts._sum.amountDue || 0,
        products: products.length,
        lowStock: products.filter((p) => p.totalStock <= p.lowStockAlert).length,
        receivedToday: paidToday._sum.amount || 0,
        stockCapital: stock.cost,
        stockRetailValue: stock.retail,
      };
    }));
    type Key = Exclude<keyof (typeof rows)[number], 'id' | 'name' | 'isMain'>;
    const sum = (k: Key) => rows.reduce((s, r) => s + r[k], 0);
    const showCosts = canSeeCosts(req.user!.role);
    res.json({
      success: true,
      data: {
        boutiques: showCosts ? rows : rows.map((r) => ({ ...r, stockCapital: undefined })),
        total: {
          salesToday: sum('salesToday'), ordersToday: sum('ordersToday'), salesMonth: sum('salesMonth'), debts: sum('debts'),
          products: sum('products'), lowStock: sum('lowStock'), receivedToday: sum('receivedToday'),
          stockCapital: showCosts ? sum('stockCapital') : undefined, stockRetailValue: sum('stockRetailValue'),
        },
      },
    });
  } catch (error) {
    fail(res, error);
  }
};

/** Products of one boutique of the group, to pick what to transfer. */
export const products = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    if (!(await isInGroup(req.user!.homeTenantId, id))) {
      res.status(404).json({ success: false, message: 'Boutique introuvable' });
      return;
    }
    const list = await prisma.product.findMany({
      where: { tenantId: id, isActive: true, isService: false },
      select: { id: true, name: true, totalStock: true, variants: true, packSize: true, packName: true },
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: list });
  } catch (error) {
    fail(res, error);
  }
};

const transferSchema = z.object({
  fromId: z.string().uuid(),
  toId: z.string().uuid(),
  productId: z.string().uuid(),
  variant: z.string().trim().max(80).optional().nullable(),
  quantity: z.number().int().min(1).max(100000),
});

/** Moves units from one boutique to another; the product is copied (stock 0) if the other boutique doesn't have it yet. */
export const createTransfer = async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = transferSchema.safeParse(req.body);
    if (!parsed.success || parsed.data.fromId === parsed.data.toId) {
      res.status(400).json({ success: false, message: 'Choisissez deux boutiques différentes, un produit et une quantité' });
      return;
    }
    const { fromId, toId, productId, quantity } = parsed.data;
    const variant = parsed.data.variant || null;
    const homeId = req.user!.homeTenantId;
    if (!(await isInGroup(homeId, fromId)) || !(await isInGroup(homeId, toId))) {
      res.status(404).json({ success: false, message: 'Boutique introuvable' });
      return;
    }

    const result = await prisma.$transaction(async (tx) => {
      const src = await tx.product.findFirst({ where: { id: productId, tenantId: fromId }, include: { category: { select: { name: true } } } });
      if (!src) throw new StockError('Produit introuvable dans la boutique de départ');
      const srcVariants = readVariants(src.variants);
      if (srcVariants.length && !variant) throw new StockError(`Choisissez la variante de "${src.name}"`);

      const or: Prisma.ProductWhereInput[] = [{ name: { equals: src.name, mode: 'insensitive' } }];
      if (src.barcode) or.unshift({ barcode: src.barcode });
      if (src.sku) or.unshift({ sku: src.sku });
      let dest = await tx.product.findFirst({ where: { tenantId: toId, isService: false, OR: or } });

      if (!dest) {
        const category = src.category ? await tx.category.findFirst({ where: { tenantId: toId, name: src.category.name } }) : null;
        dest = await tx.product.create({
          data: {
            name: src.name,
            description: src.description,
            image: src.image,
            images: src.images,
            categoryId: category?.id ?? null,
            tenantId: toId,
            businessType: src.businessType,
            costPrice: src.costPrice,
            sellingPrice: src.sellingPrice,
            totalStock: 0,
            lowStockAlert: src.lowStockAlert,
            barcode: src.barcode,
            sku: src.sku,
            adaptiveFields: src.adaptiveFields ?? Prisma.JsonNull,
            variants: srcVariants.length ? (srcVariants.map((v) => ({ ...v, stock: 0 })) as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
            packSize: src.packSize,
            packPrice: src.packPrice,
            packName: src.packName,
            priceTiers: src.priceTiers ?? Prisma.JsonNull,
          },
        });
      } else if (variant) {
        const destVariants = readVariants(dest.variants);
        if (!destVariants.length && srcVariants.length) {
          throw new StockError(`"${dest.name}" n'a pas de variantes dans l'autre boutique`);
        }
        const sv = srcVariants.find((v) => v.name.toLowerCase() === variant.toLowerCase());
        if (sv && !destVariants.some((v) => v.name.toLowerCase() === variant.toLowerCase())) {
          dest = await tx.product.update({
            where: { id: dest.id },
            data: { variants: [...destVariants, { ...sv, stock: 0 }] as unknown as Prisma.InputJsonValue },
          });
        }
      }

      await moveStock(tx, src as StockProduct, variant, -quantity, true);
      await moveStock(tx, dest as StockProduct, variant, quantity, true);
      return tx.stockTransfer.create({
        data: { fromTenantId: fromId, toTenantId: toId, fromProductId: src.id, toProductId: dest.id, productName: src.name, variant, quantity, createdById: req.user!.id },
      });
    });

    logActivity(req, 'STOCK_TRANSFER', `Transfert : ${quantity} × ${result.productName}${variant ? ` · ${variant}` : ''} vers une autre boutique`, { type: 'product', id: productId });
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    if (error instanceof StockError) {
      res.status(400).json({ success: false, message: error.message });
      return;
    }
    fail(res, error);
  }
};

export const transfers = async (req: Request, res: Response): Promise<void> => {
  try {
    const ids = (await groupTenants(req.user!.homeTenantId)).map((t) => t.id);
    const list = await prisma.stockTransfer.findMany({
      where: { fromTenantId: { in: ids } },
      include: { fromTenant: { select: { name: true } }, toTenant: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json({ success: true, data: list });
  } catch (error) {
    fail(res, error);
  }
};
