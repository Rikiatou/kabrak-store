import { useEffect, useState, useCallback } from 'react';
import { Plus, Trash2, TrendingDown, TrendingUp, Minus as MinusIcon, X, ShoppingCart, Users, Home, Truck, Megaphone, Zap, Wrench, HelpCircle } from 'lucide-react';
import { useTranslation } from '@/i18n/useTranslation';
import { formatCurrency } from '@/lib/utils';
import api from '@/lib/api';

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

const CATEGORY_CONFIG: Record<string, { label: string; icon: typeof ShoppingCart; color: string }> = {
  STOCK:     { label: 'Achat stock',   icon: ShoppingCart, color: '#6366f1' },
  SALARY:    { label: 'Salaires',      icon: Users,        color: '#f59e0b' },
  RENT:      { label: 'Loyer',         icon: Home,         color: '#ec4899' },
  TRANSPORT: { label: 'Transport',     icon: Truck,        color: '#14b8a6' },
  MARKETING: { label: 'Marketing',     icon: Megaphone,    color: '#3b82f6' },
  UTILITIES: { label: 'Charges',       icon: Zap,          color: '#f97316' },
  EQUIPMENT: { label: 'Équipement',    icon: Wrench,       color: '#8b5cf6' },
  OTHER:     { label: 'Autre',         icon: HelpCircle,   color: '#6b7280' },
};

const PAYMENT_LABELS: Record<string, string> = {
  CASH: 'Espèces', ORANGE_MONEY: 'Orange Money', MTN_MOMO: 'MTN MoMo',
  BANK_TRANSFER: 'Virement', OTHER: 'Autre',
};

const emptyForm = { amount: '', category: 'STOCK', description: '', date: new Date().toISOString().slice(0, 10), paymentMethod: 'CASH', supplierId: '' };

export function ExpensesPage() {
  const { language } = useTranslation();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [periodFilter, setPeriodFilter] = useState<'month' | 'week' | 'all'>('month');

  const getDateRange = () => {
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
  };

  const fetchAll = useCallback(async () => {
    const range = getDateRange();
    const [expRes, sumRes, supRes] = await Promise.all([
      api.get('/expenses', { params: { limit: 50, ...range } }),
      api.get('/expenses/summary', { params: range }),
      api.get('/suppliers', { params: { limit: 100 } }),
    ]);
    setExpenses(expRes.data.data || []);
    setSummary(sumRes.data.data);
    setSuppliers(supRes.data.data || []);
  }, [periodFilter]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.amount) return;
    setSaving(true);
    try {
      await api.post('/expenses', { ...form, supplierId: form.supplierId || undefined });
      setShowForm(false);
      setForm(emptyForm);
      fetchAll();
    } catch { /* ignore */ }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(language === 'fr' ? 'Supprimer cette dépense?' : 'Delete this expense?')) return;
    await api.delete(`/expenses/${id}`);
    fetchAll();
  };

  const profitColor = (summary?.profit ?? 0) >= 0 ? 'text-green-600' : 'text-red-500';

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">
          {language === 'fr' ? '💰 Dépenses & Bénéfice' : '💰 Expenses & Profit'}
        </h1>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          {language === 'fr' ? 'Ajouter dépense' : 'Add expense'}
        </button>
      </div>

      {/* Period filter */}
      <div className="flex gap-2">
        {(['week', 'month', 'all'] as const).map((p) => (
          <button key={p} onClick={() => setPeriodFilter(p)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${periodFilter === p ? 'bg-foreground text-background' : 'bg-card border border-border text-muted-foreground hover:bg-accent'}`}>
            {p === 'week' ? '7 jours' : p === 'month' ? 'Ce mois' : 'Tout'}
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
              const cfg = CATEGORY_CONFIG[cat.category] || CATEGORY_CONFIG.OTHER;
              const Icon = cfg.icon;
              const pct = summary.totalExpenses > 0 ? Math.round(((cat._sum.amount || 0) / summary.totalExpenses) * 100) : 0;
              return (
                <div key={cat.category} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: cfg.color + '20' }}>
                    <Icon className="w-3.5 h-3.5" style={{ color: cfg.color }} />
                  </div>
                  <span className="text-xs text-muted-foreground w-24 flex-shrink-0">{cfg.label}</span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: cfg.color }} />
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
        {expenses.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">
            {language === 'fr' ? 'Aucune dépense enregistrée' : 'No expenses recorded'}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {expenses.map((exp) => {
              const cfg = CATEGORY_CONFIG[exp.category] || CATEGORY_CONFIG.OTHER;
              const Icon = cfg.icon;
              return (
                <div key={exp.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: cfg.color + '20' }}>
                    <Icon className="w-4 h-4" style={{ color: cfg.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {exp.description || cfg.label}
                      {exp.supplier && <span className="text-xs text-muted-foreground ml-1">· {exp.supplier.name}</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(exp.date).toLocaleDateString('fr-FR')} · {PAYMENT_LABELS[exp.paymentMethod] || exp.paymentMethod}
                    </p>
                  </div>
                  <p className="font-bold text-red-500 text-sm">-{formatCurrency(exp.amount)}</p>
                  <button onClick={() => handleDelete(exp.id)} className="text-muted-foreground hover:text-red-500 p-1 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add expense modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="font-bold text-foreground">{language === 'fr' ? 'Nouvelle dépense' : 'New expense'}</h3>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Montant *</label>
                  <input type="number" min="1" required value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })}
                    placeholder="Ex: 5000"
                    className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Date</label>
                  <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
                    className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Catégorie</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => {
                    const Icon = cfg.icon;
                    return (
                      <button type="button" key={key} onClick={() => setForm({ ...form, category: key })}
                        className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all text-xs ${form.category === key ? 'border-red-400 bg-red-50 dark:bg-red-900/20' : 'border-border hover:border-gray-300'}`}>
                        <Icon className="w-4 h-4" style={{ color: cfg.color }} />
                        <span className="truncate w-full text-center" style={{ fontSize: '9px' }}>{cfg.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Description (optionnel)</label>
                <input type="text" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="Ex: Achat tissu Douala"
                  className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Paiement</label>
                  <select value={form.paymentMethod} onChange={e => setForm({ ...form, paymentMethod: e.target.value })}
                    className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none">
                    <option value="CASH">Espèces</option>
                    <option value="ORANGE_MONEY">Orange Money</option>
                    <option value="MTN_MOMO">MTN MoMo</option>
                    <option value="BANK_TRANSFER">Virement</option>
                    <option value="OTHER">Autre</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Fournisseur (optionnel)</label>
                  <select value={form.supplierId} onChange={e => setForm({ ...form, supplierId: e.target.value })}
                    className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none">
                    <option value="">Aucun</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-accent transition-colors">Annuler</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 disabled:opacity-50 transition-colors">
                  {saving ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
