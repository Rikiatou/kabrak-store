import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from '@/i18n/useTranslation';
import { useAuthStore } from '@/stores/authStore';
import { formatCurrency } from '@/lib/utils';
import { BarChart3, TrendingUp, DollarSign, ShoppingCart, Download, FolderKanban, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

export function ReportsPage() {
  const { t, language } = useTranslation();
  const tenant = useAuthStore((s) => s.tenant);
  const businessMode = tenant?.businessMode || 'PRODUCT';
  const [report, setReport] = useState<SalesReport | null>(null);
  const [serviceReport, setServiceReport] = useState<ServiceReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('day');
  const [customRange, setCustomRange] = useState<{ from: string; to: string } | null>(null);

  const fetchReport = () => {
    if (businessMode === 'SERVICE') {
      api.get('/projects')
        .then((res) => {
          const projects = res.data.data || [];
          const active = projects.filter((p: { status: string }) => p.status === 'ACTIVE');
          const totalRevenue = projects.reduce((s: number, p: { amountPaid: number }) => s + (p.amountPaid || 0), 0);
          const totalPending = projects.reduce((s: number, p: { amountRemaining: number }) => s + (p.amountRemaining || 0), 0);
          setServiceReport({ totalProjects: projects.length, activeProjects: active.length, totalRevenue, totalPending, projects });
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    } else {
      const params: any = { groupBy: period };
      if (customRange) {
        params.from = customRange.from;
        params.to = customRange.to;
      }
      api.get('/reports/sales', { params })
        .then((res) => setReport(res.data.data))
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  };

  useEffect(() => {
    fetchReport();
  }, [businessMode, period, customRange]);

  const exportData = async (type: string) => {
    try {
      const res = await api.get(`/exports/${type}`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-kabrak-500" /></div>;
  }

  if (businessMode === 'SERVICE') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold dark:text-white">{t('nav.reports')}</h1>
          <Button variant="outline" size="sm" onClick={() => exportData('clients')}>
            <Download className="w-4 h-4 mr-1" /> Clients
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-violet-500">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                <FolderKanban className="w-6 h-6 text-violet-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{language === 'fr' ? 'Total Projets' : 'Total Projects'}</p>
                <p className="text-2xl font-bold dark:text-white">{serviceReport?.totalProjects || 0}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <FolderKanban className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{language === 'fr' ? 'Projets Actifs' : 'Active Projects'}</p>
                <p className="text-2xl font-bold dark:text-white">{serviceReport?.activeProjects || 0}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{language === 'fr' ? 'Revenus Reçus' : 'Revenue Received'}</p>
                <p className="text-2xl font-bold dark:text-white">{formatCurrency(serviceReport?.totalRevenue || 0)}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-amber-500">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <FileText className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{language === 'fr' ? 'Paiements en Attente' : 'Pending Payments'}</p>
                <p className="text-2xl font-bold dark:text-white">{formatCurrency(serviceReport?.totalPending || 0)}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Projects list */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 dark:text-white">
              <FolderKanban className="w-5 h-5 text-violet-500" />
              {language === 'fr' ? 'Tous les projets' : 'All Projects'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {serviceReport?.projects?.length ? (
              <div className="space-y-2">
                {serviceReport.projects.map((project) => (
                  <div key={project.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium dark:text-white">{project.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {project.client?.name || (language === 'fr' ? 'Pas de client' : 'No client')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold dark:text-white">{formatCurrency(project.totalBudget)}</p>
                      <div className="flex gap-2 text-xs">
                        <span className="text-green-600">{language === 'fr' ? 'Reçu' : 'Paid'}: {formatCurrency(project.amountPaid)}</span>
                        <span className="text-amber-600">{language === 'fr' ? 'Reste' : 'Due'}: {formatCurrency(project.amountRemaining)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-8">{t('common.noResults')}</p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // PRODUCT mode reports
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold dark:text-white">{t('nav.reports')}</h1>
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            <Button
              variant={period === 'day' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => { setPeriod('day'); setCustomRange(null); }}
              className="text-xs"
            >
              {language === 'fr' ? 'Jour' : 'Day'}
            </Button>
            <Button
              variant={period === 'week' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => { setPeriod('week'); setCustomRange(null); }}
              className="text-xs"
            >
              {language === 'fr' ? 'Semaine' : 'Week'}
            </Button>
            <Button
              variant={period === 'month' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => { setPeriod('month'); setCustomRange(null); }}
              className="text-xs"
            >
              {language === 'fr' ? 'Mois' : 'Month'}
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={() => exportData('orders')}>
            <Download className="w-4 h-4 mr-1" /> {language === 'fr' ? 'Commandes' : 'Orders'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportData('clients')}>
            <Download className="w-4 h-4 mr-1" /> Clients
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportData('products')}>
            <Download className="w-4 h-4 mr-1" /> {language === 'fr' ? 'Produits' : 'Products'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{language === 'fr' ? 'Revenus (30j)' : 'Revenue (30d)'}</p>
              <p className="text-2xl font-bold dark:text-white">{formatCurrency(report?.totalRevenue || 0)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-600/20 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{language === 'fr' ? 'Bénéfices (30j)' : 'Profit (30d)'}</p>
              <p className="text-2xl font-bold dark:text-white">{formatCurrency(report?.totalProfit || 0)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <ShoppingCart className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{language === 'fr' ? 'Commandes (30j)' : 'Orders (30d)'}</p>
              <p className="text-2xl font-bold dark:text-white">{report?.totalOrders || 0}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sales by period */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 dark:text-white">
            <BarChart3 className="w-5 h-5" /> {language === 'fr' ? 'Ventes par période' : 'Sales by period'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {report?.salesByPeriod.length ? (
            <div className="space-y-2">
              {report.salesByPeriod.map((period) => {
                const maxRevenue = Math.max(...report.salesByPeriod.map((p) => p.revenue));
                const width = maxRevenue > 0 ? (period.revenue / maxRevenue) * 100 : 0;
                return (
                  <div key={period.period} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-20 shrink-0">{period.period}</span>
                    <div className="flex-1 bg-muted rounded-full h-6 overflow-hidden">
                      <div className="bg-blue-600 h-full rounded-full flex items-center justify-end px-2 transition-all" style={{ width: `${Math.max(width, 5)}%` }}>
                        <span className="text-white text-xs font-medium">{formatCurrency(period.revenue)}</span>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground w-8 text-right">{period.orders}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm text-center py-8">{t('common.noResults')}</p>
          )}
        </CardContent>
      </Card>

      {/* Top sellers */}
      {report?.topSellers && report.topSellers.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="dark:text-white">{language === 'fr' ? 'Meilleures vendeuses/vendeurs' : 'Top sellers'}</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {report.topSellers.map((seller, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-600/20 flex items-center justify-center text-sm font-bold text-amber-600">{i + 1}</span>
                    <span className="font-medium dark:text-white">{seller.name}</span>
                  </div>
                  <div className="text-right">
                    <p className="font-bold dark:text-white">{formatCurrency(seller.revenue)}</p>
                    <p className="text-xs text-muted-foreground">{seller.orders} {language === 'fr' ? 'commandes' : 'orders'}</p>
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
