import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingState } from '@/components/ui/spinner';
import { useTranslation } from '@/i18n/useTranslation';
import { useAuthStore } from '@/stores/authStore';
import { cn, formatCurrency, formatDateTime } from '@/lib/utils';
import { getErrorMessage } from '@/lib/errors';
import {
  ShoppingCart, DollarSign, Package, Users, AlertTriangle, TrendingUp, FolderKanban, FileText,
  Zap, Plus, ArrowRight, Briefcase, type LucideIcon,
} from 'lucide-react';
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
    product: { id: string; name: string; sellingPrice: number } | null;
    totalQuantity: number | null; totalRevenue: number | null;
  }>;
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

const statusVariant: Record<string, 'success' | 'warning' | 'default' | 'secondary' | 'destructive'> = {
  PENDING: 'warning', PARTIAL: 'warning', ON_HOLD: 'warning',
  PAID: 'success', COMPLETED: 'success', DELIVERED: 'success', READY: 'success',
  ACTIVE: 'default', CONFIRMED: 'default', PREPARING: 'default', DELIVERING: 'default',
  DRAFT: 'secondary', CANCELLED: 'destructive',
};

interface StatCard { key: string; labelKey: string; icon: LucideIcon; tone: string; isCurrency?: boolean }

const productStatCards: StatCard[] = [
  { key: 'todayOrders', labelKey: 'dashboard.todaySales', icon: ShoppingCart, tone: 'bg-primary/10 text-primary' },
  { key: 'todayRevenue', labelKey: 'dashboard.todayRevenue', icon: DollarSign, tone: 'bg-gold-100 text-gold-600 dark:bg-gold-500/15 dark:text-gold-400', isCurrency: true },
  { key: 'totalProducts', labelKey: 'dashboard.totalProducts', icon: Package, tone: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400' },
  { key: 'totalClients', labelKey: 'dashboard.totalClients', icon: Users, tone: 'bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300' },
];

const serviceStatCards: StatCard[] = [
  { key: 'activeProjects', labelKey: 'dashboard.activeProjects', icon: FolderKanban, tone: 'bg-primary/10 text-primary' },
  { key: 'totalRevenue', labelKey: 'dashboard.totalRevenue', icon: DollarSign, tone: 'bg-gold-100 text-gold-600 dark:bg-gold-500/15 dark:text-gold-400', isCurrency: true },
  { key: 'totalProjects', labelKey: 'dashboard.totalProjects', icon: FileText, tone: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400' },
  { key: 'totalClients', labelKey: 'dashboard.totalClients', icon: Users, tone: 'bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300' },
];

function EmptyLine({ children }: { children: React.ReactNode }) {
  return <p className="py-6 text-center text-sm text-muted-foreground">{children}</p>;
}

export function DashboardPage() {
  const { t, language } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const tenant = useAuthStore((s) => s.tenant);
  const businessMode = tenant?.businessMode || 'PRODUCT';
  const isService = businessMode === 'SERVICE';

  const [productData, setProductData] = useState<DashboardData | null>(null);
  const [serviceData, setServiceData] = useState<ServiceDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenant) return;
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
      api.get('/reports/dashboard')
        .then((res) => setProductData(res.data.data))
        .catch((err) => toast.error(getErrorMessage(err, t('common.loadError'))))
        .finally(() => setLoading(false));
    }
  }, [tenant, businessMode, t]);

  if (loading) return <LoadingState />;

  const cards = isService ? serviceStatCards : productStatCards;
  const data = (isService ? serviceData : productData) as unknown as Record<string, number> | null;

  const quickActions = isService
    ? [
        { to: '/projects', label: t('dashboard.newProject'), icon: FolderKanban },
        { to: '/services', label: t('dashboard.newService'), icon: Briefcase },
        { to: '/invoices', label: t('dashboard.newInvoice'), icon: FileText },
      ]
    : [
        { to: '/pos', label: t('dashboard.newSale'), icon: ShoppingCart },
        { to: '/products', label: t('dashboard.addProduct'), icon: Package },
        { to: '/clients', label: t('clients.addClient'), icon: Users },
      ];

  return (
    <div className="mx-auto max-w-7xl space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
            {t('dashboard.welcome')}, {user?.firstName}
          </h1>
          <p className="mt-1 text-sm capitalize text-muted-foreground">
            {new Date().toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        {isService && <Badge variant="secondary" className="self-start sm:self-auto">{t('dashboard.serviceMode')}</Badge>}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 sm:gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          const value = data?.[card.key] || 0;
          return (
            <Card key={card.key}>
              <CardContent className="p-4 sm:p-5">
                <div className={cn('mb-3 flex h-9 w-9 items-center justify-center rounded-lg sm:h-10 sm:w-10', card.tone)}>
                  <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <p className="truncate text-lg font-bold sm:text-2xl">{card.isCurrency ? formatCurrency(value) : value}</p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">{t(card.labelKey)}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 sm:gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b p-4 sm:px-5">
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
              {isService ? <FolderKanban className="h-4 w-4 text-muted-foreground" /> : <ShoppingCart className="h-4 w-4 text-muted-foreground" />}
              {isService ? t('dashboard.recentProjects') : t('dashboard.recentOrders')}
            </CardTitle>
            <Link to={isService ? '/projects' : '/orders'} className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
              {t('dashboard.viewAll')} <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent className="p-2 sm:p-3">
            {isService ? (
              serviceData?.projects?.length ? serviceData.projects.map((project) => (
                <div key={project.id} className="flex items-center justify-between gap-3 rounded-lg p-3 transition-colors hover:bg-accent/50">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{project.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{project.client?.name || t('dashboard.noClient')}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold">{formatCurrency(project.totalBudget)}</p>
                    <Badge variant={statusVariant[project.status] || 'secondary'} className="mt-1 text-[10px]">
                      {t(`status.${project.status === 'ON_HOLD' ? 'onHold' : project.status.toLowerCase()}`)}
                    </Badge>
                  </div>
                </div>
              )) : <EmptyLine>{t('dashboard.noProjects')}</EmptyLine>
            ) : (
              productData?.recentOrders?.length ? productData.recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between gap-3 rounded-lg p-3 transition-colors hover:bg-accent/50">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{order.reference}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {order.client?.name || t('common.anonymousClient')} · {formatDateTime(order.createdAt)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold">{formatCurrency(order.finalAmount)}</p>
                    <Badge variant={statusVariant[order.paymentStatus] || 'secondary'} className="mt-1 text-[10px]">
                      {t(`status.${order.paymentStatus.toLowerCase()}`)}
                    </Badge>
                  </div>
                </div>
              )) : <EmptyLine>{t('dashboard.noRecentOrders')}</EmptyLine>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4 sm:space-y-6">
          <Card>
            <CardHeader className="border-b p-4 sm:px-5">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Zap className="h-4 w-4 text-muted-foreground" /> {t('dashboard.quickActions')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 p-2 sm:p-3">
              {quickActions.map(({ to, label, icon: Icon }) => (
                <Link key={to} to={to} className="flex items-center gap-3 rounded-lg p-3 text-sm font-medium transition-colors hover:bg-accent">
                  <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary"><Icon className="h-4 w-4" /></span>
                  <span className="flex-1">{label}</span>
                  <Plus className="h-4 w-4 text-muted-foreground" />
                </Link>
              ))}
            </CardContent>
          </Card>

          {!isService && (
            <>
              <Card>
                <CardHeader className="border-b p-4 sm:px-5">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" /> {t('dashboard.topProducts')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 p-4 sm:px-5">
                  {productData?.topProducts?.length ? productData.topProducts.map((tp, i) => (
                    <div key={tp.product?.id || i} className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-semibold">{i + 1}</span>
                        <span className="truncate text-sm">{tp.product?.name || '—'}</span>
                      </div>
                      <span className="shrink-0 text-sm font-semibold">{formatCurrency(tp.totalRevenue || 0)}</span>
                    </div>
                  )) : <EmptyLine>{t('dashboard.noTopProducts')}</EmptyLine>}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="border-b p-4 sm:px-5">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <AlertTriangle className="h-4 w-4 text-warning" /> {t('dashboard.lowStock')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 p-4 sm:px-5">
                  {productData?.lowStockProducts?.length ? productData.lowStockProducts.map((product) => (
                    <div key={product.id} className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm">{product.name}</span>
                      <Badge variant="warning" className="shrink-0">{product.totalStock} {t('dashboard.left')}</Badge>
                    </div>
                  )) : <EmptyLine>{t('dashboard.noLowStock')}</EmptyLine>}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
