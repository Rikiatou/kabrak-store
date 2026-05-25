import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/i18n/useTranslation';
import api from '@/lib/api';
import { RefreshCw, Plus, Trash2, X } from 'lucide-react';
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

interface Client {
  id: string;
  name: string;
}

interface ServiceProduct {
  id: string;
  name: string;
  sellingPrice: number;
}

export function RecurringPage() {
  const { t, language } = useTranslation();
  const [items, setItems] = useState<RecurringBilling[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<ServiceProduct[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    clientId: '',
    productId: '',
    amount: 0,
    frequency: 'monthly',
    nextBillingDate: '',
  });

  const fetchItems = useCallback(async () => {
    try {
      const { data } = await api.get('/recurring');
      setItems(data.data);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  useEffect(() => {
    if (showForm) {
      api.get('/clients?limit=200').then(({ data }) => setClients(data.data || [])).catch(() => {});
      api.get('/products?isService=true&limit=200').then(({ data }) => {
        setServices((data.data || []).filter((p: { isService: boolean }) => p.isService));
      }).catch(() => {});
    }
  }, [showForm]);

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

  const handleCreate = async () => {
    if (!form.clientId || !form.amount || !form.nextBillingDate) return;
    setSaving(true);
    try {
      await api.post('/recurring', {
        clientId: form.clientId,
        productId: form.productId || undefined,
        amount: form.amount,
        frequency: form.frequency,
        nextBillingDate: form.nextBillingDate,
      });
      setShowForm(false);
      setForm({ clientId: '', productId: '', amount: 0, frequency: 'monthly', nextBillingDate: '' });
      fetchItems();
    } catch { /* ignore */ }
    setSaving(false);
  };

  const handleServiceSelect = (productId: string) => {
    setForm((prev) => {
      const svc = services.find((s) => s.id === productId);
      return { ...prev, productId, amount: svc ? svc.sellingPrice : prev.amount };
    });
  };

  const formatCurrency = (n: number) => n.toLocaleString('fr-FR') + ' FCFA';
  const formatDate = (d: string) => new Date(d).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US');

  const FREQ_LABELS: Record<string, Record<string, string>> = {
    fr: { weekly: 'Hebdomadaire', monthly: 'Mensuel', quarterly: 'Trimestriel', yearly: 'Annuel' },
    en: { weekly: 'Weekly', monthly: 'Monthly', quarterly: 'Quarterly', yearly: 'Yearly' },
  };

  const FREQ_OPTIONS = [
    { value: 'weekly', label: language === 'fr' ? 'Hebdomadaire' : 'Weekly' },
    { value: 'monthly', label: language === 'fr' ? 'Mensuel' : 'Monthly' },
    { value: 'quarterly', label: language === 'fr' ? 'Trimestriel' : 'Quarterly' },
    { value: 'yearly', label: language === 'fr' ? 'Annuel' : 'Yearly' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <RefreshCw className="w-6 h-6 text-violet-600" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('recurring.title')}</h1>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-medium hover:bg-violet-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> {t('recurring.addRecurring')}
        </button>
      </div>

      {/* Creation form */}
      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border-2 border-violet-200 dark:border-violet-800 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold dark:text-white">
              {language === 'fr' ? 'Nouvelle facturation récurrente' : 'New Recurring Billing'}
            </h2>
            <button onClick={() => setShowForm(false)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {language === 'fr' ? 'Client *' : 'Client *'}
              </label>
              <select
                value={form.clientId}
                onChange={(e) => setForm({ ...form, clientId: e.target.value })}
                className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 text-sm bg-gray-50 dark:bg-gray-700 dark:text-white"
              >
                <option value="">{language === 'fr' ? '-- Sélectionner --' : '-- Select --'}</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {language === 'fr' ? 'Service (optionnel)' : 'Service (optional)'}
              </label>
              <select
                value={form.productId}
                onChange={(e) => handleServiceSelect(e.target.value)}
                className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 text-sm bg-gray-50 dark:bg-gray-700 dark:text-white"
              >
                <option value="">{language === 'fr' ? '-- Aucun --' : '-- None --'}</option>
                {services.map((s) => <option key={s.id} value={s.id}>{s.name} ({formatCurrency(s.sellingPrice)})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {language === 'fr' ? 'Montant (FCFA) *' : 'Amount (FCFA) *'}
              </label>
              <input
                type="number"
                value={form.amount || ''}
                onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })}
                className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 text-sm bg-gray-50 dark:bg-gray-700 dark:text-white"
                placeholder="75000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {language === 'fr' ? 'Fréquence' : 'Frequency'}
              </label>
              <select
                value={form.frequency}
                onChange={(e) => setForm({ ...form, frequency: e.target.value })}
                className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 text-sm bg-gray-50 dark:bg-gray-700 dark:text-white"
              >
                {FREQ_OPTIONS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {language === 'fr' ? 'Prochaine facturation *' : 'Next billing date *'}
              </label>
              <input
                type="date"
                value={form.nextBillingDate}
                onChange={(e) => setForm({ ...form, nextBillingDate: e.target.value })}
                className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 text-sm bg-gray-50 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setShowForm(false)} className="px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-600 dark:text-gray-300">
              {t('common.cancel')}
            </button>
            <button
              onClick={handleCreate}
              disabled={saving || !form.clientId || !form.amount || !form.nextBillingDate}
              className="px-6 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-medium hover:bg-violet-700 disabled:opacity-50 transition-colors"
            >
              {saving ? '...' : (language === 'fr' ? 'Créer' : 'Create')}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400">{t('common.loading')}</div>
      ) : items.length === 0 ? (
        <div className="text-center py-12">
          <RefreshCw className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400">{language === 'fr' ? 'Aucune facturation récurrente' : 'No recurring billing'}</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-4 px-4 py-2 bg-violet-600 text-white rounded-xl text-sm font-medium hover:bg-violet-700"
          >
            <Plus className="w-4 h-4 inline mr-1" /> {language === 'fr' ? 'Créer la première' : 'Create first one'}
          </button>
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
