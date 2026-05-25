import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/i18n/useTranslation';
import api from '@/lib/api';
import { RefreshCw, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RecurringBilling {
  id: string;
  amount: number;
  frequency: string;
  nextBillingDate: string;
  isActive: boolean;
  client: { id: string; name: string } | null;
  product: { id: string; name: string } | null;
}

export function RecurringPage() {
  const { t, language } = useTranslation();
  const [items, setItems] = useState<RecurringBilling[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    try {
      const { data } = await api.get('/recurring');
      setItems(data.data);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleToggle = async (item: RecurringBilling) => {
    try {
      await api.put(`/recurring/${item.id}`, { isActive: !item.isActive });
      fetchItems();
    } catch { /* ignore */ }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(language === 'fr' ? 'Supprimer ?' : 'Delete?')) return;
    try {
      await api.delete(`/recurring/${id}`);
      fetchItems();
    } catch { /* ignore */ }
  };

  const formatCurrency = (n: number) => n.toLocaleString('fr-FR') + ' FCFA';
  const formatDate = (d: string) => new Date(d).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US');

  const FREQ_LABELS: Record<string, Record<string, string>> = {
    fr: { weekly: 'Hebdomadaire', monthly: 'Mensuel', quarterly: 'Trimestriel', yearly: 'Annuel' },
    en: { weekly: 'Weekly', monthly: 'Monthly', quarterly: 'Quarterly', yearly: 'Yearly' },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <RefreshCw className="w-6 h-6 text-violet-600" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('recurring.title')}</h1>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-medium hover:bg-violet-700 transition-colors">
          <Plus className="w-4 h-4" /> {t('recurring.addRecurring')}
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">{t('common.loading')}</div>
      ) : items.length === 0 ? (
        <div className="text-center py-12">
          <RefreshCw className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400">{language === 'fr' ? 'Aucune facturation récurrente' : 'No recurring billing'}</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">{t('clients.name')}</th>
                <th className="px-4 py-3 text-left">{language === 'fr' ? 'Service' : 'Service'}</th>
                <th className="px-4 py-3 text-right">{t('recurring.amount')}</th>
                <th className="px-4 py-3 text-center">{t('recurring.frequency')}</th>
                <th className="px-4 py-3 text-center">{t('recurring.nextBilling')}</th>
                <th className="px-4 py-3 text-center">{t('common.status')}</th>
                <th className="px-4 py-3 text-center">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{item.client?.name || '—'}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{item.product?.name || '—'}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">{formatCurrency(item.amount)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-xs bg-violet-50 dark:bg-violet-900/20 text-violet-600 px-2 py-1 rounded-full">
                      {FREQ_LABELS[language]?.[item.frequency] || item.frequency}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-gray-500 dark:text-gray-400">{formatDate(item.nextBillingDate)}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleToggle(item)}
                      className={cn(
                        'text-xs px-2.5 py-1 rounded-full font-medium cursor-pointer',
                        item.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      )}
                    >
                      {item.isActive ? (language === 'fr' ? 'Actif' : 'Active') : (language === 'fr' ? 'Inactif' : 'Inactive')}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => handleDelete(item.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
