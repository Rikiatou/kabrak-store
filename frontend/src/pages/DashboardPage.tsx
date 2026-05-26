import { useEffect, useState } from 'react';
import { useTranslation } from '@/i18n/useTranslation';
import { useAuthStore } from '@/stores/authStore';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { ShoppingCart, DollarSign, Package, Users, AlertTriangle, TrendingUp, FolderKanban, FileText, RefreshCw, Calendar, Truck, Plus, TrendingDown } from 'lucide-react';
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
  pendingDeposits?: number;
  unpaidInvoices?: number;
}

interface ExpensesSummary {
  totalExpenses: number;
  totalRevenue: number;
  profit: number;
  margin: number;
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

const productStatCards = [
  { key: 'todayOrders', labelKey: 'dashboard.todaySales', icon: ShoppingCart, gradient: 'from-blue-500 to-blue-600' },
  { key: 'todayRevenue', labelKey: 'dashboard.todayRevenue', icon: DollarSign, gradient: 'from-amber-500 to-amber-600', isCurrency: true },
  { key: 'profit', labelKey: 'dashboard.profit', icon: TrendingDown, gradient: 'from-green-500 to-green-600', isCurrency: true, isProfit: true },
  { key: 'totalClients', labelKey: 'dashboard.totalClients', icon: Users, gradient: 'from-violet-500 to-violet-600' },
];

const serviceStatCards = [
  { key: 'activeProjects', label: { fr: 'Projets actifs', en: 'Active Projects' }, icon: FolderKanban, gradient: 'from-violet-500 to-violet-600' },
  { key: 'totalRevenue', label: { fr: 'Revenus totaux', en: 'Total Revenue' }, icon: DollarSign, gradient: 'from-amber-500 to-amber-600', isCurrency: true },
  { key: 'totalProjects', label: { fr: 'Total projets', en: 'Total Projects' }, icon: FileText, gradient: 'from-blue-500 to-blue-600' },
  { key: 'totalClients', labelKey: 'dashboard.totalClients', icon: Users, gradient: 'from-emerald-500 to-emerald-600' },
];

export function DashboardPage() {
  const { t, language } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const tenant = useAuthStore((s) => s.tenant);
  const businessMode = tenant?.businessMode || 'PRODUCT';
  const businessCategories = tenant?.businessCategories || [];

  // Detect primary category for adaptive dashboard
  const primaryCategory = businessCategories[0] as string;
  const categoryConfig = primaryCategory ? categoryDashboards[primaryCategory] : null;
  const useAdaptiveDashboard = !!categoryConfig && businessMode === 'PRODUCT';

  const [productData, setProductData] = useState<DashboardData | null>(null);
  const [serviceData, setServiceData] = useState<ServiceDashboardData | null>(null);
  const [expensesSummary, setExpensesSummary] = useState<ExpensesSummary | null>(null);
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
    }
  };

  useEffect(() => {
    const dates = getPeriodDates();
    if (businessMode === 'SERVICE') {
      Promise.all([
        api.get('/projects?limit=5').catch(() => ({ data: { data: [], pagination: { total: 0 } } })),
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
        api.get('/expenses/summary', { params: dates }).catch(() => ({ data: { data: null } })),
      ]).then(([dashRes, expRes]) => {
        setProductData(dashRes.data.data);
        setExpensesSummary(expRes.data.data);
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
  const welcomeGradient = isService
    ? 'from-violet-600 to-violet-700'
    : 'from-blue-600 to-blue-700';
  const welcomeShadow = isService ? 'shadow-violet-200/50' : 'shadow-blue-200/50';

  return (
    <div className="space-y-4 sm:space-y-6 max-w-7xl mx-auto">
      {/* Welcome */}
      <div className={`bg-gradient-to-r ${welcomeGradient} rounded-xl sm:rounded-2xl p-4 sm:p-6 text-white shadow-lg ${welcomeShadow}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {tenant?.logo && (
              <img src={tenant.logo} alt={tenant.name} className="h-12 w-12 rounded-lg object-contain bg-white/20 p-1" />
            )}
            <div>
              <h1 className="text-base sm:text-xl font-bold">
                {t('dashboard.welcome')}, {user?.firstName}
              </h1>
              <p className="text-white/70 text-sm mt-1">
                {new Date().toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                {isService && (
                  <span className="ml-2 bg-white/20 px-2 py-0.5 rounded-full text-xs">
                    {language === 'fr' ? 'Mode Services' : 'Service Mode'}
                  </span>
                )}
              </p>
            </div>
          </div>
          {!isService && (
            <div className="flex items-center gap-1 bg-white/20 rounded-lg p-1">
              {(['today', 'week', 'month', 'year'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    period === p ? 'bg-white text-blue-600' : 'text-white/80 hover:bg-white/10'
                  }`}
                >
                  {language === 'fr' 
                    ? { today: 'Aujourd\'hui', week: 'Semaine', month: 'Mois', year: 'Année' }[p]
                    : { today: 'Today', week: 'Week', month: 'Month', year: 'Year' }[p]
                  }
                </button>
              ))}
            </div>
          )}
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
              <div key={card.key} className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl p-3 sm:p-5 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center shadow-sm`}>
                    <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </div>
                </div>
                <p className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white truncate">
                  {card.isCurrency ? formatCurrency(value) : value}
                </p>
                <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5 sm:mt-1 truncate">{label}</p>
              </div>
            );
          })
        ) : useAdaptiveDashboard && categoryConfig ? (
          categoryConfig.statCards.map((card) => {
            const Icon = card.icon;
            const value = productData?.[card.key as keyof DashboardData] as number || 0;
            const label = card.label[language as 'fr' | 'en'];
            return (
              <div key={card.key} className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl p-3 sm:p-5 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center shadow-sm`}>
                    <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </div>
                </div>
                <p className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white truncate">
                  {card.isCurrency ? formatCurrency(value) : value}
                </p>
                <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5 sm:mt-1 truncate">{label}</p>
              </div>
            );
          })
        ) : (
          productStatCards.map((card) => {
            const Icon = card.icon;
            let value: number;
            if (card.key === 'profit') {
              value = productData?.totalGrossMargin ?? 0;
            } else {
              value = productData?.[card.key as keyof DashboardData] as number || 0;
            }
            const isNegative = card.isProfit && value < 0;
            return (
              <div key={card.key} className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl p-3 sm:p-5 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center shadow-sm`}>
                    <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </div>
                </div>
                <p className={`text-lg sm:text-2xl font-bold truncate ${isNegative ? 'text-red-500' : 'text-gray-900 dark:text-white'}`}>
                  {card.isCurrency ? formatCurrency(value) : value}
                </p>
                <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5 sm:mt-1 truncate">{t(card.labelKey)}</p>
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
                        {t(`status.${project.status.toLowerCase()}`)}
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
                <a href="/projects" className="block p-3 rounded-xl bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300 text-sm font-medium hover:bg-violet-100 dark:hover:bg-violet-900/30 transition-colors">
                  + {language === 'fr' ? 'Nouveau projet' : 'New project'}
                </a>
                <a href="/services" className="block p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
                  + {language === 'fr' ? 'Nouveau service' : 'New service'}
                </a>
                <a href="/invoices" className="block p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 text-sm font-medium hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors">
                  + {language === 'fr' ? 'Nouvelle facture' : 'New invoice'}
                </a>
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
                  <div key={order.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <div>
                      <p className="font-medium text-sm text-gray-900 dark:text-white">{order.reference}</p>
                      <p className="text-xs text-gray-400">
                        {order.client?.name || (language === 'fr' ? 'Client anonyme' : 'Anonymous client')} · {formatDateTime(order.createdAt)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sm text-gray-900 dark:text-white">{formatCurrency(order.finalAmount)}</p>
                      <span className={`inline-block text-[10px] font-medium px-2 py-0.5 rounded-full mt-1 ${statusColors[order.paymentStatus] || 'bg-gray-100 text-gray-600'}`}>
                        {t(`status.${order.paymentStatus.toLowerCase()}`)}
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
                  {productData?.lowStockProducts?.length ? productData.lowStockProducts.map((product) => (
                    <div key={product.id} className="flex items-center justify-between">
                      <span className="text-sm text-gray-700 dark:text-gray-300 truncate max-w-[140px]">{product.name}</span>
                      <span className="text-xs font-medium bg-amber-50 dark:bg-amber-900/20 text-amber-600 px-2.5 py-1 rounded-full">
                        {product.totalStock} {language === 'fr' ? 'restant(s)' : 'left'}
                      </span>
                    </div>
                  )) : (
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
