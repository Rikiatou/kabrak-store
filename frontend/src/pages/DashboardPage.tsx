import { useEffect, useState } from 'react';
import { useTranslation } from '@/i18n/useTranslation';
import { useAuthStore } from '@/stores/authStore';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { ShoppingCart, DollarSign, Package, Users, AlertTriangle, TrendingUp, FolderKanban, FileText, RefreshCw, Calendar, Truck, Plus, TrendingDown, Globe, Copy } from 'lucide-react';
import api from '@/lib/api';

interface DashboardData {
  todayOrders: number;
  todayRevenue: number;
  totalProducts: number;
  totalClients: number;
  lowStockProducts: Array<{ id: string; name: string; totalStock: number; lowStockAlert: number }>;
  recentOrders: Array<{
    id: string; reference: string; finalAmount: number; paymentStatus: string;
    status: string; createdAt: string;
    client?: { name: string } | null;
    createdBy: { firstName: string; lastName: string };
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
  icon: any;
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
    icon: any;
    gradient: string;
    isCurrency?: boolean;
  }>;
  primaryAction: { label: { fr: string; en: string }; icon: any; href: string; gradient: string };
}> = {
  // Boutique & Commerce
  CLOTHING: {
    statCards: [
      { key: 'todayOrders', label: { fr: 'Ventes du jour', en: 'Today Sales' }, icon: ShoppingCart, gradient: 'from-blue-500 to-blue-600' },
      { key: 'todayRevenue', label: { fr: 'Revenus du jour', en: 'Today Revenue' }, icon: DollarSign, gradient: 'from-amber-500 to-amber-600', isCurrency: true },
      { key: 'totalProducts', label: { fr: 'Produits', en: 'Products' }, icon: Package, gradient: 'from-emerald-500 to-emerald-600' },
      { key: 'totalClients', label: { fr: 'Clientes', en: 'Clients' }, icon: Users, gradient: 'from-violet-500 to-violet-600' },
    ],
    primaryAction: { label: { fr: 'Nouvelle vente', en: 'New Sale' }, icon: Plus, href: '/orders', gradient: 'from-blue-500 to-blue-600' },
  },
  // Vente en Ligne (WhatsApp, etc.)
  WHATSAPP_SELLER: {
    statCards: [
      { key: 'todayOrders', label: { fr: 'Commandes du jour', en: 'Today Orders' }, icon: ShoppingCart, gradient: 'from-blue-500 to-blue-600' },
      { key: 'upcomingDeliveries', label: { fr: 'Livraisons en attente', en: 'Pending Deliveries' }, icon: Truck, gradient: 'from-orange-500 to-orange-600' },
      { key: 'todayRevenue', label: { fr: 'Paiements reçus', en: 'Payments Received' }, icon: DollarSign, gradient: 'from-amber-500 to-amber-600', isCurrency: true },
      { key: 'totalClients', label: { fr: 'Clients', en: 'Clients' }, icon: Users, gradient: 'from-violet-500 to-violet-600' },
    ],
    primaryAction: { label: { fr: 'Nouvelle commande', en: 'New Order' }, icon: Plus, href: '/orders', gradient: 'from-blue-500 to-blue-600' },
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
      { key: 'todayRevenue', label: { fr: 'Revenus du jour', en: 'Today Revenue' }, icon: DollarSign, gradient: 'from-amber-500 to-amber-600', isCurrency: true },
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
      { key: 'todayRevenue', label: { fr: 'Revenus du jour', en: 'Today Revenue' }, icon: DollarSign, gradient: 'from-amber-500 to-amber-600', isCurrency: true },
      { key: 'totalProducts', label: { fr: 'Stock faible', en: 'Low Stock' }, icon: Package, gradient: 'from-red-500 to-red-600' },
      { key: 'totalClients', label: { fr: 'Clients', en: 'Clients' }, icon: Users, gradient: 'from-violet-500 to-violet-600' },
    ],
    primaryAction: { label: { fr: 'Caisse rapide (POS)', en: 'Fast POS' }, icon: ShoppingCart, href: '/pos', gradient: 'from-emerald-500 to-emerald-600' },
  },
  // Grossistes
  WHOLESALE: {
    statCards: [
      { key: 'todayOrders', label: { fr: 'Ventes du jour', en: 'Today Sales' }, icon: ShoppingCart, gradient: 'from-blue-500 to-blue-600' },
      { key: 'todayRevenue', label: { fr: 'Revenus du jour', en: 'Today Revenue' }, icon: DollarSign, gradient: 'from-amber-500 to-amber-600', isCurrency: true },
      { key: 'totalProducts', label: { fr: 'Stock global', en: 'Total Stock' }, icon: Package, gradient: 'from-emerald-500 to-emerald-600' },
      { key: 'totalClients', label: { fr: 'Clients', en: 'Clients' }, icon: Users, gradient: 'from-violet-500 to-violet-600' },
    ],
    primaryAction: { label: { fr: 'Nouvelle vente grossiste', en: 'New Wholesale Sale' }, icon: ShoppingCart, href: '/orders', gradient: 'from-blue-600 to-blue-700' },
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
  const plan = tenant?.plan || 'STORE';
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

  const getPeriodDates = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (period) {
      case 'today':
        return { from: today.toISOString(), to: new Date(today.getTime() + 86400000).toISOString() };
      case 'week':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        return { from: weekStart.toISOString(), to: new Date(weekStart.getTime() + 7 * 86400000).toISOString() };
      case 'month':
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        return { from: monthStart.toISOString(), to: new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString() };
      case 'year':
        const yearStart = new Date(now.getFullYear(), 0, 1);
        return { from: yearStart.toISOString(), to: new Date(now.getFullYear() + 1, 0, 1).toISOString() };
      default:
        return { from: today.toISOString(), to: new Date(today.getTime() + 86400000).toISOString() };
    }
  };

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
      }).catch(console.error).finally(() => setLoading(false));
    }
  }, [businessMode, period]);

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
      {/* Welcome */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className={`h-1 w-full bg-gradient-to-r ${isService ? 'from-violet-500 to-violet-600' : 'from-blue-500 to-blue-600'}`} />
        <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {tenant?.logo ? (
              <img src={tenant.logo} alt={tenant.name} className="h-10 w-10 rounded-lg object-contain border border-gray-100 dark:border-gray-700" />
            ) : (
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center text-white font-bold text-base bg-gradient-to-br ${isService ? 'from-violet-500 to-violet-600' : 'from-blue-500 to-blue-600'}`}>
                {(tenant?.name || user?.firstName || '?')[0].toUpperCase()}
              </div>
            )}
            <div>
              <p className="font-bold text-gray-900 dark:text-white text-base">
                {language === 'fr' ? 'Bonjour' : 'Hello'}, {user?.firstName} 👋
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {new Date().toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long' })}
                {isService && <span className="ml-2 bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-300 px-1.5 py-0.5 rounded text-[10px] font-medium">Services</span>}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {tenant?.slug && (
              <>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/storefront/${tenant.slug}`);
                    alert(language === 'fr' ? 'Lien copié !' : 'Link copied!');
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
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-opacity hover:opacity-90 bg-gradient-to-r ${isService ? 'from-violet-500 to-violet-600' : 'from-blue-500 to-blue-600'}`}
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
            return (
              <div key={card.key} className="bg-white dark:bg-gray-800 rounded-xl p-3 sm:p-4 border-l-4 border border-gray-100 dark:border-gray-700" style={{ borderLeftColor: `var(--stat-accent)` }}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wide font-medium truncate">{label}</p>
                  <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${card.gradient} flex items-center justify-center`}>
                    <Icon className="w-3.5 h-3.5 text-white" />
                  </div>
                </div>
                <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                  {card.isCurrency ? formatCurrency(value) : value}
                </p>
              </div>
            );
          })
        ) : useAdaptiveDashboard && categoryConfig ? (
          categoryConfig.statCards.map((card) => {
            const Icon = card.icon;
            const value = productData?.[card.key as keyof DashboardData] as number || 0;
            const label = card.label[language as 'fr' | 'en'];
            return (
              <div key={card.key} className="bg-white dark:bg-gray-800 rounded-xl p-3 sm:p-4 border-l-4 border border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wide font-medium truncate">{label}</p>
                  <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${card.gradient} flex items-center justify-center`}>
                    <Icon className="w-3.5 h-3.5 text-white" />
                  </div>
                </div>
                <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{card.isCurrency ? formatCurrency(value) : value}</p>
              </div>
            );
          })
        ) : (
          (plan === 'SHOP' ? shopStatCards : plan === 'BUSINESS' ? businessStatCards : productStatCards).map((card) => {
            const Icon = card.icon;
            let value: number;
            if (card.key === 'profit') {
              value = productData?.totalGrossMargin ?? 0;
            } else {
              value = productData?.[card.key as keyof DashboardData] as number || 0;
            }
            const isNegative = card.isProfit && value < 0;
            return (
              <div key={card.key} className={`bg-white dark:bg-gray-800 rounded-xl p-3 sm:p-4 border-l-4 border border-gray-100 dark:border-gray-700 ${isNegative ? 'border-l-red-400' : ''}`}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wide font-medium truncate">{card.labelKey ? t(card.labelKey) : (card.label?.[language as 'fr' | 'en'] ?? '')}</p>
                  <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${card.gradient} flex items-center justify-center`}>
                    <Icon className="w-3.5 h-3.5 text-white" />
                  </div>
                </div>
                <p className={`text-xl sm:text-2xl font-bold ${isNegative ? 'text-red-500' : 'text-gray-900 dark:text-white'}`}>
                  {card.isCurrency ? formatCurrency(value) : value}
                </p>
              </div>
            );
          })
        )}
      </div>

      {/* Primary Action Button (Adaptive) */}
      {useAdaptiveDashboard && categoryConfig && (
        <a href={categoryConfig.primaryAction.href} className={`block w-full bg-gradient-to-r ${categoryConfig.primaryAction.gradient} text-white rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-lg hover:opacity-90 transition-all`}>
          <div className="flex items-center justify-center gap-3">
            <categoryConfig.primaryAction.icon className="w-5 h-5 sm:w-6 sm:h-6" />
            <span className="font-bold text-base sm:text-lg">{categoryConfig.primaryAction.label[language as 'fr' | 'en']}</span>
          </div>
        </a>
      )}

      {/* Content area */}
      {isService ? (
        /* Service Dashboard */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
            <div className="p-3 sm:p-5 pb-2 sm:pb-3 border-b border-gray-50 dark:border-gray-700">
              <h2 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white flex items-center gap-2">
                <FolderKanban className="w-4 h-4 text-violet-500" />
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
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm flex items-center gap-2 mb-4">
                <RefreshCw className="w-4 h-4 text-violet-500" />
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
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
            <div className="p-3 sm:p-5 pb-2 sm:pb-3 border-b border-gray-50 dark:border-gray-700">
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
                        {order.client?.name || (language === 'fr' ? 'Anonyme' : 'Anonymous')} · {formatDateTime(order.createdAt)}
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
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
              <div className="p-5 pb-3 border-b border-gray-50 dark:border-gray-700">
                <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 text-sm">
                  <TrendingUp className="w-4 h-4 text-amber-500" />
                  {language === 'fr' ? 'Ventes par produit' : 'Sales by Product'}
                </h2>
              </div>
              <div className="p-5 pt-3">
                <div className="space-y-3">
                  {productData?.topProducts?.length ? productData.topProducts.map((tp, i) => (
                    <div key={tp.product?.id || i} className="p-3 rounded-xl bg-gray-50 dark:bg-gray-700/30">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2.5">
                          <span className="w-6 h-6 rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center text-xs font-bold text-amber-600">
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

            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
              <div className="p-5 pb-3 border-b border-gray-50 dark:border-gray-700">
                <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 text-sm">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
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
