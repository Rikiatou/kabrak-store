import { Link, useLocation } from 'react-router-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/i18n/useTranslation';
import { useAuthStore } from '@/stores/authStore';
import { canAccess } from '@/lib/modules';
import { ORDER_BASED_CATEGORIES, navItemsFor } from '@/lib/navItems';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const { t, language } = useTranslation();
  const fr = language === 'fr';
  const location = useLocation();
  const tenant = useAuthStore((s) => s.tenant);
  const user = useAuthStore((s) => s.user);
  const businessMode = tenant?.businessMode || 'PRODUCT';
  const isOrderBased = !!(tenant?.businessCategories?.length &&
    tenant.businessCategories.every((cat) => ORDER_BASED_CATEGORIES.has(cat)));
  const filteredItems = navItemsFor(tenant).filter((item) => item.key === 'guide' || canAccess(user, item.key));

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
            <img src={tenant?.logo || '/logo.png'} alt={tenant?.name || 'KABRAK Store'} className="h-10 object-contain" />
            <p className="text-[10px] text-amber-500 font-semibold tracking-wider">
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
                (item.path !== '/' && location.pathname.startsWith(item.path + '/'));
              const Icon = item.icon;

              return (
                <li key={item.key}>
                  <Link
                    to={item.path}
                    onClick={onClose}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                      isActive
                        ? 'bg-blue-600 text-white shadow-md'
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
              : isOrderBased
                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
          )}>
            {businessMode === 'SERVICE' ? (fr ? 'Services & Clients' : 'Services & Clients') : isOrderBased ? (fr ? 'Sur commande' : 'Order-based') : (fr ? 'Vente & Commandes' : 'Sales & Orders')}
          </div>
        </div>
      </aside>
    </>
  );
}
