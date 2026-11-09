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
  priceTiers?: PriceTier[] | null;
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

/** Price of what is normally sold: the pack (wholesale) when the product is sold by pack, else the unit. */
export const mainPrice = (p: Sellable) => {
  if (!hasPack(p)) return fromPrice(p);
  const vs = variantsOf(p);
  return vs.length ? Math.min(...vs.map((v) => v.packPrice || p.packPrice || 0)) : p.packPrice || 0;
};
export const hasMainRange = (p: Sellable) =>
  hasPack(p) ? new Set(variantsOf(p).map((v) => v.packPrice || p.packPrice)).size > 1 : hasPriceRange(p);

/** Stock in units shown as "19 paquets + 7" for products sold by pack. */
export const stockText = (p: Sellable, units: number, fr = true) => {
  const n = p.packSize && p.packSize > 1 ? p.packSize : 1;
  if (n === 1) return String(units);
  const packs = Math.trunc(units / n);
  const rest = units - packs * n;
  const name = (p.packName || (fr ? 'paquet' : 'pack')).toLowerCase();
  return `${packs} ${name}${Math.abs(packs) > 1 ? 's' : ''}${rest ? ` + ${rest}` : ''}`;
};

export interface PriceTier { minQty: number; price: number }

export const tiersOf = (p: Sellable): PriceTier[] =>
  (Array.isArray(p.priceTiers) ? p.priceTiers : []).filter((t) => t.minQty >= 2 && t.price > 0).sort((a, b) => a.minQty - b.minQty);

/** Quantity prices apply to the normal sale: the pack when sold by pack, else the unit. */
export const isMainMode = (p: Sellable, pack?: boolean) => !!pack === hasPack(p);

export const tierPrice = (p: Sellable, qty: number): number | null => {
  let price: number | null = null;
  for (const t of tiersOf(p)) if (qty >= t.minQty) price = t.price;
  return price;
};

/** Price with the quantity price once `mainQty` (all main-mode lines of this product in the cart) reaches a tier. */
export const tieredPrice = (p: Sellable, variant: string | null | undefined, pack: boolean | undefined, mainQty: number) =>
  (isMainMode(p, pack) ? tierPrice(p, mainQty) : null) ?? priceOf(p, variant, pack);

export const tiersText = (p: Sellable, fmt: (n: number) => string, fr = true) =>
  tiersOf(p).map((t) => `${fr ? 'dès' : 'from'} ${t.minQty} : ${fmt(t.price)}`).join(' · ');
