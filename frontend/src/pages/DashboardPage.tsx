import { useEffect, useState } from 'react';
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
};

const statCards = [
  { key: 'todayOrders', labelKey: 'dashboard.todaySales', icon: ShoppingCart, gradient: 'from-blue-500 to-blue-600', bg: 'bg-blue-50', text: 'text-blue-600' },
  { key: 'todayRevenue', labelKey: 'dashboard.todayRevenue', icon: DollarSign, gradient: 'from-amber-500 to-amber-600', bg: 'bg-amber-50', text: 'text-amber-600', isCurrency: true },
  { key: 'totalProducts', labelKey: 'dashboard.totalProducts', icon: Package, gradient: 'from-emerald-500 to-emerald-600', bg: 'bg-emerald-50', text: 'text-emerald-600' },
  { key: 'totalClients', labelKey: 'dashboard.totalClients', icon: Users, gradient: 'from-violet-500 to-violet-600', bg: 'bg-violet-50', text: 'text-violet-600' },
];

export function DashboardPage() {
  const { t, language } = useTranslation();
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
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-200 border-t-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Welcome */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-6 text-white shadow-lg shadow-blue-200/50">
        <h1 className="text-xl font-bold">
          {t('dashboard.welcome')}, {user?.firstName}
        </h1>
        <p className="text-blue-100 text-sm mt-1">
          {new Date().toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          const value = data?.[card.key as keyof DashboardData] as number || 0;
          return (
            <div key={card.key} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center shadow-sm`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {card.isCurrency ? formatCurrency(value) : value}
              </p>
              <p className="text-xs text-gray-400 mt-1">{t(card.labelKey)}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="p-5 pb-3 border-b border-gray-50">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-gray-400" />
              {t('dashboard.recentOrders')}
            </h2>
          </div>
          <div className="p-5 pt-3">
            <div className="space-y-2">
              {data?.recentOrders?.length ? data.recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors">
                  <div>
                    <p className="font-medium text-sm text-gray-900">{order.reference}</p>
                    <p className="text-xs text-gray-400">
                      {order.client?.name || (language === 'fr' ? 'Client anonyme' : 'Anonymous client')} · {formatDateTime(order.createdAt)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-sm text-gray-900">{formatCurrency(order.finalAmount)}</p>
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

        {/* Side panels */}
        <div className="space-y-6">
          {/* Top Products */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="p-5 pb-3 border-b border-gray-50">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2 text-sm">
                <TrendingUp className="w-4 h-4 text-amber-500" />
                {t('dashboard.topProducts')}
              </h2>
            </div>
            <div className="p-5 pt-3">
              <div className="space-y-3">
                {data?.topProducts?.length ? data.topProducts.map((tp, i) => (
                  <div key={tp.product?.id || i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-lg bg-amber-50 flex items-center justify-center text-xs font-bold text-amber-600">
                        {i + 1}
                      </span>
                      <span className="text-sm text-gray-700 truncate max-w-[130px]">{tp.product?.name || '—'}</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">{formatCurrency(tp.totalRevenue || 0)}</span>
                  </div>
                )) : (
                  <p className="text-gray-400 text-sm text-center py-4">{t('common.noResults')}</p>
                )}
              </div>
            </div>
          </div>

          {/* Low Stock */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="p-5 pb-3 border-b border-gray-50">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2 text-sm">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                {t('dashboard.lowStock')}
              </h2>
            </div>
            <div className="p-5 pt-3">
              <div className="space-y-3">
                {data?.lowStockProducts?.length ? data.lowStockProducts.map((product) => (
                  <div key={product.id} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700 truncate max-w-[140px]">{product.name}</span>
                    <span className="text-xs font-medium bg-amber-50 text-amber-600 px-2.5 py-1 rounded-full">
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
    </div>
  );
}
