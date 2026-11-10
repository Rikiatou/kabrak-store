import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from '@/i18n/useTranslation';
import { useAuthStore } from '@/stores/authStore';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { ShoppingCart, DollarSign, Package, Users, AlertTriangle, TrendingUp, FolderKanban, FileText, RefreshCw, Calendar, Truck, Plus, TrendingDown, Globe, Copy, Monitor, PackagePlus, UserPlus, Receipt, HandCoins, ClipboardCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { DrawerStatusCard } from '@/components/CashDrawer';
import { StatTile } from '@/components/StatTile';
import { canSeeCosts } from '@/lib/modules';
import { OfflineAlerts } from '@/components/OfflineBanner';
import { storefrontAccess } from '@/lib/storefront';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface DashboardData {
  todayOrders: number;
  todayRevenue: number;
  todaySales?: number;
  netProfit?: number;
  totalProducts: number;
  totalClients: number;
  lowStockProducts: Array<{ id: string; name: string; totalStock: number; lowStockAlert: number }>;
  recentOrders: Array<{
    id: string; reference: string; finalAmount: number; discount?: number; paymentStatus: string;
    status: string; createdAt: string;
    client?: { name: string } | null;
    createdBy: { firstName: string; lastName: string };
    seller?: { firstName: string; lastName: string } | null;
  }>;
  topProducts: Array<{
    product: { id: string; name: string; sellingPrice: number; totalStock?: number; costPrice?: number } | null;
    totalQuantity: number | null; totalRevenue: number | null; totalCost?: number; grossMargin?: number;
  }>;
  totalGrossMargin?: number;
  upcomingDeliveries?: number;
  unpaidInvoices?: number;
  unpaidAmount?: number;
}

interface ServiceDashboardData {
  totalProjects: number;
  activeProjects: number;
  totalClients: number;
  totalRevenue: number;
  projects: Array<{
    id: string; name: string; status: string; totalBudget: number;
    amountPaid: number; amountRemaining: number;
    client?: { name: string } | null;
  }>;
}

interface StatCard {
  key: string;
  labelKey?: string;
  label?: { fr: string; en: string };
  icon: typeof ShoppingCart;
  gradient: string;
  isCurrency?: boolean;
  isProfit?: boolean;
}


const statusColors: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  CONFIRMED: 'bg-blue-100 text-blue-700',
  PREPARING: 'bg-blue-100 text-blue-700',
  READY: 'bg-green-100 text-green-700',
  DELIVERING: 'bg-blue-100 text-blue-700',
  DELIVERED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
  PAID: 'bg-green-100 text-green-700',
  PARTIAL: 'bg-amber-100 text-amber-700',
  ACTIVE: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-green-100 text-green-700',
  DRAFT: 'bg-gray-100 text-gray-600',
  ON_HOLD: 'bg-amber-100 text-amber-700',
};

// Category-based dashboard configurations
const categoryDashboards: Record<string, {
  statCards: Array<{
    key: string;
    label: { fr: string; en: string };
    icon: typeof ShoppingCart;
    gradient: string;
    isCurrency?: boolean;
  }>;
  primaryAction: { label: { fr: string; en: string }; icon: typeof ShoppingCart; href: string; gradient: string };
}> = {
  // Boutique & Commerce
  CLOTHING: {
    statCards: [
      { key: 'todayOrders', label: { fr: 'Ventes du jour', en: 'Today Sales' }, icon: ShoppingCart, gradient: 'from-blue-500 to-blue-600' },
      { key: 'todayRevenue', label: { fr: 'Encaissé du jour', en: 'Received today' }, icon: DollarSign, gradient: 'from-amber-500 to-amber-600', isCurrency: true },
      { key: 'totalProducts', label: { fr: 'Produits', en: 'Products' }, icon: Package, gradient: 'from-emerald-500 to-emerald-600' },
      { key: 'totalClients', label: { fr: 'Clientes', en: 'Clients' }, icon: Users, gradient: 'from-violet-500 to-violet-600' },
    ],
    primaryAction: { label: { fr: 'Nouvelle vente', en: 'New Sale' }, icon: Plus, href: '/pos', gradient: 'from-blue-500 to-blue-600' },
  },
  // Commandes & Livraison (Food, Événementiel)
  CAKES: {
    statCards: [
      { key: 'todayOrders', label: { fr: 'Commandes du jour', en: 'Today Orders' }, icon: ShoppingCart, gradient: 'from-blue-500 to-blue-600' },
      { key: 'upcomingDeliveries', label: { fr: 'Livraisons cette semaine', en: 'This Week Deliveries' }, icon: Calendar, gradient: 'from-purple-500 to-purple-600' },
      { key: 'pendingDeposits', label: { fr: 'Acomptes reçus', en: 'Deposits Received' }, icon: DollarSign, gradient: 'from-amber-500 to-amber-600', isCurrency: true },
      { key: 'unpaidInvoices', label: { fr: 'Restes à payer', en: 'Remaining Balance' }, icon: AlertTriangle, gradient: 'from-red-500 to-red-600', isCurrency: true },
    ],
    primaryAction: { label: { fr: 'Nouvelle commande', en: 'New Order' }, icon: Plus, href: '/orders', gradient: 'from-purple-500 to-purple-600' },
  },
  FOOD_BUSINESS: {
    statCards: [
      { key: 'todayOrders', label: { fr: 'Commandes du jour', en: 'Today Orders' }, icon: ShoppingCart, gradient: 'from-blue-500 to-blue-600' },
      { key: 'upcomingDeliveries', label: { fr: 'Livraisons en attente', en: 'Pending Deliveries' }, icon: Truck, gradient: 'from-orange-500 to-orange-600' },
      { key: 'todayRevenue', label: { fr: 'Encaissé du jour', en: 'Received today' }, icon: DollarSign, gradient: 'from-amber-500 to-amber-600', isCurrency: true },
      { key: 'totalClients', label: { fr: 'Clients', en: 'Clients' }, icon: Users, gradient: 'from-violet-500 to-violet-600' },
    ],
    primaryAction: { label: { fr: 'Nouvelle commande', en: 'New Order' }, icon: Plus, href: '/orders', gradient: 'from-orange-500 to-orange-600' },
  },
  // Événementiel & Décoration
  EVENT_DECORATION: {
    statCards: [
      { key: 'todayOrders', label: { fr: 'Événements à venir', en: 'Upcoming Events' }, icon: Calendar, gradient: 'from-purple-500 to-purple-600' },
      { key: 'pendingDeposits', label: { fr: 'Acomptes reçus', en: 'Deposits Received' }, icon: DollarSign, gradient: 'from-amber-500 to-amber-600', isCurrency: true },
      { key: 'unpaidInvoices', label: { fr: 'Restes à payer', en: 'Remaining Balance' }, icon: AlertTriangle, gradient: 'from-red-500 to-red-600', isCurrency: true },
      { key: 'totalClients', label: { fr: 'Clients', en: 'Clients' }, icon: Users, gradient: 'from-violet-500 to-violet-600' },
    ],
    primaryAction: { label: { fr: 'Nouvelle réservation', en: 'New Reservation' }, icon: Plus, href: '/orders', gradient: 'from-purple-500 to-purple-600' },
  },
  // Traiteur & Gastronomie
  CATERING: {
    statCards: [
      { key: 'todayOrders', label: { fr: 'Événements à venir', en: 'Upcoming Events' }, icon: Calendar, gradient: 'from-purple-500 to-purple-600' },
      { key: 'pendingDeposits', label: { fr: 'Acomptes reçus', en: 'Deposits Received' }, icon: DollarSign, gradient: 'from-amber-500 to-amber-600', isCurrency: true },
      { key: 'unpaidInvoices', label: { fr: 'Restes à payer', en: 'Remaining Balance' }, icon: AlertTriangle, gradient: 'from-red-500 to-red-600', isCurrency: true },
      { key: 'totalClients', label: { fr: 'Clients', en: 'Clients' }, icon: Users, gradient: 'from-violet-500 to-violet-600' },
    ],
    primaryAction: { label: { fr: 'Nouvelle réservation', en: 'New Reservation' }, icon: Plus, href: '/orders', gradient: 'from-purple-500 to-purple-600' },
  },
  // Commerce Général (Mini-market)
  MINI_MARKET: {
    statCards: [
      { key: 'todayOrders', label: { fr: 'Ventes du jour', en: 'Today Sales' }, icon: ShoppingCart, gradient: 'from-blue-500 to-blue-600' },
      { key: 'todayRevenue', label: { fr: 'Encaissé du jour', en: 'Received today' }, icon: DollarSign, gradient: 'from-amber-500 to-amber-600', isCurrency: true },
      { key: 'totalProducts', label: { fr: 'Stock faible', en: 'Low Stock' }, icon: Package, gradient: 'from-red-500 to-red-600' },
      { key: 'totalClients', label: { fr: 'Clients', en: 'Clients' }, icon: Users, gradient: 'from-violet-500 to-violet-600' },
    ],
    primaryAction: { label: { fr: 'Caisse rapide (POS)', en: 'Fast POS' }, icon: ShoppingCart, href: '/pos', gradient: 'from-emerald-500 to-emerald-600' },
  },
  // Grossistes
  WHOLESALE: {
    statCards: [
      { key: 'todayOrders', label: { fr: 'Ventes du jour', en: 'Today Sales' }, icon: ShoppingCart, gradient: 'from-blue-500 to-blue-600' },
      { key: 'todayRevenue', label: { fr: 'Encaissé du jour', en: 'Received today' }, icon: DollarSign, gradient: 'from-amber-500 to-amber-600', isCurrency: true },
      { key: 'totalProducts', label: { fr: 'Stock global', en: 'Total Stock' }, icon: Package, gradient: 'from-emerald-500 to-emerald-600' },
      { key: 'totalClients', label: { fr: 'Clients', en: 'Clients' }, icon: Users, gradient: 'from-violet-500 to-violet-600' },
    ],
    primaryAction: { label: { fr: 'Nouvelle vente grossiste', en: 'New Wholesale Sale' }, icon: ShoppingCart, href: '/pos', gradient: 'from-blue-600 to-blue-700' },
  },
};

const productStatCards: StatCard[] = [
  { key: 'todayOrders', labelKey: 'dashboard.todaySales', icon: ShoppingCart, gradient: 'from-blue-500 to-blue-600', isProfit: false },
  { key: 'todayRevenue', labelKey: 'dashboard.todayRevenue', icon: DollarSign, gradient: 'from-amber-500 to-amber-600', isCurrency: true, isProfit: false },
  { key: 'totalClients', labelKey: 'dashboard.totalClients', icon: Users, gradient: 'from-violet-500 to-violet-600', isProfit: false },
  { key: 'totalProducts', labelKey: 'dashboard.totalProducts', icon: Package, gradient: 'from-emerald-500 to-emerald-600', isProfit: false },
];

const shopStatCards: StatCard[] = [
  { key: 'todayOrders', labelKey: 'dashboard.todaySales', icon: ShoppingCart, gradient: 'from-blue-500 to-blue-600', isProfit: false },
  { key: 'todayRevenue', labelKey: 'dashboard.todayRevenue', icon: DollarSign, gradient: 'from-amber-500 to-amber-600', isCurrency: true, isProfit: false },
  { key: 'profit', labelKey: 'dashboard.profit', icon: TrendingDown, gradient: 'from-green-500 to-green-600', isCurrency: true, isProfit: true },
  { key: 'totalClients', labelKey: 'dashboard.totalClients', icon: Users, gradient: 'from-violet-500 to-violet-600', isProfit: false },
];

const businessStatCards: StatCard[] = [
  { key: 'todayOrders', labelKey: 'dashboard.todaySales', icon: ShoppingCart, gradient: 'from-blue-500 to-blue-600', isProfit: false },
  { key: 'todayRevenue', labelKey: 'dashboard.todayRevenue', icon: DollarSign, gradient: 'from-amber-500 to-amber-600', isCurrency: true, isProfit: false },
  { key: 'profit', labelKey: 'dashboard.profit', icon: TrendingDown, gradient: 'from-green-500 to-green-600', isCurrency: true, isProfit: true },
  { key: 'totalClients', labelKey: 'dashboard.totalClients', icon: Users, gradient: 'from-violet-500 to-violet-600', isProfit: false },
];

const serviceStatCards: StatCard[] = [
  { key: 'activeProjects', label: { fr: 'Projets actifs', en: 'Active Projects' }, icon: FolderKanban, gradient: 'from-violet-500 to-violet-600' },
  { key: 'totalRevenue', label: { fr: 'Revenus totaux', en: 'Total Revenue' }, icon: DollarSign, gradient: 'from-amber-500 to-amber-600', isCurrency: true },
  { key: 'totalProjects', label: { fr: 'Total projets', en: 'Total Projects' }, icon: FileText, gradient: 'from-blue-500 to-blue-600' },
  { key: 'totalClients', labelKey: 'dashboard.totalClients', icon: Users, gradient: 'from-emerald-500 to-emerald-600' },
];

export function DashboardPage() {
  const { t, language } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const tenant = useAuthStore((s) => s.tenant);
  const storefront = storefrontAccess(useAuthStore((s) => s.subscription));
  const plan = tenant?.plan || 'STORE';
  const showCosts = canSeeCosts(useAuthStore((s) => s.user));
  const businessMode = tenant?.businessMode || 'PRODUCT';
  const businessCategories = tenant?.businessCategories || [];

  // Detect primary category for adaptive dashboard
  const primaryCategory = businessCategories[0] as string;
  const categoryConfig = primaryCategory ? categoryDashboards[primaryCategory] : null;
  const useAdaptiveDashboard = !!categoryConfig && businessMode === 'PRODUCT';

  const [productData, setProductData] = useState<DashboardData | null>(null);
  const [serviceData, setServiceData] = useState<ServiceDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'year'>('today');

  const getPeriodDates = useCallback(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (period) {
      case 'today':
        return { from: today.toISOString(), to: new Date(today.getTime() + 86400000).toISOString() };
      case 'week': {
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        return { from: weekStart.toISOString(), to: new Date(weekStart.getTime() + 7 * 86400000).toISOString() };
      }
      case 'month': {
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        return { from: monthStart.toISOString(), to: new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString() };
      }
      case 'year': {
        const yearStart = new Date(now.getFullYear(), 0, 1);
        return { from: yearStart.toISOString(), to: new Date(now.getFullYear() + 1, 0, 1).toISOString() };
      }
      default:
        return { from: today.toISOString(), to: new Date(today.getTime() + 86400000).toISOString() };
    }
  }, [period]);

  useEffect(() => {
    const dates = getPeriodDates();
    if (businessMode === 'SERVICE') {
      Promise.all([
        api.get('/projects?limit=100').catch(() => ({ data: { data: [], pagination: { total: 0 } } })),
        api.get('/clients?limit=1').catch(() => ({ data: { pagination: { total: 0 } } })),
      ]).then(([projectsRes, clientsRes]) => {
        const projects = projectsRes.data.data || [];
        const activeProjects = projects.filter((p: { status: string }) => p.status === 'ACTIVE');
        const totalRevenue = projects.reduce((sum: number, p: { amountPaid: number }) => sum + (p.amountPaid || 0), 0);
        setServiceData({
          totalProjects: projectsRes.data.pagination?.total || projects.length,
          activeProjects: activeProjects.length,
          totalClients: clientsRes.data.pagination?.total || 0,
          totalRevenue,
          projects,
        });
      }).finally(() => setLoading(false));
    } else {
      Promise.all([
        api.get('/reports/dashboard', { params: dates }).catch(() => ({ data: { data: null } })),
      ]).then(([dashRes]) => {
        setProductData(dashRes.data.data);
      }).finally(() => setLoading(false));
    }
  }, [businessMode, getPeriodDates]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-200 border-t-blue-600" />
      </div>
    );
  }

  const isService = businessMode === 'SERVICE';

  return (
    <div className="space-y-4 sm:space-y-6 max-w-7xl mx-auto">
      {!isService && <OfflineAlerts />}
      {/* Welcome */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {tenant?.logo ? (
              <img src={tenant.logo} alt={tenant.name} className="h-10 w-10 rounded-lg object-contain border border-gray-100 dark:border-gray-700" />
            ) : (
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center text-white font-semibold text-base ${isService ? 'bg-violet-600' : 'bg-blue-600'}`}>
                {(tenant?.name || user?.firstName || '?')[0].toUpperCase()}
              </div>
            )}
            <div>
              <p className="font-bold text-gray-900 dark:text-white text-base">
                {language === 'fr' ? 'Bonjour' : 'Hello'}, {user?.firstName}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {new Date().toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long' })}
                {isService && <span className="ml-2 bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-300 px-1.5 py-0.5 rounded text-[10px] font-medium">Services</span>}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {tenant?.slug && storefront === 'locked' && (
              <Link
                to="/billing"
                title={language === 'fr' ? 'La vitrine en ligne est réservée à l’offre BUSINESS' : 'The online storefront is a BUSINESS feature'}
                className="flex items-center gap-1.5 border border-amber-300 bg-amber-50 text-amber-700 px-3 py-1.5 rounded-lg text-xs font-medium"
              >
                <Globe className="w-3 h-3" />
                {language === 'fr' ? 'Vitrine : offre BUSINESS' : 'Storefront: BUSINESS plan'}
              </Link>
            )}
            {tenant?.slug && storefront !== 'locked' && (
              <>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/storefront/${tenant.slug}`);
                    toast.success(language === 'fr' ? 'Lien copié !' : 'Link copied!');
                  }}
                  className="flex items-center gap-1.5 border border-gray-200 dark:border-gray-600 hover:border-blue-300 px-3 py-1.5 rounded-lg text-xs text-gray-600 dark:text-gray-300 font-medium transition-colors"
                >
                  <Copy className="w-3 h-3" />
                  {language === 'fr' ? 'Copier vitrine' : 'Copy link'}
                </button>
                <a
                  href={`/storefront/${tenant.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-colors ${isService ? 'bg-violet-600 hover:bg-violet-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                >
                  <Globe className="w-3 h-3" />
                  {language === 'fr' ? 'Ma vitrine' : 'Storefront'}
                </a>
              </>
            )}
            {!isService && (
              <div className="flex items-center gap-0.5 bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5">
                {(['today', 'week', 'month', 'year'] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                      period === p
                        ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                    }`}
                  >
                    {language === 'fr'
                      ? { today: 'Auj.', week: 'Sem.', month: 'Mois', year: 'An' }[p]
                      : { today: 'Today', week: 'Week', month: 'Month', year: 'Year' }[p]
                    }
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        {isService ? (
          serviceStatCards.map((card) => {
            const Icon = card.icon;
            const value = serviceData?.[card.key as keyof ServiceDashboardData] as number || 0;
            const label = card.labelKey ? t(card.labelKey) : (card.label?.[language as 'fr' | 'en'] || '');
            return <StatTile key={card.key} label={label} icon={Icon} value={card.isCurrency ? formatCurrency(value) : String(value)} />;
          })
        ) : useAdaptiveDashboard && categoryConfig ? (
          categoryConfig.statCards.map((card) => {
            const Icon = card.icon;
            const value = productData?.[card.key as keyof DashboardData] as number || 0;
            const label = card.label[language as 'fr' | 'en'];
            const sub = card.key === 'todayOrders' && productData ? `${formatCurrency(productData.todaySales ?? 0)} ${language === 'fr' ? 'de ventes' : 'in sales'}` : undefined;
            return <StatTile key={card.key} label={label} icon={Icon} sub={sub} value={card.isCurrency ? formatCurrency(value) : String(value)} />;
          })
        ) : (
          (plan === 'SHOP' ? shopStatCards : plan === 'BUSINESS' ? businessStatCards : productStatCards).filter((card) => showCosts || !card.isProfit).map((card) => {
            const Icon = card.icon;
            let value: number;
            if (card.key === 'profit') {
              value = productData?.netProfit ?? productData?.totalGrossMargin ?? 0;
            } else {
              value = productData?.[card.key as keyof DashboardData] as number || 0;
            }
            const isNegative = card.isProfit && value < 0;
            const sub = card.key === 'todayOrders' && productData ? `${formatCurrency(productData.todaySales ?? 0)} ${language === 'fr' ? 'de ventes' : 'in sales'}` : undefined;
            return (
              <StatTile
                key={card.key}
                label={card.labelKey ? t(card.labelKey) : (card.label?.[language as 'fr' | 'en'] ?? '')}
                icon={Icon}
                sub={sub}
                tone={isNegative ? 'text-red-600' : undefined}
                value={card.isCurrency ? formatCurrency(value) : String(value)}
              />
            );
          })
        )}
      </div>

      {/* Primary Action Button (Adaptive) */}
      {useAdaptiveDashboard && categoryConfig && (
        <a href={categoryConfig.primaryAction.href} className="block w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl p-3.5 sm:p-4 transition-colors">
          <div className="flex items-center justify-center gap-2">
            <categoryConfig.primaryAction.icon className="w-5 h-5" />
            <span className="font-semibold text-base">{categoryConfig.primaryAction.label[language as 'fr' | 'en']}</span>
          </div>
        </a>
      )}

      {!isService && <DrawerStatusCard />}

      {/* Quick actions */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {(isService
          ? [
              { to: '/projects', icon: FolderKanban, fr: 'Projet', en: 'Project' },
              { to: '/invoices', icon: FileText, fr: 'Facture', en: 'Invoice' },
              { to: '/clients?new=1', icon: UserPlus, fr: 'Client', en: 'Client' },
              { to: '/expenses?new=1', icon: Receipt, fr: 'Dépense', en: 'Expense' },
              { to: '/debts', icon: HandCoins, fr: 'Dettes', en: 'Debts' },
            ]
          : [
              { to: '/pos', icon: Monitor, fr: 'Vendre', en: 'Sell' },
              { to: '/products?new=1', icon: PackagePlus, fr: 'Produit', en: 'Product' },
              { to: '/clients?new=1', icon: UserPlus, fr: 'Cliente', en: 'Client' },
              { to: '/expenses?new=1', icon: Receipt, fr: 'Dépense', en: 'Expense' },
              { to: '/debts', icon: HandCoins, fr: 'Dettes', en: 'Debts' },
              { to: '/closing', icon: ClipboardCheck, fr: 'Caisse / Z', en: 'Drawer / Z' },
            ]
        ).map((a) => (
          <Link key={a.to} to={a.to} className="flex flex-col items-center justify-center gap-1 rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 text-xs font-medium text-gray-700 dark:text-gray-200 hover:border-blue-300 hover:text-blue-600 transition-colors">
            <a.icon className="w-5 h-5" />
            {language === 'fr' ? a.fr : a.en}
          </Link>
        ))}
      </div>

      {/* Content area */}
      {isService ? (
        /* Service Dashboard */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="p-3 sm:p-5 pb-2 sm:pb-3 border-b border-gray-100 dark:border-gray-700">
              <h2 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white flex items-center gap-2">
                <FolderKanban className="w-4 h-4 text-gray-400" />
                {language === 'fr' ? 'Projets récents' : 'Recent Projects'}
              </h2>
            </div>
            <div className="p-3 sm:p-5 pt-2 sm:pt-3">
              <div className="space-y-2">
                {serviceData?.projects?.length ? serviceData.projects.map((project) => (
                  <div key={project.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <div>
                      <p className="font-medium text-sm text-gray-900 dark:text-white">{project.name}</p>
                      <p className="text-xs text-gray-400">
                        {project.client?.name || (language === 'fr' ? 'Pas de client' : 'No client')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sm text-gray-900 dark:text-white">{formatCurrency(project.totalBudget)}</p>
                      <span className={`inline-block text-[10px] font-medium px-2 py-0.5 rounded-full mt-1 ${statusColors[project.status] || 'bg-gray-100 text-gray-600'}`}>
                        {t(`status.${(project.status || '').toLowerCase()}`)}
                      </span>
                    </div>
                  </div>
                )) : (
                  <p className="text-gray-400 text-sm text-center py-8">{t('common.noResults')}</p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm flex items-center gap-2 mb-4">
                <RefreshCw className="w-4 h-4 text-gray-400" />
                {language === 'fr' ? 'Actions rapides' : 'Quick Actions'}
              </h3>
              <div className="space-y-2">
                {[
                  { href: '/projects', label: language === 'fr' ? 'Nouveau projet' : 'New project', icon: Plus, color: 'text-violet-600 dark:text-violet-400', bg: 'hover:bg-violet-50 dark:hover:bg-violet-900/20' },
                  { href: '/clients', label: language === 'fr' ? 'Nouveau client' : 'New client', icon: Users, color: 'text-blue-600 dark:text-blue-400', bg: 'hover:bg-blue-50 dark:hover:bg-blue-900/20' },
                  { href: '/invoices', label: language === 'fr' ? 'Nouvelle facture' : 'New invoice', icon: FileText, color: 'text-amber-600 dark:text-amber-400', bg: 'hover:bg-amber-50 dark:hover:bg-amber-900/20' },
                ].map(({ href, label, icon: Icon, color, bg }) => (
                  <a key={href} href={href} className={`flex items-center gap-2.5 p-2.5 rounded-lg border border-transparent ${bg} hover:border-gray-100 dark:hover:border-gray-700 transition-all`}>
                    <Icon className={`w-4 h-4 ${color}`} />
                    <span className={`text-sm font-medium ${color}`}>{label}</span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Product Dashboard */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="p-3 sm:p-5 pb-2 sm:pb-3 border-b border-gray-100 dark:border-gray-700">
              <h2 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-gray-400" />
                {t('dashboard.recentOrders')}
              </h2>
            </div>
            <div className="p-3 sm:p-5 pt-2 sm:pt-3">
              <div className="space-y-2">
                {productData?.recentOrders?.length ? productData.recentOrders.map((order) => (
                  <div key={order.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <div className={`w-1 self-stretch rounded-full flex-shrink-0 ${
                      order.paymentStatus === 'PAID' ? 'bg-green-400' :
                      order.paymentStatus === 'PARTIAL' ? 'bg-amber-400' : 'bg-red-300'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-gray-900 dark:text-white">{order.reference}</p>
                      <p className="text-xs text-gray-400 truncate">
                        {order.client?.name || (language === 'fr' ? 'Client de passage' : 'Walk-in customer')} · {formatDateTime(order.createdAt)}
                      </p>
                      <p className="text-xs text-gray-400 truncate">
                        {language === 'fr' ? 'Vendu par' : 'Sold by'} {`${(order.seller ?? order.createdBy).firstName} ${(order.seller ?? order.createdBy).lastName}`.trim()}
                        {order.status === 'CANCELLED' ? (language === 'fr' ? ' · Annulée' : ' · Cancelled') : ''}
                        {order.discount ? <span className="text-red-500"> · {language === 'fr' ? 'remise' : 'discount'} −{formatCurrency(order.discount)}</span> : null}
                      </p>
                    </div>
                    <p className="font-semibold text-sm text-gray-900 dark:text-white flex-shrink-0">{formatCurrency(order.finalAmount)}</p>
                  </div>
                )) : (
                  <p className="text-gray-400 text-sm text-center py-8">{t('common.noResults')}</p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* Alertes livraisons & factures impayées */}
            {((productData?.upcomingDeliveries ?? 0) > 0 || (productData?.unpaidInvoices ?? 0) > 0) && (
              <div className="grid grid-cols-2 gap-3">
                {(productData?.upcomingDeliveries ?? 0) > 0 && (
                  <a href="/deliveries" className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 flex flex-col gap-1 hover:bg-blue-100 transition-colors">
                    <div className="flex items-center gap-1.5">
                      <Truck className="w-4 h-4 text-blue-500" />
                      <span className="text-xs font-medium text-blue-700 dark:text-blue-300">{language === 'fr' ? 'Livraisons' : 'Deliveries'}</span>
                    </div>
                    <span className="text-xl font-bold text-blue-700 dark:text-blue-300">{productData?.upcomingDeliveries}</span>
                    <span className="text-[10px] text-blue-500">{language === 'fr' ? 'en cours' : 'in progress'}</span>
                  </a>
                )}
                {(productData?.unpaidInvoices ?? 0) > 0 && (
                  <a href="/invoices" className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3 flex flex-col gap-1 hover:bg-amber-100 transition-colors">
                    <div className="flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-amber-500" />
                      <span className="text-xs font-medium text-amber-700 dark:text-amber-300">{language === 'fr' ? 'Impayées' : 'Unpaid'}</span>
                    </div>
                    <span className="text-xl font-bold text-amber-700 dark:text-amber-300">{productData?.unpaidInvoices}</span>
                    <span className="text-[10px] text-amber-500">{formatCurrency(productData?.unpaidAmount ?? 0)}</span>
                  </a>
                )}
              </div>
            )}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
              <div className="p-5 pb-3 border-b border-gray-100 dark:border-gray-700">
                <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 text-sm">
                  <TrendingUp className="w-4 h-4 text-gray-400" />
                  {language === 'fr' ? 'Ventes par produit' : 'Sales by Product'}
                </h2>
              </div>
              <div className="p-5 pt-3">
                <div className="space-y-3">
                  {productData?.topProducts?.length ? productData.topProducts.map((tp, i) => (
                    <div key={tp.product?.id || i} className="py-2.5 border-b last:border-0 border-gray-100 dark:border-gray-700">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2.5">
                          <span className="w-6 h-6 rounded-md bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xs font-semibold text-gray-600 dark:text-gray-300">
                            {i + 1}
                          </span>
                          <span className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[140px]">{tp.product?.name || '—'}</span>
                        </div>
                        <span className="text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(tp.totalRevenue || 0)}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500 dark:text-gray-400">
                          {language === 'fr' ? 'Vendu' : 'Sold'}: <span className="font-semibold text-gray-700 dark:text-gray-300">{tp.totalQuantity || 0}</span>
                        </span>
                        <span className="text-gray-500 dark:text-gray-400">
                          {language === 'fr' ? 'Stock' : 'Stock'}: <span className="font-semibold text-gray-700 dark:text-gray-300">{tp.product?.totalStock || 0}</span>
                        </span>
                      </div>
                    </div>
                  )) : (
                    <p className="text-gray-400 text-sm text-center py-4">{t('common.noResults')}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
              <div className="p-5 pb-3 border-b border-gray-100 dark:border-gray-700">
                <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 text-sm">
                  <AlertTriangle className="w-4 h-4 text-gray-400" />
                  {t('dashboard.lowStock')}
                </h2>
              </div>
              <div className="p-5 pt-3">
                <div className="space-y-3">
                  {productData?.lowStockProducts?.length ? productData.lowStockProducts.map((product) => {
                    const pct = Math.min(100, Math.round((product.totalStock / (product.lowStockAlert || 5)) * 100));
                    return (
                      <div key={product.id}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-700 dark:text-gray-300 truncate max-w-[140px]">{product.name}</span>
                          <span className={`text-xs font-bold ${product.totalStock === 0 ? 'text-red-500' : 'text-amber-500'}`}>
                            {product.totalStock}
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-gray-100 dark:bg-gray-700">
                          <div
                            className={`h-1.5 rounded-full transition-all ${product.totalStock === 0 ? 'bg-red-400' : 'bg-amber-400'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  }) : (
                    <p className="text-gray-400 text-sm text-center py-4">{t('common.noResults')}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
