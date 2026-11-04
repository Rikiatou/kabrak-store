import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Card, CardContent } from '@/components/ui/card';
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
import { useConfirm } from '@/components/ui/confirm-dialog';
import { useTranslation } from '@/i18n/useTranslation';
import { formatCurrency } from '@/lib/utils';
import { getErrorMessage } from '@/lib/errors';
import api from '@/lib/api';
import { Briefcase, Plus, Pencil, Trash2 } from 'lucide-react';

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

const emptyForm = {
  name: '', description: '', sellingPrice: 0, duration: '',
  recurringType: 'one_time', recurringPrice: 0, businessType: 'OTHER' as string,
};

export function ServicesPage() {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const [services, setServices] = useState<ServicePackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchServices = useCallback(async () => {
    try {
      const { data } = await api.get('/products?isService=true');
      setServices((data.data || []).filter((p: { isService: boolean }) => p.isService));
    } catch (err) {
      toast.error(getErrorMessage(err, t('common.loadError')));
    }
    setLoading(false);
  }, [t]);

  useEffect(() => { fetchServices(); }, [fetchServices]);

  const openForm = (s?: ServicePackage) => {
    setEditId(s?.id || null);
    setForm(s ? {
      name: s.name,
      description: s.description || '',
      sellingPrice: s.sellingPrice,
      duration: s.duration || '',
      recurringType: s.recurringType || 'one_time',
      recurringPrice: s.recurringPrice || 0,
      businessType: 'OTHER',
    } : emptyForm);
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.sellingPrice <= 0) { toast.error(t('common.mustBePositive')); return; }
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
      if (editId) await api.put(`/products/${editId}`, payload);
      else await api.post('/products', payload);
      toast.success(t('common.saved'));
      setShowForm(false);
      setEditId(null);
      fetchServices();
    } catch (err) {
      toast.error(getErrorMessage(err, t('common.error')));
    }
    setSaving(false);
  };

  const handleDelete = async (s: ServicePackage) => {
    if (!(await confirm({ title: t('services.deleteTitle'), description: `${s.name} — ${t('common.deleteDesc')}` }))) return;
    try {
      await api.delete(`/products/${s.id}`);
      toast.success(t('common.deleted'));
      fetchServices();
    } catch (err) {
      toast.error(getErrorMessage(err, t('common.error')));
    }
  };

  const recurringLabel = (type: string) => (type === 'one_time' ? t('services.oneTime') : t(`recurring.${type}`));

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('nav.services')}
        actions={<Button onClick={() => openForm()}><Plus className="mr-2 h-4 w-4" /> {t('services.newService')}</Button>}
      />

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editId ? t('services.editService') : t('services.newService')}</DialogTitle></DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <Label htmlFor="sv-name">{t('products.name')} *</Label>
              <Input id="sv-name" required autoFocus value={form.name} placeholder={t('services.nameHint')}
                onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="sv-desc">{t('common.description')}</Label>
              <Textarea id="sv-desc" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="sv-price">{t('services.price')} *</Label>
                <Input id="sv-price" type="number" min={0} required value={form.sellingPrice || ''}
                  onChange={(e) => setForm({ ...form, sellingPrice: Math.max(0, Number(e.target.value)) })} />
              </div>
              <div>
                <Label htmlFor="sv-duration">{t('services.duration')}</Label>
                <Input id="sv-duration" value={form.duration} placeholder={t('services.durationHint')}
                  onChange={(e) => setForm({ ...form, duration: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="sv-type">{t('services.paymentType')}</Label>
                <NativeSelect id="sv-type" value={form.recurringType} onChange={(e) => setForm({ ...form, recurringType: e.target.value })}>
                  {['one_time', 'monthly', 'quarterly', 'yearly'].map((type) => <option key={type} value={type}>{recurringLabel(type)}</option>)}
                </NativeSelect>
              </div>
              {form.recurringType !== 'one_time' && (
                <div>
                  <Label htmlFor="sv-rprice">{t('services.recurringPrice')}</Label>
                  <Input id="sv-rprice" type="number" min={0} value={form.recurringPrice || ''}
                    onChange={(e) => setForm({ ...form, recurringPrice: Math.max(0, Number(e.target.value)) })} />
                </div>
              )}
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
      ) : services.length === 0 ? (
        <EmptyState icon={Briefcase} title={t('services.empty')} description={t('services.emptyDesc')}
          action={<Button onClick={() => openForm()}><Plus className="mr-2 h-4 w-4" /> {t('services.newService')}</Button>} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s) => (
            <Card key={s.id}>
              <CardContent className="p-5">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <h3 className="min-w-0 font-semibold">{s.name}</h3>
                  <div className="flex shrink-0 gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openForm(s)} aria-label={t('common.edit')} title={t('common.edit')}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(s)} aria-label={t('common.delete')} title={t('common.delete')}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                {s.description && <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">{s.description}</p>}
                <div className="flex items-baseline gap-1">
                  <span className="text-lg font-bold text-primary">{formatCurrency(s.sellingPrice)}</span>
                  {s.duration && <span className="text-xs text-muted-foreground">/ {s.duration}</span>}
                </div>
                {s.recurringType && s.recurringType !== 'one_time' && (
                  <Badge variant="secondary" className="mt-2">{recurringLabel(s.recurringType)}</Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
