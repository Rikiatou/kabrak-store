import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from '@/i18n/useTranslation';
import { formatCurrency } from '@/lib/utils';
import { BarChart3, TrendingUp, DollarSign, ShoppingCart, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';

interface SalesReport {
  totalRevenue: number;
  totalProfit: number;
  totalOrders: number;
  salesByPeriod: Array<{ period: string; revenue: number; orders: number; profit: number }>;
  topSellers: Array<{ name: string; revenue: number; orders: number }>;
}

export function ReportsPage() {
  const { t } = useTranslation();
  const [report, setReport] = useState<SalesReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/reports/sales')
      .then((res) => setReport(res.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('nav.reports')}</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => exportData('orders')}>
            <Download className="w-4 h-4 mr-1" /> Commandes
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportData('clients')}>
            <Download className="w-4 h-4 mr-1" /> Clients
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportData('products')}>
            <Download className="w-4 h-4 mr-1" /> Produits
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-kabrak-500">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-kabrak-100 dark:bg-kabrak-900/30 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-kabrak-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Revenus (30j)</p>
              <p className="text-2xl font-bold">{formatCurrency(report?.totalRevenue || 0)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-gold-500">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gold-100 dark:bg-gold-600/20 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-gold-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Bénéfices (30j)</p>
              <p className="text-2xl font-bold">{formatCurrency(report?.totalProfit || 0)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <ShoppingCart className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Commandes (30j)</p>
              <p className="text-2xl font-bold">{report?.totalOrders || 0}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sales by period */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" /> Ventes par période
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
                      <div className="bg-kabrak-500 h-full rounded-full flex items-center justify-end px-2 transition-all" style={{ width: `${Math.max(width, 5)}%` }}>
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
          <CardHeader><CardTitle>Meilleures vendeuses/vendeurs</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {report.topSellers.map((seller, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-gold-100 dark:bg-gold-600/20 flex items-center justify-center text-sm font-bold text-gold-600">{i + 1}</span>
                    <span className="font-medium">{seller.name}</span>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{formatCurrency(seller.revenue)}</p>
                    <p className="text-xs text-muted-foreground">{seller.orders} commandes</p>
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
