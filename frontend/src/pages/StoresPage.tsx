import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingState, Spinner } from '@/components/ui/spinner';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { useTranslation } from '@/i18n/useTranslation';
import { getErrorMessage } from '@/lib/errors';
import { cn } from '@/lib/utils';
import { Store, Plus, MapPin, Phone, Pencil, Trash2, Users, Package } from 'lucide-react';
import api from '@/lib/api';

interface StoreData {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  isMain: boolean;
  isActive: boolean;
  _count: { users: number; products: number };
}

const emptyForm = { name: '', address: '', phone: '' };

export function StoresPage() {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const [stores, setStores] = useState<StoreData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const fetchStores = useCallback(async () => {
    try {
      const { data } = await api.get('/stores');
      setStores(data.data);
    } catch (err) {
      toast.error(getErrorMessage(err, t('common.loadError')));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { fetchStores(); }, [fetchStores]);

  const openForm = (store?: StoreData) => {
    setForm(store ? { name: store.name, address: store.address || '', phone: store.phone || '' } : emptyForm);
    setEditingId(store?.id || null);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) await api.put(`/stores/${editingId}`, form);
      else await api.post('/stores', form);
      toast.success(t('common.saved'));
      setShowForm(false);
      setEditingId(null);
      fetchStores();
    } catch (err) {
      toast.error(getErrorMessage(err, t('common.error')));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (store: StoreData) => {
    if (!(await confirm({ title: t('stores.deleteTitle'), description: `${store.name} — ${t('common.deleteDesc')}` }))) return;
    try {
      await api.delete(`/stores/${store.id}`);
      toast.success(t('common.deleted'));
      fetchStores();
    } catch (err) {
      toast.error(getErrorMessage(err, t('common.error')));
    }
  };

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('nav.stores')}
        actions={<Button onClick={() => openForm()}><Plus className="w-4 h-4 mr-2" /> {t('stores.addStore')}</Button>}
      />

      {stores.length === 0 ? (
        <EmptyState icon={Store} title={t('stores.empty')}
          action={<Button onClick={() => openForm()}><Plus className="w-4 h-4 mr-2" /> {t('stores.addStore')}</Button>} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {stores.map((store) => (
            <Card key={store.id} className={cn(store.isMain && 'border-primary')}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-lg truncate">{store.name}</h3>
                    {store.isMain && <Badge variant="default" className="mt-1">{t('stores.main')}</Badge>}
                  </div>
                  <Badge variant={store.isActive ? 'success' : 'secondary'}>
                    {store.isActive ? t('common.active') : t('common.inactive')}
                  </Badge>
                </div>

                {store.address && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <MapPin className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">{store.address}</span>
                  </div>
                )}
                {store.phone && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Phone className="w-3.5 h-3.5 shrink-0" /> {store.phone}
                  </div>
                )}

                <div className="flex gap-4 text-sm my-4">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>{store._count.users} {t('stores.employeesCount')}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>{store._count.products} {t('stores.productsCount')}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => openForm(store)} className="flex-1">
                    <Pencil className="w-3.5 h-3.5 mr-1.5" /> {t('common.edit')}
                  </Button>
                  {!store.isMain && (
                    <Button variant="outline" size="sm" onClick={() => handleDelete(store)} className="text-destructive hover:text-destructive" aria-label={t('common.delete')} title={t('common.delete')}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editingId ? t('stores.editStore') : t('stores.addStore')}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="s-name">{t('stores.storeName')} *</Label>
              <Input id="s-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required autoFocus />
            </div>
            <div>
              <Label htmlFor="s-address">{t('stores.address')}</Label>
              <Input id="s-address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="s-phone">{t('stores.phone')}</Label>
              <Input id="s-phone" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>{t('common.cancel')}</Button>
              <Button type="submit" disabled={saving}>{saving && <Spinner className="mr-2" />}{t('common.save')}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
