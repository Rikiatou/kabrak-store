import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Package, ShoppingCart, Users, FileText,
  UserCog, Truck, BarChart3, CreditCard, Tags, ChevronLeft, ChevronRight,
  Heart, Store,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/i18n/useTranslation';
import { useAuthStore } from '@/stores/authStore';
import { useState } from 'react';

const navItems = [
  { key: 'dashboard', icon: LayoutDashboard, path: '/' },
  { key: 'products', icon: Package, path: '/products' },
  { key: 'orders', icon: ShoppingCart, path: '/orders' },
  { key: 'clients', icon: Users, path: '/clients' },
  { key: 'invoices', icon: FileText, path: '/invoices' },
  { key: 'categories', icon: Tags, path: '/categories' },
  { key: 'delivery', icon: Truck, path: '/deliveries' },
  { key: 'loyalty', icon: Heart, path: '/loyalty' },
  { key: 'employees', icon: UserCog, path: '/employees', plans: ['SHOP', 'BUSINESS'] },
  { key: 'stores', icon: Store, path: '/stores', plans: ['BUSINESS'] },
  { key: 'reports', icon: BarChart3, path: '/reports' },
  { key: 'billing', icon: CreditCard, path: '/billing' },
];

export function Sidebar() {
  const { t } = useTranslation();
  const location = useLocation();
  const tenant = useAuthStore((s) => s.tenant);
  const [collapsed, setCollapsed] = useState(false);

  const filteredItems = navItems.filter((item) => {
    if (!item.plans) return true;
    return tenant && item.plans.includes(tenant.plan);
  });

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300 flex flex-col',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-kabrak-500 flex items-center justify-center">
            <span className="text-white font-bold text-sm">K</span>
          </div>
          {!collapsed && (
            <div>
              <h1 className="font-bold text-kabrak-500 text-lg leading-none">KABRAK</h1>
              <p className="text-[10px] text-gold-500 font-semibold tracking-wider">
                {tenant?.plan || 'STORE'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        <ul className="space-y-1">
          {filteredItems.map((item) => {
            const isActive = location.pathname === item.path ||
              (item.path !== '/' && location.pathname.startsWith(item.path));
            const Icon = item.icon;

            return (
              <li key={item.key}>
                <Link
                  to={item.path}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-kabrak-500 text-white shadow-md'
                      : 'text-sidebar-foreground hover:bg-accent'
                  )}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  {!collapsed && <span>{t(`nav.${item.key}`)}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Collapse button */}
      <div className="p-2 border-t border-sidebar-border">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center p-2 rounded-lg hover:bg-accent transition-colors cursor-pointer"
        >
          {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
      </div>
    </aside>
  );
}
