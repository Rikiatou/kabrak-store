import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard, Package, ShoppingCart, Users, FileText,
  UserCog, Truck, BarChart3, CreditCard, Tags,
  Heart, Store, FolderKanban, RefreshCw, Monitor, Settings, TrendingDown, Building2, Sparkles, Briefcase, BookOpen, ClipboardCheck, CalendarDays, HandCoins } from 'lucide-react';

import { ALWAYS_ALLOWED, canAccess } from './modules';

export type BusinessMode = 'PRODUCT' | 'SERVICE';

// Businesses that take orders in advance — no walk-in counter sales
export const ORDER_BASED_CATEGORIES = new Set([
  'CAKES', 'FOOD_BUSINESS',
]);

export interface NavItem {
  key: string;
  icon: LucideIcon;
  path: string;
  plans?: string[];
  modes?: BusinessMode[];
  hideWhenOrderBased?: boolean;  // hide for order-based businesses (e.g. POS)
  showWhenOrderBased?: boolean;  // bypass plan gate for order-based businesses (e.g. Deliveries)
}

export const navItems: NavItem[] = [
  { key: 'dashboard', icon: LayoutDashboard, path: '/dashboard' },
  // Product mode
  { key: 'products', icon: Package, path: '/products', modes: ['PRODUCT'] },
  { key: 'orders', icon: ShoppingCart, path: '/orders', modes: ['PRODUCT'] },
  { key: 'pos', icon: Monitor, path: '/pos', modes: ['PRODUCT'], hideWhenOrderBased: true },
  { key: 'closing', icon: ClipboardCheck, path: '/closing', modes: ['PRODUCT'] },
  { key: 'agenda', icon: CalendarDays, path: '/agenda', modes: ['PRODUCT'] },
  // SHOP+ features — Deliveries also surfaced for order-based businesses
  { key: 'categories', icon: Tags, path: '/categories', modes: ['PRODUCT'], plans: ['SHOP', 'BUSINESS'] },
  { key: 'delivery', icon: Truck, path: '/deliveries', modes: ['PRODUCT'], plans: ['SHOP', 'BUSINESS'], showWhenOrderBased: true },
  { key: 'loyalty', icon: Heart, path: '/loyalty', modes: ['PRODUCT'], plans: ['SHOP', 'BUSINESS'] },
  // Service mode
  { key: 'projects', icon: FolderKanban, path: '/projects', modes: ['SERVICE'] },
  { key: 'services', icon: Briefcase, path: '/services', modes: ['SERVICE'] },
  { key: 'recurring', icon: RefreshCw, path: '/recurring', modes: ['SERVICE'] },
  // All plans
  { key: 'clients', icon: Users, path: '/clients' },
  { key: 'invoices', icon: FileText, path: '/invoices' },
  { key: 'debts', icon: HandCoins, path: '/debts' },
  { key: 'expenses', icon: TrendingDown, path: '/expenses' },
  { key: 'suppliers', icon: Building2, path: '/suppliers', plans: ['SHOP', 'BUSINESS'] },
  { key: 'employees', icon: UserCog, path: '/employees', plans: ['SHOP', 'BUSINESS'] },
  { key: 'stores', icon: Store, path: '/stores', plans: ['BUSINESS'] },
  { key: 'reports', icon: BarChart3, path: '/reports', plans: ['SHOP', 'BUSINESS'] },
  { key: 'ai-reports', icon: Sparkles, path: '/ai-reports', plans: ['BUSINESS'] },
  { key: 'billing', icon: CreditCard, path: '/billing' },
  { key: 'settings', icon: Settings, path: '/settings' },
  { key: 'guide', icon: BookOpen, path: '/guide' },
];

type NavTenant = { plan: string; businessMode?: BusinessMode; businessCategories?: string[] } | null | undefined;

// Modules available to this shop (plan, business mode, order-based categories).
export function navItemsFor(tenant: NavTenant): NavItem[] {
  const businessMode = tenant?.businessMode || 'PRODUCT';
  const isOrderBased = !!(tenant?.businessCategories?.length &&
    tenant.businessCategories.every((cat) => ORDER_BASED_CATEGORIES.has(cat)));
  return navItems.filter((item) => {
    if (item.hideWhenOrderBased && isOrderBased) return false;
    if (item.showWhenOrderBased && isOrderBased) {
      if (item.modes && !item.modes.includes(businessMode)) return false;
      return true;
    }
    if (item.plans && !(tenant && item.plans.includes(tenant.plan))) return false;
    if (item.modes && !item.modes.includes(businessMode)) return false;
    return true;
  });
}


type HomeUser = { role?: string; modules?: string[] } | null | undefined;

// Where a user lands after login or when sent away from a module: owners/managers on the dashboard, sellers on the POS.
export function homePathFor(user: HomeUser, tenant: NavTenant): string {
  const allowed = navItemsFor(tenant).filter((i) => !ALWAYS_ALLOWED.has(i.key) && canAccess(user, i.key));
  const order = user?.role === 'EMPLOYEE' ? ['pos', 'orders', 'dashboard'] : ['dashboard', 'pos', 'orders'];
  for (const key of order) {
    const item = allowed.find((i) => i.key === key);
    if (item) return item.path;
  }
  return allowed[0]?.path || '/guide';
}
