// Sidebar modules an owner can grant to a staff account. An empty list means full access.
export const STAFF_MODULES = [
  'dashboard', 'products', 'purchases', 'orders', 'pos', 'closing', 'agenda', 'categories', 'delivery', 'loyalty',
  'projects', 'services', 'recurring', 'clients', 'invoices', 'debts', 'expenses', 'suppliers',
  'employees', 'stores', 'reports', 'ai-reports', 'billing', 'settings',
] as const;

export const sanitizeModules = (value: unknown): string[] =>
  Array.isArray(value)
    ? [...new Set(value.filter((m): m is string => typeof m === 'string' && (STAFF_MODULES as readonly string[]).includes(m)))]
    : [];
