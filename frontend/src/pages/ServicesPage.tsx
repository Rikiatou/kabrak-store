import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/i18n/useTranslation';
import api from '@/lib/api';
import { Package, Plus, Edit2, Trash2 } from 'lucide-react';

interface ServicePackage {
  id: string;
  name: string;
  description: string | null;
  sellingPrice: number;
  duration: string | null;
  recurringType: string | null;
  recurringPrice: number | null;
  isActive: boolean;
}

export function ServicesPage() {
  const { t, language } = useTranslation();
  const [services, setServices] = useState<ServicePackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '', description: '', sellingPrice: 0, duration: '',
    recurringType: 'one_time', recurringPrice: 0, businessType: 'OTHER' as string,
  });
  const [saving, setSaving] = useState(false);

  const fetchServices = useCallback(async () => {
    try {
      const { data } = await api.get('/products?isService=true');
      setServices((data.data || []).filter((p: { isService: boolean }) => p.isService));
    } catch {
      setServices([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchServices(); }, [fetchServices]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        isService: true,
        costPrice: 0,
        totalStock: 0,
        sellingPrice: form.sellingPrice,
        recurringPrice: form.recurringType !== 'one_time' ? form.recurringPrice : null,
      };
      if (editId) {
        await api.put(`/products/${editId}`, payload);
      } else {
        await api.post('/products', payload);
      }
      setShowForm(false);
      setEditId(null);
      setForm({ name: '', description: '', sellingPrice: 0, duration: '', recurringType: 'one_time', recurringPrice: 0, businessType: 'OTHER' });
      fetchServices();
    } catch { /* ignore */ }
    setSaving(false);
  };

  const handleEdit = (s: ServicePackage) => {
    setEditId(s.id);
    setForm({
      name: s.name,
      description: s.description || '',
      sellingPrice: s.sellingPrice,
      duration: s.duration || '',
      recurringType: s.recurringType || 'one_time',
      recurringPrice: s.recurringPrice || 0,
      businessType: 'OTHER',
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(language === 'fr' ? 'Supprimer ce service ?' : 'Delete this service?')) return;
    try {
      await api.delete(`/products/${id}`);
      fetchServices();
    } catch { /* ignore */ }
  };

  const formatCurrency = (n: number) => n.toLocaleString('fr-FR') + ' FCFA';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Package className="w-6 h-6 text-violet-600" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('nav.services')}</h1>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setEditId(null); setForm({ name: '', description: '', sellingPrice: 0, duration: '', recurringType: 'one_time', recurringPrice: 0, businessType: 'OTHER' }); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-medium hover:bg-violet-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> {language === 'fr' ? 'Nouveau service' : 'New Service'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('products.name')}</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder={language === 'fr' ? 'Ex: Gestion réseaux sociaux' : 'Ex: Social media management'}
                className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 text-sm bg-gray-50 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('products.sellingPrice')}</label>
              <input
                type="number"
                value={form.sellingPrice}
                onChange={(e) => setForm({ ...form, sellingPrice: Number(e.target.value) })}
                className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 text-sm bg-gray-50 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{language === 'fr' ? 'Durée' : 'Duration'}</label>
              <input
                value={form.duration}
                onChange={(e) => setForm({ ...form, duration: e.target.value })}
                placeholder={language === 'fr' ? 'Ex: 1 mois, par séance' : 'Ex: 1 month, per session'}
                className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 text-sm bg-gray-50 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{language === 'fr' ? 'Type de paiement' : 'Payment type'}</label>
              <select
                value={form.recurringType}
                onChange={(e) => setForm({ ...form, recurringType: e.target.value })}
                className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 text-sm bg-gray-50 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-200"
              >
                <option value="one_time">{language === 'fr' ? 'Paiement unique' : 'One-time'}</option>
                <option value="monthly">{t('recurring.monthly')}</option>
                <option value="quarterly">{t('recurring.quarterly')}</option>
                <option value="yearly">{t('recurring.yearly')}</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => { setShowForm(false); setEditId(null); }} className="px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-600 dark:text-gray-300">
              {t('common.cancel')}
            </button>
            <button
              onClick={handleSave}
              disabled={!form.name || saving}
              className="px-4 py-2 bg-violet-600 text-white rounded-xl text-sm font-medium hover:bg-violet-700 disabled:opacity-50"
            >
              {saving ? t('common.loading') : t('common.save')}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400">{t('common.loading')}</div>
      ) : services.length === 0 ? (
        <div className="text-center py-12">
          <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400">{language === 'fr' ? 'Aucun service' : 'No services'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((s) => (
            <div key={s.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold text-gray-900 dark:text-white">{s.name}</h3>
                <div className="flex gap-1.5">
                  <button onClick={() => handleEdit(s)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(s.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              {s.description && <p className="text-xs text-gray-400 mb-3">{s.description}</p>}
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-bold text-violet-600">{formatCurrency(s.sellingPrice)}</span>
                {s.duration && <span className="text-xs text-gray-400">/ {s.duration}</span>}
              </div>
              {s.recurringType && s.recurringType !== 'one_time' && (
                <span className="inline-block mt-2 text-[10px] bg-violet-50 dark:bg-violet-900/20 text-violet-600 px-2 py-0.5 rounded-full font-medium">
                  {s.recurringType}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
