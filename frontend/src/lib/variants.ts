export interface Variant {
  name: string;
  sellingPrice: number;
  costPrice?: number;
  stock: number;
  barcode?: string | null;
  packPrice?: number | null;
}

export interface Sellable {
  sellingPrice: number;
  totalStock: number;
  lowStockAlert?: number;
  variants?: Variant[] | null;
  packSize?: number | null;
  packPrice?: number | null;
  packName?: string | null;
}

export const variantsOf = (p: Sellable): Variant[] => (Array.isArray(p.variants) ? p.variants : []);

export const findVariant = (p: Sellable, name?: string | null) =>
  name ? variantsOf(p).find((v) => v.name.toLowerCase() === name.toLowerCase()) : undefined;

export const hasPack = (p: Sellable) =>
  !!p.packSize && p.packSize > 1 && ((p.packPrice ?? 0) > 0 || variantsOf(p).some((v) => (v.packPrice ?? 0) > 0));

/** Units taken from stock for one item (a pack counts packSize units). */
export const packUnits = (p: Sellable, pack?: boolean) => (pack && p.packSize && p.packSize > 1 ? p.packSize : 1);

export const priceOf = (p: Sellable, variant?: string | null, pack?: boolean) => {
  const v = findVariant(p, variant);
  if (pack && packUnits(p, pack) > 1) return v?.packPrice || p.packPrice || 0;
  return v ? v.sellingPrice : p.sellingPrice;
};

/** Lowest price, shown as "from …" when variants have different prices. */
export const fromPrice = (p: Sellable) => {
  const vs = variantsOf(p);
  return vs.length ? Math.min(...vs.map((v) => v.sellingPrice)) : p.sellingPrice;
};
export const hasPriceRange = (p: Sellable) => new Set(variantsOf(p).map((v) => v.sellingPrice)).size > 1;

export const packLabel = (p: Sellable, fr: boolean) => `${p.packName || (fr ? 'Paquet' : 'Pack')} ×${p.packSize}`;

/** "Grand · Rouge · paquet ×10" for receipts and order lines. */
export const itemLabel = (variant?: string | null, packSize?: number | null, fr = true) =>
  [variant, packSize && packSize > 1 ? `${fr ? 'paquet' : 'pack'} ×${packSize}` : ''].filter(Boolean).join(' · ');

export const isLowStock = (p: Sellable) => {
  const limit = p.lowStockAlert ?? 5;
  const vs = variantsOf(p);
  return vs.length ? vs.some((v) => v.stock <= limit) : p.totalStock <= limit;
};
