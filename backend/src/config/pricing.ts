// Single source of truth for plan pricing (FCFA / month).
// Imported by billing.controller and admin.controller to avoid price mismatches.
export const PLAN_PRICES: Record<string, number> = {
  STORE: 4900,
  SHOP: 9900,
  BUSINESS: 14900,
};

export const PLAN_LIMITS: Record<string, { stores: number; users: number; aiReportsPerMonth: number }> = {
  STORE: { stores: 1, users: 1, aiReportsPerMonth: 0 },
  SHOP: { stores: 1, users: 3, aiReportsPerMonth: 3 },
  BUSINESS: { stores: 999, users: 999, aiReportsPerMonth: 999 },
};
