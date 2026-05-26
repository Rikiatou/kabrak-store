import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Package, ShoppingCart, Users, FileText,
  UserCog, Truck, BarChart3, CreditCard, Tags, X,
  Heart, Store, FolderKanban, RefreshCw, Monitor, Settings, TrendingDown, Building2, Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/i18n/useTranslation';
import { useAuthStore } from '@/stores/authStore';

type BusinessMode = 'PRODUCT' | 'SERVICE';

interface NavItem {
  key: string;
  icon: typeof LayoutDashboard;
  path: string;
  plans?: string[];
  modes?: BusinessMode[];
}

const navItems: NavItem[] = [
  { key: 'dashboard', icon: LayoutDashboard, path: '/dashboard' },
  // SHOP+ : catalogue produits & stock
  { key: 'products', icon: Package, path: '/products', modes: ['PRODUCT'] },
  { key: 'orders', icon: ShoppingCart, path: '/orders', modes: ['PRODUCT'] },
  { key: 'categories', icon: Tags, path: '/categories', modes: ['PRODUCT'] },
  { key: 'delivery', icon: Truck, path: '/deliveries', modes: ['PRODUCT'] },
  { key: 'loyalty', icon: Heart, path: '/loyalty', modes: ['PRODUCT'] },
  { key: 'pos', icon: Monitor, path: '/pos', modes: ['PRODUCT'] },
  // Service mode
  { key: 'projects', icon: FolderKanban, path: '/projects', modes: ['SERVICE'] },
  { key: 'services', icon: Package, path: '/services', modes: ['SERVICE'] },
  { key: 'recurring', icon: RefreshCw, path: '/recurring', modes: ['SERVICE'] },
  // All plans
  { key: 'clients', icon: Users, path: '/clients' },
  { key: 'invoices', icon: FileText, path: '/invoices' },
  { key: 'expenses', icon: TrendingDown, path: '/expenses' },
  { key: 'suppliers', icon: Building2, path: '/suppliers', plans: ['SHOP', 'BUSINESS'] },
  { key: 'employees', icon: UserCog, path: '/employees', plans: ['SHOP', 'BUSINESS'] },
  { key: 'stores', icon: Store, path: '/stores', plans: ['BUSINESS'] },
  { key: 'reports', icon: BarChart3, path: '/reports', plans: ['SHOP', 'BUSINESS'] },
  { key: 'ai-reports', icon: Sparkles, path: '/ai-reports', plans: ['BUSINESS'] },
  { key: 'billing', icon: CreditCard, path: '/billing' },
  { key: 'settings', icon: Settings, path: '/settings' },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const { t } = useTranslation();
  const location = useLocation();
  const tenant = useAuthStore((s) => s.tenant);
  const businessMode = tenant?.businessMode || 'PRODUCT';

  const filteredItems = navItems.filter((item) => {
    if (item.plans && !(tenant && item.plans.includes(tenant.plan))) return false;
    if (item.modes && !item.modes.includes(businessMode)) return false;
    return true;
  });

  return (
    <>
      {/* Overlay for mobile */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-50 h-screen bg-sidebar border-r border-sidebar-border flex flex-col transition-transform duration-300 ease-in-out',
          'w-72 lg:w-64',
          'lg:translate-x-0 lg:z-40',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo + close button */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="KABRAK Store" className="h-10 object-contain" />
            <p className="text-[10px] text-gold-500 font-semibold tracking-wider">
              {tenant?.plan || 'STORE'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg hover:bg-accent transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
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
                    onClick={onClose}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                      isActive
                        ? 'bg-kabrak-500 text-white shadow-md'
                        : 'text-sidebar-foreground hover:bg-accent'
                    )}
                  >
                    <Icon className="w-5 h-5 shrink-0" />
                    <span>{t(`nav.${item.key}`)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Business mode badge */}
        <div className="p-3 border-t border-sidebar-border">
          <div className={cn(
            'text-center text-xs font-medium py-1.5 rounded-lg',
            businessMode === 'SERVICE'
              ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300'
              : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
          )}>
            {businessMode === 'SERVICE' ? 'Services & Clients' : 'Vente & Commandes'}
          </div>
        </div>
      </aside>
    </>
  );
}
