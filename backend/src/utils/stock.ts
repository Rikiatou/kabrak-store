import { BusinessCategory, Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';

export class StockError extends Error {}

export interface Variant {
  name: string;
  sellingPrice: number;
  costPrice: number;
  stock: number;
  barcode?: string | null;
  packPrice?: number | null;
}

const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);

export const readVariants = (raw: unknown): Variant[] =>
  Array.isArray(raw)
    ? raw
        .filter((v) => v && typeof v === 'object' && typeof (v as Variant).name === 'string' && (v as Variant).name.trim())
        .map((v: Variant) => ({
          name: v.name.trim(),
          sellingPrice: Math.max(0, num(v.sellingPrice)),
          costPrice: Math.max(0, num(v.costPrice)),
          stock: Math.trunc(num(v.stock)),
          barcode: v.barcode ? String(v.barcode).trim() || null : null,
          packPrice: v.packPrice === null || v.packPrice === undefined || (v.packPrice as unknown) === '' ? null : Math.max(0, num(v.packPrice)),
        }))
    : [];

export const findVariant = (variants: Variant[], name?: string | null) =>
  name ? variants.find((v) => v.name.toLowerCase() === name.trim().toLowerCase()) : undefined;

const parseSizes = (sizes: unknown): Array<[string, number]> =>
  typeof sizes === 'string'
    ? sizes.split(',').map((part) => part.split(':').map((x) => x.trim())).filter((kv) => kv.length === 2 && kv[0]).map(([k, v]) => [k, parseInt(v) || 0])
    : [];

/** Applies `delta` to the legacy "S:5, M:10" size stock string; returns null when the size is unknown. */
export const adjustSizes = (fields: unknown, variant: string, delta: number): { fields: Record<string, unknown>; remaining: number } | null => {
  const obj = (fields && typeof fields === 'object' ? fields : {}) as Record<string, unknown>;
  const entries = parseSizes(obj.sizes);
  const idx = entries.findIndex(([k]) => k.toLowerCase() === variant.trim().toLowerCase());
  if (idx < 0) return null;
  entries[idx] = [entries[idx][0], entries[idx][1] + delta];
  return { fields: { ...obj, sizes: entries.map(([k, v]) => `${k}:${v}`).join(', ') }, remaining: entries[idx][1] };
};

export interface StockProduct {
  id: string;
  name: string;
  totalStock: number;
  costPrice: number;
  sellingPrice: number;
  adaptiveFields: Prisma.JsonValue | null;
  variants: Prisma.JsonValue | null;
  packSize: number | null;
  packPrice: number | null;
}

export const STOCK_SELECT = {
  id: true, name: true, totalStock: true, costPrice: true, sellingPrice: true,
  adaptiveFields: true, variants: true, packSize: true, packPrice: true, isService: true,
} as const;

/** Units taken from stock for one sold item (a pack counts `packSize` units). */
export const unitsPerItem = (product: Pick<StockProduct, 'packSize'>, pack?: boolean) =>
  pack && product.packSize && product.packSize > 1 ? product.packSize : 1;

/** Purchase cost of one sold item, from the variant when there is one. */
export const itemCost = (product: StockProduct, variant?: string | null, pack?: boolean) => {
  const v = findVariant(readVariants(product.variants), variant);
  return (v ? v.costPrice : product.costPrice) * unitsPerItem(product, pack);
};

/** Shop price of one item: variant price, pack price, or the product price. */
export const itemPrice = (product: StockProduct, variant?: string | null, pack?: boolean) => {
  const v = findVariant(readVariants(product.variants), variant);
  if (pack && unitsPerItem(product, pack) > 1) return v?.packPrice || product.packPrice || 0;
  return v ? v.sellingPrice : product.sellingPrice;
};

/**
 * Moves `delta` units of stock for a product and its variant (or legacy size).
 * `strict` refuses negative stock and unknown variants (live sales); offline replays and cancellations are not strict.
 */
export async function moveStock(
  tx: Prisma.TransactionClient,
  product: StockProduct,
  variant: string | null | undefined,
  delta: number,
  strict: boolean,
  variantPatch?: Partial<Variant>,
): Promise<void> {
  const variants = readVariants(product.variants);
  const label = variant ? `${product.name} · ${variant}` : product.name;
  if (strict && delta < 0 && product.totalStock + delta < 0) {
    throw new StockError(`Stock insuffisant pour "${label}". Disponible: ${product.totalStock}, Demandé: ${-delta}`);
  }
  const data: Prisma.ProductUpdateInput = { totalStock: { increment: delta } };

  if (variants.length > 0) {
    const v = findVariant(variants, variant);
    if (!v) {
      if (strict) throw new StockError(variant ? `Variante inconnue : ${label}` : `Choisissez la variante de "${product.name}"`);
    } else {
      if (strict && delta < 0 && v.stock + delta < 0) {
        throw new StockError(`Stock insuffisant pour "${label}". Disponible: ${v.stock}, Demandé: ${-delta}`);
      }
      v.stock += delta;
      Object.assign(v, variantPatch);
      data.variants = variants as unknown as Prisma.InputJsonValue;
    }
  } else if (variant) {
    const sized = adjustSizes(product.adaptiveFields, variant, delta);
    if (sized) {
      if (strict && sized.remaining < 0) throw new StockError(`Stock insuffisant pour "${label}"`);
      data.adaptiveFields = sized.fields as Prisma.InputJsonValue;
    }
  }

  await tx.product.update({ where: { id: product.id }, data });
}

const ORDER_BASED_TYPES: BusinessCategory[] = ['CAKES', 'FOOD_BUSINESS'];

type AlertProduct = { id: string; name: string; totalStock: number; lowStockAlert: number; variants: Prisma.JsonValue | null };

/** "Robe · M : 1" lines for everything at or under the product's alert threshold. */
export const lowStockLines = (p: AlertProduct): string[] => {
  const variants = readVariants(p.variants);
  if (variants.length > 0) {
    return variants.filter((v) => v.stock <= p.lowStockAlert).map((v) => `${p.name} · ${v.name} : ${v.stock}`);
  }
  return p.totalStock <= p.lowStockAlert ? [`${p.name} : ${p.totalStock}`] : [];
};

/** Creates (or refreshes) one unread "Stock faible" notification per product that is low. */
export async function notifyLowStock(tenantId: string, productIds?: string[]) {
  const products = await prisma.product.findMany({
    where: {
      tenantId, isActive: true, isService: false,
      businessType: { notIn: ORDER_BASED_TYPES },
      ...(productIds ? { id: { in: productIds } } : {}),
    },
    select: { id: true, name: true, totalStock: true, lowStockAlert: true, variants: true },
  });
  const low = products.map((p) => ({ p, lines: lowStockLines(p) })).filter((x) => x.lines.length > 0);
  let created = 0;
  for (const { p, lines } of low) {
    const message = `${lines.join(', ')} (seuil: ${p.lowStockAlert})`;
    const exists = await prisma.notification.findFirst({
      where: { tenantId, type: 'STOCK_ALERT', isRead: false, metadata: { path: ['productId'], equals: p.id } },
      select: { id: true, message: true },
    });
    if (exists) {
      if (exists.message !== message) await prisma.notification.update({ where: { id: exists.id }, data: { message } });
      continue;
    }
    await prisma.notification.create({
      data: { type: 'STOCK_ALERT', title: 'Stock faible', message, tenantId, metadata: { productId: p.id, stock: p.totalStock } },
    });
    created++;
  }
  return { products: low.map(({ p }) => p), created };
}
