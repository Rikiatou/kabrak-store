import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from '@/i18n/useTranslation';
import { Store, Plus, X, MapPin, Phone, Pencil, Trash2, Users, Package, ArrowRightLeft, LogIn, BarChart3 } from 'lucide-react';
import api, { getApiErrorMessage } from '@/lib/api';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import toast from 'react-hot-toast';
import { ConfirmDialog } from '@/components/ConfirmDialog';

interface BoutiqueData {
  id: string;
  name: string;
  address?: string | null;
  phone?: string | null;
  plan: string;
  isMain: boolean;
  included: boolean;
  isCurrent: boolean;
  subscription: { status: string; endDate: string; plan: string } | null;
  products: number;
  users: number;
}

interface OverviewRow { id: string; name: string; salesToday: number; ordersToday: number; salesMonth: number; debts: number; products: number; lowStock: number; receivedToday: number; stockCapital?: number; stockRetailValue: number }
interface Overview { boutiques: OverviewRow[]; total: Omit<OverviewRow, 'id' | 'name'> }
interface TransferProduct { id: string; name: string; totalStock: number; variants: { name: string; stock: number }[] | null }
interface Transfer { id: string; productName: string; variant: string | null; quantity: number; createdAt: string; fromTenant: { name: string }; toTenant: { name: string } }

const PLANS = [
  { key: 'STORE', price: 4900 },
  { key: 'SHOP', price: 9900 },
  { key: 'BUSINESS', price: 14900 },
];

export function StoresPage() {
  const { t, language } = useTranslation();
  const fr = language === 'fr';
  const switchBoutique = useAuthStore((s) => s.switchBoutique);
  const [boutiques, setBoutiques] = useState<BoutiqueData[]>([]);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', address: '', phone: '', plan: 'BUSINESS' });
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const [tf, setTf] = useState({ fromId: '', toId: '', productId: '', variant: '', quantity: '1' });
  const [tfProducts, setTfProducts] = useState<TransferProduct[]>([]);
  const [transferring, setTransferring] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/stores');
      const list: BoutiqueData[] = data.data;
      setBoutiques(list);
      if (list.length > 1) {
        const [ov, tr] = await Promise.all([api.get('/stores/overview'), api.get('/stores/transfers')]);
        setOverview(ov.data.data);
        setTransfers(tr.data.data);
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const loadTfProducts = (fromId: string) => {
    setTfProducts([]);
    if (!fromId) return;
    api.get(`/stores/${fromId}/products`)
      .then(({ data }) => setTfProducts(data.data))
      .catch((err) => toast.error(getApiErrorMessage(err)));
  };

  const includedUsed = boutiques.some((b) => b.included);

  const openForm = (b?: BoutiqueData) => {
    setForm({ name: b?.name || '', address: b?.address || '', phone: b?.phone || '', plan: 'BUSINESS' });
    setEditingId(b?.id || null);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      if (editingId) {
        await api.put(`/stores/${editingId}`, form);
        toast.success(fr ? 'Boutique mise à jour' : 'Store updated');
      } else {
        const { data } = await api.post('/stores', form);
        toast.success(data.data.included
          ? (fr ? 'Boutique créée — incluse dans BUSINESS' : 'Store created — included in BUSINESS')
          : (fr ? 'Boutique créée — ouvrez-la et payez son abonnement pour l’utiliser' : 'Store created — open it and pay its subscription to use it'));
        await useAuthStore.getState().fetchMe();
      }
      setShowForm(false);
      setEditingId(null);
      load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, t('common.error') || 'Error'));
    } finally { setSubmitting(false); }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/stores/${deleteTarget}`);
      toast.success(t('common.deleted') || 'Deleted');
      await useAuthStore.getState().fetchMe();
      load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, t('common.error') || 'Error'));
    } finally { setDeleteTarget(null); }
  };

  const open = (id: string) => switchBoutique(id).catch((err) => toast.error(getApiErrorMessage(err)));

  const selectedProduct = tfProducts.find((p) => p.id === tf.productId);
  const variants = selectedProduct?.variants?.length ? selectedProduct.variants : null;
  const available = variants ? variants.find((v) => v.name === tf.variant)?.stock ?? 0 : selectedProduct?.totalStock ?? 0;

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (transferring) return;
    setTransferring(true);
    try {
      await api.post('/stores/transfers', {
        fromId: tf.fromId,
        toId: tf.toId,
        productId: tf.productId,
        variant: tf.variant || null,
        quantity: Number(tf.quantity),
      });
      toast.success(fr ? 'Stock transféré' : 'Stock transferred');
      setTf({ ...tf, productId: '', variant: '', quantity: '1' });
      loadTfProducts(tf.fromId);
      load();
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally { setTransferring(false); }
  };

  const statusBadge = (b: BoutiqueData) => {
    const s = b.subscription?.status;
    if (s === 'ACTIVE') return <Badge variant="success">{fr ? 'Actif' : 'Active'}</Badge>;
    if (s === 'TRIAL') return <Badge variant="secondary">{fr ? 'Essai' : 'Trial'}</Badge>;
    return <Badge variant="destructive">{fr ? 'À payer' : 'Unpaid'}</Badge>;
  };

  const selectClass = 'w-full rounded-md border bg-background px-3 py-2 text-sm';

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-kabrak-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Store className="w-6 h-6" /> {t('nav.stores')}
        </h1>
        <Button onClick={() => openForm()}>
          <Plus className="w-4 h-4 mr-2" /> {fr ? 'Ajouter une boutique' : 'Add a store'}
        </Button>
      </div>

      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-100">
        {fr
          ? 'BUSINESS inclut 2 boutiques. Chaque boutique a son propre stock, ses clients, ses employés, sa caisse et ses rapports. À partir de la 3e boutique, chaque boutique a son propre abonnement.'
          : 'BUSINESS includes 2 stores. Each store has its own stock, clients, staff, register and reports. From the 3rd store on, each store has its own subscription.'}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {boutiques.map((b) => (
          <Card key={b.id} className={b.isCurrent ? 'border-2 border-kabrak-500' : ''}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="min-w-0">
                  <h3 className="font-bold text-lg truncate">{b.name}</h3>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {b.isMain && <Badge variant="default">{fr ? 'Principale' : 'Main'}</Badge>}
                    {b.included && <Badge variant="secondary">{fr ? 'Incluse dans BUSINESS' : 'Included in BUSINESS'}</Badge>}
                    {!b.isMain && !b.included && <Badge variant="outline">{b.plan}</Badge>}
                  </div>
                </div>
                {statusBadge(b)}
              </div>
              {b.address && <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1"><MapPin className="w-3 h-3" /> {b.address}</div>}
              {b.phone && <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1"><Phone className="w-3 h-3" /> {b.phone}</div>}
              <div className="flex gap-4 text-sm my-3">
                <span className="flex items-center gap-1"><Users className="w-3 h-3 text-muted-foreground" /> {b.users} {fr ? 'utilisateurs' : 'users'}</span>
                <span className="flex items-center gap-1"><Package className="w-3 h-3 text-muted-foreground" /> {b.products} {fr ? 'produits' : 'products'}</span>
              </div>
              <div className="flex gap-2">
                {b.isCurrent ? (
                  <Button size="sm" variant="secondary" disabled className="flex-1">{fr ? 'Vous êtes ici' : 'You are here'}</Button>
                ) : (
                  <Button size="sm" onClick={() => open(b.id)} className="flex-1">
                    <LogIn className="w-3 h-3 mr-1" /> {fr ? 'Ouvrir' : 'Open'}
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => openForm(b)} aria-label={t('common.edit')}>
                  <Pencil className="w-3 h-3" />
                </Button>
                {!b.isMain && (
                  <Button variant="outline" size="sm" onClick={() => setDeleteTarget(b.id)} className="text-red-500" aria-label={t('common.delete') || 'Delete'}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {overview && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><BarChart3 className="w-5 h-5" /> {fr ? 'Vue d’ensemble' : 'Overview'}</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b">
                  <th className="py-2 pr-3">{fr ? 'Boutique' : 'Store'}</th>
                  <th className="py-2 pr-3 text-right">{fr ? 'Ventes du jour' : 'Sales today'}</th>
                  <th className="py-2 pr-3 text-right">{fr ? 'Encaissé du jour' : 'Received today'}</th>
                  <th className="py-2 pr-3 text-right">{fr ? 'Ventes du mois' : 'Sales this month'}</th>
                  {overview.total.stockCapital !== undefined && <th className="py-2 pr-3 text-right">{fr ? 'Capital en stock' : 'Stock capital'}</th>}
                  <th className="py-2 pr-3 text-right">{fr ? 'Valeur de vente du stock' : 'Stock sale value'}</th>
                  <th className="py-2 pr-3 text-right">{fr ? 'Dettes clients' : 'Client debts'}</th>
                  <th className="py-2 text-right">{fr ? 'Stock bas' : 'Low stock'}</th>
                </tr>
              </thead>
              <tbody>
                {overview.boutiques.map((r) => (
                  <tr key={r.id} className="border-b">
                    <td className="py-2 pr-3 font-medium">{r.name}</td>
                    <td className="py-2 pr-3 text-right">{formatCurrency(r.salesToday)} <span className="text-muted-foreground">({r.ordersToday})</span></td>
                    <td className="py-2 pr-3 text-right">{formatCurrency(r.receivedToday)}</td>
                    <td className="py-2 pr-3 text-right">{formatCurrency(r.salesMonth)}</td>
                    {r.stockCapital !== undefined && <td className="py-2 pr-3 text-right">{formatCurrency(r.stockCapital)}</td>}
                    <td className="py-2 pr-3 text-right">{formatCurrency(r.stockRetailValue)}</td>
                    <td className="py-2 pr-3 text-right">{formatCurrency(r.debts)}</td>
                    <td className="py-2 text-right">{r.lowStock}</td>
                  </tr>
                ))}
                <tr className="font-bold">
                  <td className="py-2 pr-3">{fr ? 'Total' : 'Total'}</td>
                  <td className="py-2 pr-3 text-right">{formatCurrency(overview.total.salesToday)}</td>
                  <td className="py-2 pr-3 text-right">{formatCurrency(overview.total.receivedToday)}</td>
                  <td className="py-2 pr-3 text-right">{formatCurrency(overview.total.salesMonth)}</td>
                  {overview.total.stockCapital !== undefined && <td className="py-2 pr-3 text-right">{formatCurrency(overview.total.stockCapital)}</td>}
                  <td className="py-2 pr-3 text-right">{formatCurrency(overview.total.stockRetailValue)}</td>
                  <td className="py-2 pr-3 text-right">{formatCurrency(overview.total.debts)}</td>
                  <td className="py-2 text-right">{overview.total.lowStock}</td>
                </tr>
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {boutiques.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ArrowRightLeft className="w-5 h-5" /> {fr ? 'Transférer du stock' : 'Transfer stock'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleTransfer} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="text-sm font-medium">
                {fr ? 'De la boutique' : 'From store'}
                <select className={selectClass} value={tf.fromId} required onChange={(e) => { setTf({ ...tf, fromId: e.target.value, productId: '', variant: '' }); loadTfProducts(e.target.value); }}>
                  <option value="">—</option>
                  {boutiques.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </label>
              <label className="text-sm font-medium">
                {fr ? 'Vers la boutique' : 'To store'}
                <select className={selectClass} value={tf.toId} required onChange={(e) => setTf({ ...tf, toId: e.target.value })}>
                  <option value="">—</option>
                  {boutiques.filter((b) => b.id !== tf.fromId).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </label>
              <label className="text-sm font-medium">
                {fr ? 'Produit' : 'Product'}
                <select className={selectClass} value={tf.productId} required disabled={!tf.fromId} onChange={(e) => setTf({ ...tf, productId: e.target.value, variant: '' })}>
                  <option value="">—</option>
                  {tfProducts.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.totalStock})</option>)}
                </select>
              </label>
              {variants && (
                <label className="text-sm font-medium">
                  {fr ? 'Variante' : 'Variant'}
                  <select className={selectClass} value={tf.variant} required onChange={(e) => setTf({ ...tf, variant: e.target.value })}>
                    <option value="">—</option>
                    {variants.map((v) => <option key={v.name} value={v.name}>{v.name} ({v.stock})</option>)}
                  </select>
                </label>
              )}
              <label className="text-sm font-medium">
                {fr ? 'Quantité (unités)' : 'Quantity (units)'}
                <Input type="number" min={1} max={available || undefined} value={tf.quantity} required onChange={(e) => setTf({ ...tf, quantity: e.target.value })} />
                {selectedProduct && <span className="text-xs text-muted-foreground">{fr ? `Disponible : ${available}` : `Available: ${available}`}</span>}
              </label>
              <div className="flex items-end">
                <Button type="submit" className="w-full" disabled={transferring || !tf.productId || !tf.toId}>
                  {transferring ? '...' : (fr ? 'Transférer' : 'Transfer')}
                </Button>
              </div>
            </form>
            <p className="text-xs text-muted-foreground">
              {fr
                ? 'Si l’autre boutique n’a pas encore ce produit, il y est créé automatiquement avec les mêmes prix.'
                : 'If the other store doesn’t have this product yet, it is created there with the same prices.'}
            </p>
            {transfers.length > 0 && (
              <div className="divide-y text-sm">
                {transfers.map((tr) => (
                  <div key={tr.id} className="flex flex-wrap justify-between gap-2 py-2">
                    <span><b>{tr.quantity}</b> × {tr.productName}{tr.variant ? ` · ${tr.variant}` : ''} — {tr.fromTenant.name} → {tr.toTenant.name}</span>
                    <span className="text-muted-foreground">{formatDateTime(tr.createdAt)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{editingId ? t('common.edit') : (fr ? 'Ajouter une boutique' : 'Add a store')}</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setShowForm(false)}>
                <X className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">{fr ? 'Nom de la boutique' : 'Store name'}</label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required minLength={2} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">{fr ? 'Adresse' : 'Address'}</label>
                  <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">{fr ? 'Téléphone' : 'Phone'}</label>
                  <Input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
                {!editingId && (includedUsed ? (
                  <div>
                    <label className="text-sm font-medium mb-1 block">{fr ? 'Abonnement de cette boutique' : 'Subscription for this store'}</label>
                    <select className={selectClass} value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })}>
                      {PLANS.map((p) => <option key={p.key} value={p.key}>{p.key} — {p.price.toLocaleString('fr-FR')} FCFA / {fr ? 'mois' : 'month'}</option>)}
                    </select>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {fr
                        ? 'Vos 2 boutiques incluses sont déjà utilisées. Cette boutique aura son propre abonnement : ouvrez-la puis payez-le pour l’utiliser.'
                        : 'Your 2 included stores are already used. This store gets its own subscription: open it, then pay to use it.'}
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {fr ? 'Cette 2e boutique est incluse dans votre abonnement BUSINESS.' : 'This 2nd store is included in your BUSINESS subscription.'}
                  </p>
                ))}
                <div className="flex gap-3">
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="flex-1">{t('common.cancel')}</Button>
                  <Button type="submit" className="flex-1" disabled={submitting}>{submitting ? '...' : t('common.save')}</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
      <ConfirmDialog
        open={!!deleteTarget}
        message={fr ? 'Supprimer cette boutique ? Possible seulement si elle n’a encore ni produits, ni ventes, ni employés.' : 'Delete this store? Only possible if it has no products, sales or staff yet.'}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
