import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from '@/i18n/useTranslation';
import { useAuthStore } from '@/stores/authStore';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { ShoppingCart, DollarSign, Package, Users, AlertTriangle, TrendingUp } from 'lucide-react';
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

const statusColors: Record<string, 'default' | 'success' | 'warning' | 'destructive'> = {
  PENDING: 'warning', CONFIRMED: 'default', PREPARING: 'default',
  READY: 'success', DELIVERING: 'default', DELIVERED: 'success', CANCELLED: 'destructive',
  PAID: 'success', PARTIAL: 'warning',
};

export function DashboardPage() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/reports/dashboard')
      .then((res) => setData(res.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-kabrak-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold">
          {t('dashboard.welcome')}, {user?.firstName} 👋
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-kabrak-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('dashboard.todaySales')}</p>
                <p className="text-3xl font-bold">{data?.todayOrders || 0}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-kabrak-100 dark:bg-kabrak-900/30 flex items-center justify-center">
                <ShoppingCart className="w-6 h-6 text-kabrak-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-gold-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('dashboard.todayRevenue')}</p>
                <p className="text-3xl font-bold">{formatCurrency(data?.todayRevenue || 0)}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-gold-100 dark:bg-gold-600/20 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-gold-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('dashboard.totalProducts')}</p>
                <p className="text-3xl font-bold">{data?.totalProducts || 0}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <Package className="w-6 h-6 text-emerald-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-violet-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('dashboard.totalClients')}</p>
                <p className="text-3xl font-bold">{data?.totalClients || 0}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                <Users className="w-6 h-6 text-violet-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              {t('dashboard.recentOrders')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data?.recentOrders?.length ? data.recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                  <div>
                    <p className="font-medium text-sm">{order.reference}</p>
                    <p className="text-xs text-muted-foreground">
                      {order.client?.name || 'Client anonyme'} · {formatDateTime(order.createdAt)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatCurrency(order.finalAmount)}</p>
                    <Badge variant={statusColors[order.paymentStatus] || 'default'} className="text-[10px]">
                      {t(`status.${order.paymentStatus.toLowerCase()}`)}
                    </Badge>
                  </div>
                </div>
              )) : (
                <p className="text-muted-foreground text-sm text-center py-8">{t('common.noResults')}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Side panels */}
        <div className="space-y-6">
          {/* Top Products */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="w-5 h-5 text-gold-500" />
                {t('dashboard.topProducts')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data?.topProducts?.length ? data.topProducts.map((tp, i) => (
                  <div key={tp.product?.id || i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-gold-100 dark:bg-gold-600/20 flex items-center justify-center text-xs font-bold text-gold-600">
                        {i + 1}
                      </span>
                      <span className="text-sm font-medium truncate max-w-[140px]">{tp.product?.name || '—'}</span>
                    </div>
                    <span className="text-sm font-semibold">{formatCurrency(tp.totalRevenue || 0)}</span>
                  </div>
                )) : (
                  <p className="text-muted-foreground text-sm text-center py-4">{t('common.noResults')}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Low Stock */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                {t('dashboard.lowStock')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data?.lowStockProducts?.length ? data.lowStockProducts.map((product) => (
                  <div key={product.id} className="flex items-center justify-between">
                    <span className="text-sm truncate max-w-[160px]">{product.name}</span>
                    <Badge variant="warning">{product.totalStock} restant(s)</Badge>
                  </div>
                )) : (
                  <p className="text-muted-foreground text-sm text-center py-4">{t('common.noResults')}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
