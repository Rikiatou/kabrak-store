import { useEffect, useState, useCallback } from 'react';
import { Plus, Trash2, TrendingDown, TrendingUp, Minus as MinusIcon, X, ShoppingCart, Users, Home, Truck, Megaphone, Zap, Wrench, HelpCircle, Pencil } from 'lucide-react';
import { useTranslation } from '@/i18n/useTranslation';
import { formatCurrency } from '@/lib/utils';
import api, { getApiErrorMessage } from '@/lib/api';
import toast from 'react-hot-toast';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { usePagination } from '@/hooks/usePagination';
import { Pagination } from '@/components/Pagination';

interface Expense {
  id: string;
  amount: number;
  category: string;
  description?: string;
  date: string;
  paymentMethod: string;
  supplier?: { id: string; name: string };
}

interface Supplier {
  id: string;
  name: string;
}

interface Summary {
  totalExpenses: number;
  totalRevenue: number;
  profit: number;
  margin: number;
  byCategory: { category: string; _sum: { amount: number } }[];
}

const CATEGORY_LABELS: Record<string, { fr: string; en: string }> = {
  STOCK:     { fr: 'Achat stock',   en: 'Stock purchase' },
  SALARY:    { fr: 'Salaires',      en: 'Salaries' },
  RENT:      { fr: 'Loyer',         en: 'Rent' },
  TRANSPORT: { fr: 'Transport',     en: 'Transport' },
  MARKETING: { fr: 'Marketing',     en: 'Marketing' },
  UTILITIES: { fr: 'Charges',       en: 'Utilities' },
  EQUIPMENT: { fr: 'Équipement',    en: 'Equipment' },
  OTHER:     { fr: 'Autre',         en: 'Other' },
};

const CATEGORY_ICONS: Record<string, typeof ShoppingCart> = {
  STOCK: ShoppingCart, SALARY: Users, RENT: Home, TRANSPORT: Truck,
  MARKETING: Megaphone, UTILITIES: Zap, EQUIPMENT: Wrench, OTHER: HelpCircle,
};

const CATEGORY_COLORS: Record<string, string> = {
  STOCK: '#6366f1', SALARY: '#f59e0b', RENT: '#ec4899', TRANSPORT: '#14b8a6',
  MARKETING: '#3b82f6', UTILITIES: '#f97316', EQUIPMENT: '#8b5cf6', OTHER: '#6b7280',
};

const PAYMENT_LABELS: Record<string, { fr: string; en: string }> = {
  CASH: { fr: 'Espèces', en: 'Cash' },
  ORANGE_MONEY: { fr: 'Orange Money', en: 'Orange Money' },
  MTN_MOMO: { fr: 'MTN MoMo', en: 'MTN MoMo' },
  BANK_TRANSFER: { fr: 'Virement', en: 'Bank transfer' },
  OTHER: { fr: 'Autre', en: 'Other' },
};

const emptyForm = { amount: '', category: 'STOCK', description: '', reference: '', date: new Date().toISOString().slice(0, 10), paymentMethod: 'CASH', supplierId: '' };

export function ExpensesPage() {
  const { language } = useTranslation();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [periodFilter, setPeriodFilter] = useState<'month' | 'week' | 'all'>('month');
  const [catFilter, setCatFilter] = useState<string>('ALL');

  const getDateRange = useCallback(() => {
    const now = new Date();
    if (periodFilter === 'week') {
      const from = new Date(now); from.setDate(now.getDate() - 7);
      return { from: from.toISOString(), to: now.toISOString() };
    }
    if (periodFilter === 'month') {
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: from.toISOString(), to: now.toISOString() };
    }
    return {};
  }, [periodFilter]);

  const fetchAll = useCallback(async () => {
    const range = getDateRange();
    try {
      const [expRes, sumRes, supRes] = await Promise.all([
        api.get('/expenses', { params: { limit: 50, ...range } }),
        api.get('/expenses/summary', { params: range }),
        api.get('/suppliers', { params: { limit: 100 } }),
      ]);
      setExpenses(expRes.data.data || []);
      setSummary(sumRes.data.data);
      setSuppliers(supRes.data.data || []);
    } catch (err) { console.error(err); toast.error(getApiErrorMessage(err)); }
  }, [getDateRange]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const openNew = () => { setEditId(null); setForm(emptyForm); setShowForm(true); };
  const openEdit = (exp: Expense) => {
    setEditId(exp.id);
    setForm({ amount: String(exp.amount), category: exp.category, description: exp.description || '', reference: (exp as unknown as Record<string, unknown>).reference as string || '', date: exp.date.slice(0, 10), paymentMethod: exp.paymentMethod, supplierId: exp.supplier?.id || '' });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.amount) return;
    if (saving) return;
    setSaving(true);
    try {
      const payload = { ...form, amount: Number(form.amount), supplierId: form.supplierId || undefined };
      if (editId) {
        await api.put(`/expenses/${editId}`, payload);
      } else {
        await api.post('/expenses', payload);
      }
      setShowForm(false); setEditId(null); setForm(emptyForm);
      toast.success(language === 'fr' ? 'Dépense enregistrée' : 'Expense saved');
      fetchAll();
    } catch (err) {
      console.error(err);
      toast.error(getApiErrorMessage(err, language === 'fr' ? 'Échec de l\'enregistrement' : 'Failed to save'));
    } finally {
      setSaving(false);
    }
  };

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const filteredExpenses = expenses.filter(e => catFilter === 'ALL' || e.category === catFilter);
  const {
    paginatedData: paginatedExpenses,
    currentPage: expPage,
    totalPages: expTotalPages,
    pageSize: expPageSize,
    hasPrev: expHasPrev,
    hasNext: expHasNext,
    totalItems: expTotal,
    nextPage: expNextPage,
    prevPage: expPrevPage,
    goToPage: expGoToPage,
  } = usePagination(filteredExpenses, 20);
  const handleDelete = (id: string) => setDeleteTarget(id);
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/expenses/${deleteTarget}`);
      toast.success(language === 'fr' ? 'Dépense supprimée' : 'Expense deleted');
      fetchAll();
    } catch (err) {
      console.error(err);
      toast.error(getApiErrorMessage(err, language === 'fr' ? 'Échec de la suppression' : 'Failed to delete'));
    } finally { setDeleteTarget(null); }
  };

  const profitColor = (summary?.profit ?? 0) >= 0 ? 'text-green-600' : 'text-red-500';

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">
          {language === 'fr' ? '💰 Dépenses & Bénéfice' : '💰 Expenses & Profit'}
        </h1>
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          {language === 'fr' ? 'Ajouter dépense' : 'Add expense'}
        </button>
      </div>

      {/* Period filter */}
      <div className="flex flex-wrap gap-2">
        {(['week', 'month', 'all'] as const).map((p) => (
          <button key={p} onClick={() => setPeriodFilter(p)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${periodFilter === p ? 'bg-foreground text-background' : 'bg-card border border-border text-muted-foreground hover:bg-accent'}`}>
            {p === 'week' ? (language === 'fr' ? '7 jours' : '7 days') : p === 'month' ? (language === 'fr' ? 'Ce mois' : 'This month') : (language === 'fr' ? 'Tout' : 'All')}
          </button>
        ))}
        <div className="w-px bg-border mx-1" />
        <button onClick={() => setCatFilter('ALL')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${catFilter === 'ALL' ? 'bg-foreground text-background' : 'bg-card border border-border text-muted-foreground hover:bg-accent'}`}>
          {language === 'fr' ? 'Toutes' : 'All'}
        </button>
        {Object.entries(CATEGORY_LABELS).map(([key, labels]) => (
          <button key={key} onClick={() => setCatFilter(key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${catFilter === key ? 'bg-foreground text-background' : 'bg-card border border-border text-muted-foreground hover:bg-accent'}`}
            style={catFilter === key ? {} : { borderColor: (CATEGORY_COLORS[key] || CATEGORY_COLORS.OTHER) + '40' }}>
            {labels[language]}
          </button>
        ))}
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <span className="text-xs text-muted-foreground font-medium">{language === 'fr' ? 'Revenus' : 'Revenue'}</span>
            </div>
            <p className="font-bold text-lg text-green-600">{formatCurrency(summary.totalRevenue)}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="w-4 h-4 text-red-500" />
              <span className="text-xs text-muted-foreground font-medium">{language === 'fr' ? 'Dépenses' : 'Expenses'}</span>
            </div>
            <p className="font-bold text-lg text-red-500">{formatCurrency(summary.totalExpenses)}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <MinusIcon className="w-4 h-4 text-blue-500" />
              <span className="text-xs text-muted-foreground font-medium">{language === 'fr' ? 'Bénéfice net' : 'Net profit'}</span>
            </div>
            <p className={`font-bold text-lg ${profitColor}`}>{formatCurrency(summary.profit)}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs">📊</span>
              <span className="text-xs text-muted-foreground font-medium">Marge</span>
            </div>
            <p className={`font-bold text-lg ${profitColor}`}>{summary.margin}%</p>
          </div>
        </div>
      )}

      {/* Category breakdown */}
      {summary && summary.byCategory.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">{language === 'fr' ? 'Par catégorie' : 'By category'}</h3>
          <div className="space-y-2">
            {summary.byCategory.sort((a, b) => (b._sum.amount || 0) - (a._sum.amount || 0)).map((cat) => {
              const catLabel = (CATEGORY_LABELS[cat.category] || CATEGORY_LABELS.OTHER)[language];
              const catColor = CATEGORY_COLORS[cat.category] || CATEGORY_COLORS.OTHER;
              const catIcon = CATEGORY_ICONS[cat.category] || CATEGORY_ICONS.OTHER;
              const Icon = catIcon;
              const pct = summary.totalExpenses > 0 ? Math.round(((cat._sum.amount || 0) / summary.totalExpenses) * 100) : 0;
              return (
                <div key={cat.category} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: catColor + '20' }}>
                    <Icon className="w-3.5 h-3.5" style={{ color: catColor }} />
                  </div>
                  <span className="text-xs text-muted-foreground w-24 flex-shrink-0">{catLabel}</span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: catColor }} />
                  </div>
                  <span className="text-xs font-semibold text-foreground w-20 text-right">{formatCurrency(cat._sum.amount || 0)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Expenses list */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="font-semibold text-foreground text-sm">{language === 'fr' ? 'Historique des dépenses' : 'Expense history'}</h3>
        </div>
        {filteredExpenses.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">
            {language === 'fr' ? 'Aucune dépense enregistrée' : 'No expenses recorded'}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {paginatedExpenses.map((exp) => {
              const expCfg = CATEGORY_ICONS[exp.category] || CATEGORY_ICONS.OTHER;
              const expColor = CATEGORY_COLORS[exp.category] || CATEGORY_COLORS.OTHER;
              const expLabel = (CATEGORY_LABELS[exp.category] || CATEGORY_LABELS.OTHER)[language];
              const Icon = expCfg;
              return (
                <div key={exp.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: expColor + '20' }}>
                    <Icon className="w-4 h-4" style={{ color: expColor }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {exp.description || expLabel}
                      {exp.supplier && <span className="text-xs text-muted-foreground ml-1">· {exp.supplier.name}</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(exp.date).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US')} · {(PAYMENT_LABELS[exp.paymentMethod] || PAYMENT_LABELS.OTHER)[language]}
                    </p>
                  </div>
                  <p className="font-bold text-red-500 text-sm">-{formatCurrency(exp.amount)}</p>
                  <button onClick={() => openEdit(exp)} className="text-muted-foreground hover:text-blue-500 p-1 transition-colors">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(exp.id)} className="text-muted-foreground hover:text-red-500 p-1 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
        <div className="px-4 pb-4">
          <Pagination
            currentPage={expPage}
            totalPages={expTotalPages}
            totalItems={expTotal}
            pageSize={expPageSize}
            hasPrev={expHasPrev}
            hasNext={expHasNext}
            onPrev={expPrevPage}
            onNext={expNextPage}
            onGoToPage={expGoToPage}
          />
        </div>
      </div>

      {/* Add expense modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="font-bold text-foreground">{editId ? (language === 'fr' ? 'Modifier la dépense' : 'Edit expense') : (language === 'fr' ? 'Nouvelle dépense' : 'New expense')}</h3>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">{language === 'fr' ? 'Montant' : 'Amount'} *</label>
                  <input type="number" min="0" required value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })}
                    placeholder="Ex: 5000"
                    className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">{language === 'fr' ? 'Date' : 'Date'}</label>
                  <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
                    className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">{language === 'fr' ? 'Catégorie' : 'Category'}</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {Object.entries(CATEGORY_LABELS).map(([key, labels]) => {
                    const Icon = CATEGORY_ICONS[key] || CATEGORY_ICONS.OTHER;
                    const color = CATEGORY_COLORS[key] || CATEGORY_COLORS.OTHER;
                    return (
                      <button type="button" key={key} onClick={() => setForm({ ...form, category: key })}
                        className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all text-xs ${form.category === key ? 'border-red-400 bg-red-50 dark:bg-red-900/20' : 'border-border hover:border-gray-300'}`}>
                        <Icon className="w-4 h-4" style={{ color }} />
                        <span className="truncate w-full text-center" style={{ fontSize: '9px' }}>{labels[language]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">{language === 'fr' ? 'Description' : 'Description'} (optionnel)</label>
                  <input type="text" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                    placeholder={language === 'fr' ? 'Ex: Achat tissu Douala' : 'Ex: Fabric purchase'}
                    className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">{language === 'fr' ? 'Référence' : 'Reference'} (optionnel)</label>
                  <input type="text" value={form.reference || ''} onChange={e => setForm({ ...form, reference: e.target.value })}
                    placeholder={language === 'fr' ? 'Ex: FAC-2024-001' : 'Ex: INV-2024-001'}
                    className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">{language === 'fr' ? 'Paiement' : 'Payment'}</label>
                  <select value={form.paymentMethod} onChange={e => setForm({ ...form, paymentMethod: e.target.value })}
                    className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none">
                    <option value="CASH">{language === 'fr' ? 'Espèces' : 'Cash'}</option>
                    <option value="ORANGE_MONEY">Orange Money</option>
                    <option value="MTN_MOMO">MTN MoMo</option>
                    <option value="BANK_TRANSFER">{language === 'fr' ? 'Virement' : 'Bank transfer'}</option>
                    <option value="OTHER">{language === 'fr' ? 'Autre' : 'Other'}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">{language === 'fr' ? 'Fournisseur (optionnel)' : 'Supplier (optional)'}</label>
                  <select value={form.supplierId} onChange={e => setForm({ ...form, supplierId: e.target.value })}
                    className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none">
                    <option value="">{language === 'fr' ? 'Aucun' : 'None'}</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-accent transition-colors">{language === 'fr' ? 'Annuler' : 'Cancel'}</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 disabled:opacity-50 transition-colors">
                  {saving ? (language === 'fr' ? 'Enregistrement...' : 'Saving...') : editId ? (language === 'fr' ? 'Modifier' : 'Update') : (language === 'fr' ? 'Enregistrer' : 'Save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <ConfirmDialog
        open={!!deleteTarget}
        message={language === 'fr' ? 'Supprimer cette dépense ?' : 'Delete this expense?'}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
