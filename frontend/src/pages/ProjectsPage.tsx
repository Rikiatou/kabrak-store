import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { NativeSelect } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingState, Spinner } from '@/components/ui/spinner';
import { useTranslation } from '@/i18n/useTranslation';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import { getErrorMessage } from '@/lib/errors';
import api from '@/lib/api';
import { FolderKanban, Plus, ChevronDown, CheckCircle2, Circle, Calendar } from 'lucide-react';

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

const STATUS_VARIANT: Record<string, 'secondary' | 'default' | 'warning' | 'success' | 'destructive'> = {
  DRAFT: 'secondary', ACTIVE: 'default', ON_HOLD: 'warning', COMPLETED: 'success', CANCELLED: 'destructive',
};

const statusKey = (s: string) => (s === 'ON_HOLD' ? 'status.onHold' : `status.${s.toLowerCase()}`);
const emptyForm = { name: '', description: '', totalBudget: 0, deadline: '', clientId: '' };

export function ProjectsPage() {
  const { t } = useTranslation();
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchProjects = useCallback(async () => {
    try {
      const { data } = await api.get('/projects');
      setProjects(data.data);
    } catch (err) {
      toast.error(getErrorMessage(err, t('common.loadError')));
    }
    setLoading(false);
  }, [t]);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  useEffect(() => {
    if (showForm) api.get('/clients?limit=200').then(({ data }) => setClients(data.data || [])).catch(() => setClients([]));
  }, [showForm]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/projects', {
        name: form.name,
        description: form.description || undefined,
        totalBudget: form.totalBudget,
        deadline: form.deadline || undefined,
        clientId: form.clientId || undefined,
      });
      toast.success(t('projects.created'));
      setShowForm(false);
      setForm(emptyForm);
      fetchProjects();
    } catch (err) {
      toast.error(getErrorMessage(err, t('common.error')));
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('projects.title')}
        actions={<Button onClick={() => { setForm(emptyForm); setShowForm(true); }}><Plus className="mr-2 h-4 w-4" /> {t('projects.addProject')}</Button>}
      />

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('projects.addProject')}</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <Label htmlFor="pj-name">{t('projects.name')} *</Label>
              <Input id="pj-name" required autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="pj-desc">{t('common.description')}</Label>
              <Textarea id="pj-desc" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="pj-client">{t('projects.client')}</Label>
                <NativeSelect id="pj-client" value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })}>
                  <option value="">{t('projects.noClient')}</option>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </NativeSelect>
              </div>
              <div>
                <Label htmlFor="pj-budget">{t('projects.budgetFcfa')}</Label>
                <Input id="pj-budget" type="number" min={0} value={form.totalBudget || ''}
                  onChange={(e) => setForm({ ...form, totalBudget: Math.max(0, Number(e.target.value)) })} />
              </div>
              <div>
                <Label htmlFor="pj-deadline">{t('projects.deadline')}</Label>
                <Input id="pj-deadline" type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>{t('common.cancel')}</Button>
              <Button type="submit" disabled={saving}>{saving && <Spinner className="mr-2" />}{t('common.save')}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {loading ? (
        <LoadingState />
      ) : projects.length === 0 ? (
        <EmptyState icon={FolderKanban} title={t('projects.empty')} description={t('projects.emptyDesc')}
          action={<Button onClick={() => { setForm(emptyForm); setShowForm(true); }}><Plus className="mr-2 h-4 w-4" /> {t('projects.addProject')}</Button>} />
      ) : (
        <div className="space-y-3">
          {projects.map((p) => {
            const expanded = expandedId === p.id;
            return (
              <Card key={p.id} className="overflow-hidden">
                <button
                  onClick={() => setExpandedId(expanded ? null : p.id)}
                  aria-expanded={expanded}
                  className="flex w-full items-center justify-between gap-3 p-4 text-left transition-colors hover:bg-accent/50"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate font-semibold">{p.name}</span>
                      <Badge variant={STATUS_VARIANT[p.status] || 'secondary'}>{t(statusKey(p.status))}</Badge>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{p.client?.name || t('projects.noClient')}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <div className="hidden text-right sm:block">
                      <div className="text-sm font-bold">{formatCurrency(p.totalBudget)}</div>
                      <div className="text-xs text-muted-foreground">{t('projects.paid')} : {formatCurrency(p.amountPaid)}</div>
                    </div>
                    <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', expanded && 'rotate-180')} />
                  </div>
                </button>
                {expanded && (
                  <div className="space-y-3 border-t px-4 pb-4 pt-3">
                    {p.description && <p className="text-sm text-muted-foreground">{p.description}</p>}
                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <div>
                        <span className="text-xs text-muted-foreground">{t('projects.budget')}</span>
                        <p className="font-semibold">{formatCurrency(p.totalBudget)}</p>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">{t('projects.paid')}</span>
                        <p className="font-semibold text-success">{formatCurrency(p.amountPaid)}</p>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">{t('projects.remaining')}</span>
                        <p className="font-semibold text-warning">{formatCurrency(p.amountRemaining)}</p>
                      </div>
                    </div>
                    {p.deadline && (
                      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5" /> {t('projects.deadline')} : {formatDate(p.deadline)}
                      </p>
                    )}
                    {p.milestones.length > 0 && (
                      <div>
                        <h4 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">{t('projects.milestones')}</h4>
                        <div className="space-y-1.5">
                          {p.milestones.map((m) => (
                            <div key={m.id} className="flex items-center gap-2 text-sm">
                              {m.isCompleted ? <CheckCircle2 className="h-4 w-4 text-success" /> : <Circle className="h-4 w-4 text-muted-foreground" />}
                              <span className={cn('flex-1', m.isCompleted && 'text-muted-foreground line-through')}>{m.title}</span>
                              {m.amount > 0 && <span className="text-xs text-muted-foreground">{formatCurrency(m.amount)}</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
