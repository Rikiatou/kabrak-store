import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/i18n/useTranslation';
import api from '@/lib/api';
import { FolderKanban, Plus, ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Milestone {
  id: string;
  title: string;
  dueDate: string | null;
  isCompleted: boolean;
  amount: number;
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  totalBudget: number;
  amountPaid: number;
  amountRemaining: number;
  deadline: string | null;
  client: { id: string; name: string; phone: string | null } | null;
  assignedTo: { id: string; firstName: string; lastName: string } | null;
  milestones: Milestone[];
  _count: { invoices: number };
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-600',
  ACTIVE: 'bg-blue-100 text-blue-700',
  ON_HOLD: 'bg-yellow-100 text-yellow-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

export function ProjectsPage() {
  const { t, language } = useTranslation();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', totalBudget: 0, deadline: '' });
  const [saving, setSaving] = useState(false);

  const fetchProjects = useCallback(async () => {
    try {
      const { data } = await api.get('/projects');
      setProjects(data.data);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  const handleCreate = async () => {
    setSaving(true);
    try {
      await api.post('/projects', form);
      setShowForm(false);
      setForm({ name: '', description: '', totalBudget: 0, deadline: '' });
      fetchProjects();
    } catch { /* ignore */ }
    setSaving(false);
  };

  const formatCurrency = (n: number) => n.toLocaleString('fr-FR') + ' FCFA';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FolderKanban className="w-6 h-6 text-violet-600" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('projects.title')}</h1>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-medium hover:bg-violet-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> {t('projects.addProject')}
        </button>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('projects.name')}</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 text-sm bg-gray-50 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('projects.budget')}</label>
              <input
                type="number"
                value={form.totalBudget}
                onChange={(e) => setForm({ ...form, totalBudget: Number(e.target.value) })}
                className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 text-sm bg-gray-50 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('projects.deadline')}</label>
              <input
                type="date"
                value={form.deadline}
                onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 text-sm bg-gray-50 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-200"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-600 dark:text-gray-300">
              {t('common.cancel')}
            </button>
            <button
              onClick={handleCreate}
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
      ) : projects.length === 0 ? (
        <div className="text-center py-12">
          <FolderKanban className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400">{language === 'fr' ? 'Aucun projet' : 'No projects'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map((p) => (
            <div key={p.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <button
                onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className={cn('px-2.5 py-1 rounded-full text-xs font-medium', STATUS_COLORS[p.status] || STATUS_COLORS.DRAFT)}>
                    {t(`status.${p.status.toLowerCase()}`)}
                  </span>
                  <span className="font-semibold text-gray-900 dark:text-white truncate">{p.name}</span>
                  {p.client && <span className="text-xs text-gray-400 hidden sm:inline">— {p.client.name}</span>}
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right hidden sm:block">
                    <div className="text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(p.totalBudget)}</div>
                    <div className="text-xs text-gray-400">
                      {language === 'fr' ? 'Payé' : 'Paid'}: {formatCurrency(p.amountPaid)}
                    </div>
                  </div>
                  {expandedId === p.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </div>
              </button>
              {expandedId === p.id && (
                <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-700 pt-3 space-y-3">
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">{t('projects.budget')}</span>
                      <p className="font-semibold text-gray-900 dark:text-white">{formatCurrency(p.totalBudget)}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">{t('projects.paid')}</span>
                      <p className="font-semibold text-green-600">{formatCurrency(p.amountPaid)}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">{t('projects.remaining')}</span>
                      <p className="font-semibold text-orange-600">{formatCurrency(p.amountRemaining)}</p>
                    </div>
                  </div>
                  {p.milestones.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">{t('projects.milestones')}</h4>
                      <div className="space-y-1.5">
                        {p.milestones.map((m) => (
                          <div key={m.id} className="flex items-center gap-2 text-sm">
                            <CheckCircle2 className={cn('w-4 h-4', m.isCompleted ? 'text-green-500' : 'text-gray-300')} />
                            <span className={cn('flex-1', m.isCompleted ? 'line-through text-gray-400' : 'text-gray-700 dark:text-gray-300')}>{m.title}</span>
                            {m.amount > 0 && <span className="text-xs text-gray-400">{formatCurrency(m.amount)}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
