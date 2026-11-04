import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { LoadingState } from '@/components/ui/spinner';
import { useTranslation } from '@/i18n/useTranslation';
import { useAuthStore } from '@/stores/authStore';
import { cn, formatCurrency } from '@/lib/utils';
import { getErrorMessage } from '@/lib/errors';
import { downloadFile } from '@/lib/download';
import { BarChart3, TrendingUp, DollarSign, ShoppingCart, Download, FolderKanban, FileText, Trophy, type LucideIcon } from 'lucide-react';
import api from '@/lib/api';

interface SalesReport {
  totalRevenue: number;
  totalProfit: number;
  totalOrders: number;
  salesByPeriod: Array<{ period: string; revenue: number; orders: number; profit: number }>;
  topSellers: Array<{ name: string; revenue: number; orders: number }>;
}

interface ServiceReport {
  totalProjects: number;
  activeProjects: number;
  totalRevenue: number;
  totalPending: number;
  projects: Array<{
    id: string; name: string; status: string; totalBudget: number;
    amountPaid: number; amountRemaining: number;
    client?: { name: string } | null;
  }>;
}

function StatCard({ icon: Icon, label, value, tone }: { icon: LucideIcon; label: string; value: string | number; tone: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4">
        <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-lg', tone)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm text-muted-foreground">{label}</p>
          <p className="truncate text-xl font-bold sm:text-2xl">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

const TONES = {
  primary: 'bg-primary/10 text-primary',
  gold: 'bg-gold-100 text-gold-600 dark:bg-gold-500/15 dark:text-gold-400',
  green: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
  amber: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
};

export function ReportsPage() {
  const { t } = useTranslation();
  const tenant = useAuthStore((s) => s.tenant);
  const businessMode = tenant?.businessMode || 'PRODUCT';
  const [report, setReport] = useState<SalesReport | null>(null);
  const [serviceReport, setServiceReport] = useState<ServiceReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const onError = (err: unknown) => toast.error(getErrorMessage(err, t('common.loadError')));
    if (businessMode === 'SERVICE') {
      api.get('/projects')
        .then((res) => {
          const projects = res.data.data || [];
          const active = projects.filter((p: { status: string }) => p.status === 'ACTIVE');
          const totalRevenue = projects.reduce((s: number, p: { amountPaid: number }) => s + (p.amountPaid || 0), 0);
          const totalPending = projects.reduce((s: number, p: { amountRemaining: number }) => s + (p.amountRemaining || 0), 0);
          setServiceReport({ totalProjects: projects.length, activeProjects: active.length, totalRevenue, totalPending, projects });
        })
        .catch(onError)
        .finally(() => setLoading(false));
    } else {
      api.get('/reports/sales')
        .then((res) => setReport(res.data.data))
        .catch(onError)
        .finally(() => setLoading(false));
    }
  }, [businessMode, t]);

  const exportData = async (type: string) => {
    try {
      await downloadFile(`/exports/${type}`, `${type}-${Date.now()}.csv`);
    } catch (err) {
      toast.error(getErrorMessage(err, t('common.exportError')));
    }
  };

  if (loading) return <LoadingState />;

  if (businessMode === 'SERVICE') {
    return (
      <div className="space-y-6">
        <PageHeader
          title={t('nav.reports')}
          actions={
            <Button variant="outline" size="sm" onClick={() => exportData('clients')}>
              <Download className="mr-1.5 h-4 w-4" /> {t('reports.exportClients')}
            </Button>
          }
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={FolderKanban} tone={TONES.primary} label={t('reports.totalProjects')} value={serviceReport?.totalProjects || 0} />
          <StatCard icon={FolderKanban} tone={TONES.gold} label={t('reports.activeProjects')} value={serviceReport?.activeProjects || 0} />
          <StatCard icon={DollarSign} tone={TONES.green} label={t('reports.revenueReceived')} value={formatCurrency(serviceReport?.totalRevenue || 0)} />
          <StatCard icon={FileText} tone={TONES.amber} label={t('reports.pendingPayments')} value={formatCurrency(serviceReport?.totalPending || 0)} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FolderKanban className="h-5 w-5 text-muted-foreground" /> {t('reports.allProjects')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {serviceReport?.projects?.length ? (
              <div className="space-y-2">
                {serviceReport.projects.map((project) => (
                  <div key={project.id} className="flex flex-col gap-2 rounded-lg bg-muted/50 p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{project.name}</p>
                      <p className="text-xs text-muted-foreground">{project.client?.name || t('dashboard.noClient')}</p>
                    </div>
                    <div className="sm:text-right">
                      <p className="font-bold">{formatCurrency(project.totalBudget)}</p>
                      <div className="flex gap-3 text-xs">
                        <span className="text-success">{t('reports.paid')} : {formatCurrency(project.amountPaid)}</span>
                        <span className="text-warning">{t('reports.due')} : {formatCurrency(project.amountRemaining)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">{t('reports.noProjects')}</p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const maxRevenue = Math.max(0, ...(report?.salesByPeriod || []).map((p) => p.revenue));

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('nav.reports')}
        actions={<>
          <Button variant="outline" size="sm" onClick={() => exportData('orders')}>
            <Download className="mr-1.5 h-4 w-4" /> {t('reports.exportOrders')}
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportData('clients')}>
            <Download className="mr-1.5 h-4 w-4" /> {t('reports.exportClients')}
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportData('products')}>
            <Download className="mr-1.5 h-4 w-4" /> {t('reports.exportProducts')}
          </Button>
        </>}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard icon={DollarSign} tone={TONES.primary} label={t('reports.revenue30')} value={formatCurrency(report?.totalRevenue || 0)} />
        <StatCard icon={TrendingUp} tone={TONES.gold} label={t('reports.profit30')} value={formatCurrency(report?.totalProfit || 0)} />
        <StatCard icon={ShoppingCart} tone={TONES.green} label={t('reports.orders30')} value={report?.totalOrders || 0} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-5 w-5 text-muted-foreground" /> {t('reports.salesByPeriod')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {report?.salesByPeriod.length ? (
            <div className="space-y-3">
              {report.salesByPeriod.map((period) => {
                const width = maxRevenue > 0 ? (period.revenue / maxRevenue) * 100 : 0;
                return (
                  <div key={period.period} className="grid grid-cols-[4.5rem_1fr_auto] items-center gap-3">
                    <span className="truncate text-xs text-muted-foreground">{period.period}</span>
                    <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.max(width, 2)}%` }} />
                    </div>
                    <span className="text-right text-xs font-medium tabular-nums">
                      {formatCurrency(period.revenue)}
                      <span className="ml-2 text-muted-foreground" title={t('reports.ordersCount')}>· {period.orders}</span>
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">{t('reports.noSales')}</p>
          )}
        </CardContent>
      </Card>

      {report?.topSellers && report.topSellers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="h-5 w-5 text-muted-foreground" /> {t('reports.topSellers')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {report.topSellers.map((seller, i) => (
                <div key={i} className="flex items-center justify-between gap-3 rounded-lg bg-muted/50 p-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-background text-sm font-semibold">{i + 1}</span>
                    <span className="truncate font-medium">{seller.name}</span>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-bold">{formatCurrency(seller.revenue)}</p>
                    <p className="text-xs text-muted-foreground">{seller.orders} {t('reports.orders')}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
