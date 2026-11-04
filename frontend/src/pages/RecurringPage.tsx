import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingState, Spinner } from '@/components/ui/spinner';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { useTranslation } from '@/i18n/useTranslation';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import { getErrorMessage } from '@/lib/errors';
import api from '@/lib/api';
import { RefreshCw, Plus, Trash2, Pause, Play, Calendar } from 'lucide-react';

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

const FREQUENCIES = ['weekly', 'monthly', 'quarterly', 'yearly'];
const emptyForm = { clientId: '', productId: '', amount: 0, frequency: 'monthly', nextBillingDate: '' };

export function RecurringPage() {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const [items, setItems] = useState<RecurringBilling[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<ServiceProduct[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const fetchItems = useCallback(async () => {
    try {
      const { data } = await api.get('/recurring');
      setItems(data.data);
    } catch (err) {
      toast.error(getErrorMessage(err, t('common.loadError')));
    }
    setLoading(false);
  }, [t]);

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
    } catch (err) {
      toast.error(getErrorMessage(err, t('common.error')));
    }
  };

  const handleDelete = async (id: string) => {
    if (!(await confirm({ title: t('recurring.deleteTitle'), description: t('common.deleteDesc') }))) return;
    try {
      await api.delete(`/recurring/${id}`);
      toast.success(t('common.deleted'));
      fetchItems();
    } catch (err) {
      toast.error(getErrorMessage(err, t('common.error')));
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.clientId || !form.amount || !form.nextBillingDate) {
      toast.error(t('recurring.missing'));
      return;
    }
    setSaving(true);
    try {
      await api.post('/recurring', {
        clientId: form.clientId,
        productId: form.productId || undefined,
        amount: form.amount,
        frequency: form.frequency,
        nextBillingDate: form.nextBillingDate,
      });
      toast.success(t('recurring.created'));
      setShowForm(false);
      setForm(emptyForm);
      fetchItems();
    } catch (err) {
      toast.error(getErrorMessage(err, t('common.error')));
    }
    setSaving(false);
  };

  const handleServiceSelect = (productId: string) => {
    setForm((prev) => {
      const svc = services.find((s) => s.id === productId);
      return { ...prev, productId, amount: svc ? svc.sellingPrice : prev.amount };
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('recurring.title')}
        actions={<Button onClick={() => { setForm(emptyForm); setShowForm(true); }}><Plus className="mr-2 h-4 w-4" /> {t('recurring.addRecurring')}</Button>}
      />

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('recurring.addRecurring')}</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="rc-client">{t('recurring.client')} *</Label>
                <NativeSelect id="rc-client" required value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })}>
                  <option value="">{t('common.select')}</option>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </NativeSelect>
              </div>
              <div>
                <Label htmlFor="rc-service">{t('recurring.service')}</Label>
                <NativeSelect id="rc-service" value={form.productId} onChange={(e) => handleServiceSelect(e.target.value)}>
                  <option value="">{t('recurring.noService')}</option>
                  {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </NativeSelect>
              </div>
              <div>
                <Label htmlFor="rc-amount">{t('recurring.amountFcfa')} *</Label>
                <Input id="rc-amount" type="number" min={1} required value={form.amount || ''}
                  onChange={(e) => setForm({ ...form, amount: Math.max(0, Number(e.target.value)) })} />
              </div>
              <div>
                <Label htmlFor="rc-freq">{t('recurring.frequency')}</Label>
                <NativeSelect id="rc-freq" value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })}>
                  {FREQUENCIES.map((f) => <option key={f} value={f}>{t(`recurring.${f}`)}</option>)}
                </NativeSelect>
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="rc-date">{t('recurring.firstBilling')} *</Label>
                <Input id="rc-date" type="date" required value={form.nextBillingDate} onChange={(e) => setForm({ ...form, nextBillingDate: e.target.value })} />
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
      ) : items.length === 0 ? (
        <EmptyState icon={RefreshCw} title={t('recurring.empty')} description={t('recurring.emptyDesc')}
          action={<Button onClick={() => { setForm(emptyForm); setShowForm(true); }}><Plus className="mr-2 h-4 w-4" /> {t('recurring.addRecurring')}</Button>} />
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item.id} className={cn(!item.isActive && 'opacity-70')}>
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-semibold">{item.client?.name || '—'}</p>
                    <Badge variant={item.isActive ? 'success' : 'secondary'}>{item.isActive ? t('common.active') : t('recurring.paused')}</Badge>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {[item.product?.name, t(`recurring.${item.frequency}`)].filter(Boolean).join(' · ')}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" /> {t('recurring.nextBilling')} : {formatDate(item.nextBillingDate)}
                  </p>
                </div>
                <div className="flex items-center justify-between gap-3 sm:justify-end">
                  <p className="text-lg font-bold">{formatCurrency(item.amount)}</p>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" onClick={() => handleToggle(item)}>
                      {item.isActive ? <><Pause className="mr-1.5 h-3.5 w-3.5" />{t('recurring.pause')}</> : <><Play className="mr-1.5 h-3.5 w-3.5" />{t('recurring.resume')}</>}
                    </Button>
                    <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDelete(item.id)} aria-label={t('common.delete')} title={t('common.delete')}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
