import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingState, Spinner } from '@/components/ui/spinner';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { useTranslation } from '@/i18n/useTranslation';
import { formatCurrency } from '@/lib/utils';
import { getErrorMessage } from '@/lib/errors';
import { downloadFile } from '@/lib/download';
import { Plus, Search, Users, Pencil, Trash2, Download, Phone, Mail } from 'lucide-react';
import api from '@/lib/api';

interface Client {
  id: string; name: string; phone?: string; email?: string;
  address?: string; loyaltyPoints: number; totalSpent: number; totalOrders: number;
}

const emptyForm = { name: '', phone: '', email: '', address: '' };

export function ClientsPage() {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const fetchClients = useCallback(async () => {
    try {
      const { data } = await api.get('/clients', { params: { search, limit: 100 } });
      setClients(data.data);
    } catch (err) { toast.error(getErrorMessage(err, t('common.loadError'))); }
    finally { setLoading(false); }
  }, [search, t]);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  const openForm = (client?: Client) => {
    setForm(client ? { name: client.name, phone: client.phone || '', email: client.email || '', address: client.address || '' } : emptyForm);
    setEditingId(client?.id || null);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) await api.put(`/clients/${editingId}`, form);
      else await api.post('/clients', form);
      toast.success(t('common.saved'));
      setShowForm(false); setEditingId(null);
      fetchClients();
    } catch (err) { toast.error(getErrorMessage(err, t('common.error'))); }
    finally { setSaving(false); }
  };

  const handleDelete = async (client: Client) => {
    const ok = await confirm({ title: t('clients.deleteTitle'), description: `${client.name} — ${t('common.deleteDesc')}` });
    if (!ok) return;
    try { await api.delete(`/clients/${client.id}`); toast.success(t('common.deleted')); fetchClients(); }
    catch (err) { toast.error(getErrorMessage(err, t('common.error'))); }
  };

  const handleExport = async () => {
    try { await downloadFile('/exports/clients', `clients-${Date.now()}.csv`); }
    catch (err) { toast.error(getErrorMessage(err, t('common.exportError'))); }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title={t('clients.title')}
        actions={<>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="w-4 h-4 mr-1.5" /> {t('common.exportCsv')}
          </Button>
          <Button size="sm" onClick={() => openForm()}>
            <Plus className="w-4 h-4 mr-1.5" /> {t('clients.addClient')}
          </Button>
        </>}
      />

      <div className="relative max-w-full sm:max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input className="pl-9" placeholder={t('common.search')} value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? t('clients.editClient') : t('clients.addClient')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><Label htmlFor="c-name">{t('clients.name')} *</Label>
              <Input id="c-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required autoFocus /></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><Label htmlFor="c-phone">{t('clients.phone')}</Label>
                <Input id="c-phone" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+237 6XX XXX XXX" /></div>
              <div><Label htmlFor="c-email">{t('clients.email')}</Label>
                <Input id="c-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            </div>
            <div><Label htmlFor="c-address">{t('clients.address')}</Label>
              <Input id="c-address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>{t('common.cancel')}</Button>
              <Button type="submit" disabled={saving}>{saving && <Spinner className="mr-2" />}{t('common.save')}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {loading ? (
        <LoadingState />
      ) : clients.length === 0 ? (
        search ? (
          <EmptyState icon={Search} title={t('common.noResults')} />
        ) : (
          <EmptyState icon={Users} title={t('clients.empty')} description={t('clients.emptyDesc')}
            action={<Button onClick={() => openForm()}><Plus className="w-4 h-4 mr-2" /> {t('clients.addClient')}</Button>} />
        )
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {clients.map((client) => (
            <Card key={client.id} className="transition-shadow hover:shadow-md">
              <CardContent className="p-4">
                <div className="mb-3 min-w-0">
                  <h3 className="font-semibold truncate">{client.name}</h3>
                  {client.phone && <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground"><Phone className="h-3 w-3" />{client.phone}</p>}
                  {client.email && <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground truncate"><Mail className="h-3 w-3 shrink-0" /><span className="truncate">{client.email}</span></p>}
                </div>
                <div className="grid grid-cols-2 gap-2 mb-3 text-center">
                  <div className="bg-muted/50 rounded-lg p-2">
                    <p className="text-xs text-muted-foreground">{t('clients.totalSpent')}</p>
                    <p className="font-semibold text-sm">{formatCurrency(client.totalSpent)}</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-2">
                    <p className="text-xs text-muted-foreground">{t('clients.totalOrders')}</p>
                    <p className="font-semibold text-sm">{client.totalOrders}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => openForm(client)}>
                    <Pencil className="w-3.5 h-3.5 mr-1.5" /> {t('common.edit')}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDelete(client)} className="text-destructive hover:text-destructive" aria-label={t('common.delete')} title={t('common.delete')}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
