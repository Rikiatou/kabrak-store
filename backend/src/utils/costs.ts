/** Purchase prices and profits are for the owner and managers only; cashiers and employees never receive them. */
export const canSeeCosts = (role?: string | null) => role === 'OWNER' || role === 'MANAGER';

const stripVariantCosts = (variants: unknown) =>
  Array.isArray(variants)
    ? variants.map((v) => {
      if (!v || typeof v !== 'object') return v;
      const { costPrice: _cost, ...rest } = v as Record<string, unknown>;
      return rest;
    })
    : variants;

export function hideProductCost<T extends object | null | undefined>(product: T): T {
  if (!product) return product;
  const p = product as Record<string, unknown>;
  return { ...p, costPrice: undefined, variants: stripVariantCosts(p.variants) } as T;
}

type WithItems = { items?: Array<{ unitCost?: number | null; product?: object | null }> };
export function hideOrderCosts<T extends object | null>(order: T): T {
  if (!order) return order;
  const o = order as WithItems;
  return {
    ...o,
    items: o.items?.map((it) => ({ ...it, unitCost: undefined, product: hideProductCost(it.product) })),
  } as T;
}

const PROFIT_KEYS = ['cost', 'grossProfit', 'netProfit'] as const;
export function hideSummaryProfit<T extends object | null | undefined>(summary: T): T {
  if (!summary) return summary;
  const s = { ...(summary as Record<string, unknown>) };
  for (const k of PROFIT_KEYS) delete s[k];
  return s as T;
}
