import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Search, ScanLine, Trash2, X, PackagePlus, ChevronDown, ChevronUp, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BarcodeScanner } from '@/components/BarcodeScanner';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useTranslation } from '@/i18n/useTranslation';
import { useAuthStore } from '@/stores/authStore';
import { useDebounce } from '@/hooks/useDebounce';
import api, { getApiErrorMessage } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

interface ProductLite {
  id: string;
  name: string;
  barcode?: string | null;
  costPrice: number;
  sellingPrice: number;
  totalStock: number;
  packSize?: number | null;
  packName?: string | null;
  variants?: Array<{ name: string; costPrice: number; sellingPrice: number; stock: number }> | null;
}
interface Line { key: string; product: ProductLite; variant: string; quantity: string; unitCost: string; sellingPrice: string }
interface Purchase {
  id: string;
  number: number;
  date: string;
  total: number;
  amountPaid: number;
  status: 'RECEIVED' | 'CANCELLED';
  note?: string | null;
  items: Array<{ name: string; variant: string | null; quantity: number; unitCost: number }>;
  supplier?: { id: string; name: string; phone?: string | null } | null;
  createdBy?: { firstName: string; lastName: string } | null;
}
interface Supplier { id: string; name: string }

const METHODS = [
  ['CASH', 'Espèces', 'Cash'], ['MOBILE_MONEY', 'Mobile Money', 'Mobile Money'], ['ORANGE_MONEY', 'Orange Money', 'Orange Money'],
  ['MTN_MOMO', 'MTN MoMo', 'MTN MoMo'], ['BANK_TRANSFER', 'Virement', 'Bank transfer'], ['OTHER', 'Autre', 'Other'],
] as const;
const today = () => new Date().toISOString().slice(0, 10);
const variantsOf = (p: ProductLite) => (Array.isArray(p.variants) ? p.variants : []);
const selectCls = 'w-full h-9 rounded-md border border-input bg-background px-3 text-sm';

export function PurchasesPage() {
  const { language } = useTranslation();
  const fr = language === 'fr';
  const tenant = useAuthStore((s) => s.tenant);
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const supplierFilter = params.get('supplier') || '';

  const [rows, setRows] = useState<Purchase[]>([]);
  const [summary, setSummary] = useState({ monthTotal: 0, monthCount: 0, owed: 0 });
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [open, setOpen] = useState<string | null>(null);

  const [showNew, setShowNew] = useState(params.get('new') === '1');
  const [supplierId, setSupplierId] = useState(supplierFilter);
  const [date, setDate] = useState(today());
  const [note, setNote] = useState('');
  const [lines, setLines] = useState<Line[]>([]);
  const [paid, setPaid] = useState<string>('');
  const [method, setMethod] = useState('CASH');
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const debounced = useDebounce(search);
  const [results, setResults] = useState<ProductLite[]>([]);
  const [scanning, setScanning] = useState(false);
  const [quick, setQuick] = useState<{ name: string; barcode: string; sellingPrice: string } | null>(null);

  const [payTarget, setPayTarget] = useState<Purchase | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('CASH');
  const [cancelTarget, setCancelTarget] = useState<Purchase | null>(null);

  const fetchRows = useCallback(async () => {
    try {
      const res = await api.get('/purchases', { params: { limit: 50, supplierId: supplierFilter || undefined } });
      setRows(res.data.data || []);
      setSummary(res.data.summary);
    } catch (err) { toast.error(getApiErrorMessage(err)); }
  }, [supplierFilter]);

  useEffect(() => { fetchRows(); }, [fetchRows]);
  useEffect(() => {
    api.get('/suppliers', { params: { limit: 100 } }).then((r) => setSuppliers(r.data.data || [])).catch(() => setSuppliers([]));
  }, []);
  useEffect(() => {
    if (!debounced.trim()) return;
    let live = true;
    api.get('/products', { params: { search: debounced.trim(), limit: 8 } })
      .then((r) => { if (live) setResults(r.data.data || []); })
      .catch(() => { if (live) setResults([]); });
    return () => { live = false; };
  }, [debounced]);

  const addLine = (product: ProductLite, variant = '') => {
    const v = variantsOf(product).find((x) => x.name === variant);
    setLines((ls) => {
      const same = ls.find((l) => l.product.id === product.id && l.variant === variant);
      if (same) return ls.map((l) => (l === same ? { ...l, quantity: String((parseInt(l.quantity) || 0) + 1) } : l));
      return [...ls, {
        key: `${product.id}-${variant}-${Date.now()}`, product, variant, quantity: '1',
        unitCost: String((v ? v.costPrice : product.costPrice) || ''), sellingPrice: '',
      }];
    });
    setSearch('');
  };
  const setLine = (key: string, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const onScan = async (code: string) => {
    setScanning(false);
    try {
      const r = await api.get(`/products/barcode/${encodeURIComponent(code)}`);
      addLine(r.data.data, r.data.variant || '');
    } catch {
      toast(fr ? 'Produit inconnu : créez-le ci-dessous' : 'Unknown product: create it below');
      setQuick({ name: '', barcode: code, sellingPrice: '' });
    }
  };

  const createQuick = async () => {
    if (!quick?.name.trim()) return;
    try {
      const r = await api.post('/products', {
        name: quick.name.trim(),
        businessType: tenant?.businessCategories?.[0] || 'OTHER',
        sellingPrice: Number(quick.sellingPrice) || 0,
        costPrice: 0,
        totalStock: 0,
        barcode: quick.barcode.trim() || undefined,
      });
      addLine(r.data.data);
      setQuick(null);
    } catch (err) { toast.error(getApiErrorMessage(err)); }
  };

  const total = lines.reduce((s, l) => s + (parseInt(l.quantity) || 0) * (Number(l.unitCost) || 0), 0);
  const paidNow = paid === '' ? total : Math.min(total, Number(paid) || 0);

  const reset = () => {
    setLines([]); setPaid(''); setNote(''); setDate(today()); setQuick(null); setSearch('');
    setShowNew(false);
    if (params.get('new')) { params.delete('new'); setParams(params, { replace: true }); }
  };

  const save = async () => {
    if (!lines.length) { toast.error(fr ? 'Ajoutez au moins un article' : 'Add at least one item'); return; }
    const noVariant = lines.find((l) => variantsOf(l.product).length > 0 && !l.variant);
    if (noVariant) { toast.error(fr ? `Choisissez la taille / variante de « ${noVariant.product.name} »` : `Choose the variant of "${noVariant.product.name}"`); return; }
    if (lines.some((l) => !(parseInt(l.quantity) > 0))) { toast.error(fr ? 'Indiquez les quantités reçues' : 'Enter the quantities received'); return; }
    setSaving(true);
    try {
      await api.post('/purchases', {
        supplierId: supplierId || undefined,
        date,
        note: note || undefined,
        amountPaid: paidNow,
        paymentMethod: method,
        items: lines.map((l) => ({
          productId: l.product.id,
          variant: l.variant || undefined,
          quantity: parseInt(l.quantity),
          unitCost: Number(l.unitCost) || 0,
          sellingPrice: l.sellingPrice === '' ? undefined : Number(l.sellingPrice),
        })),
      });
      toast.success(fr ? 'Arrivage enregistré, stock mis à jour' : 'Arrival saved, stock updated');
      reset();
      fetchRows();
    } catch (err) {
      toast.error(getApiErrorMessage(err, fr ? "Échec de l'enregistrement" : 'Failed to save'));
    } finally { setSaving(false); }
  };

  const submitPay = async () => {
    if (!payTarget) return;
    try {
      await api.post(`/purchases/${payTarget.id}/pay`, { amount: Number(payAmount), paymentMethod: payMethod });
      toast.success(fr ? 'Paiement enregistré' : 'Payment saved');
      setPayTarget(null);
      fetchRows();
    } catch (err) { toast.error(getApiErrorMessage(err)); }
  };
  const confirmCancel = async () => {
    if (!cancelTarget) return;
    try {
      await api.post(`/purchases/${cancelTarget.id}/cancel`);
      toast.success(fr ? 'Arrivage annulé, stock retiré' : 'Arrival cancelled, stock removed');
      fetchRows();
    } catch (err) { toast.error(getApiErrorMessage(err)); } finally { setCancelTarget(null); }
  };

  const filterName = suppliers.find((s) => s.id === supplierFilter)?.name;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-bold text-foreground">{fr ? 'Achats / Arrivages' : 'Purchases / Arrivals'}</h1>
        <Button onClick={() => { setSupplierId(supplierFilter); setShowNew(true); }}>
          <Plus className="w-4 h-4 mr-1" />{fr ? 'Nouvel arrivage' : 'New arrival'}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">{fr ? 'Achats du mois' : 'Purchases this month'}</p>
          <p className="text-lg font-bold">{formatCurrency(summary.monthTotal)}</p>
          <p className="text-xs text-muted-foreground">{summary.monthCount} {fr ? 'arrivage(s)' : 'arrival(s)'}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">{fr ? 'Reste à payer aux fournisseurs' : 'Owed to suppliers'}</p>
          <p className={`text-lg font-bold ${summary.owed > 0 ? 'text-red-600' : ''}`}>{formatCurrency(summary.owed)}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <select className={`${selectCls} max-w-xs`} value={supplierFilter} onChange={(e) => { if (e.target.value) params.set('supplier', e.target.value); else params.delete('supplier'); setParams(params, { replace: true }); }}>
          <option value="">{fr ? 'Tous les fournisseurs' : 'All suppliers'}</option>
          {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <Button variant="outline" size="sm" onClick={() => navigate('/suppliers')}><Building2 className="w-4 h-4 mr-1" />{fr ? 'Fournisseurs' : 'Suppliers'}</Button>
      </div>

      <div className="bg-card border border-border rounded-xl divide-y divide-border">
        {rows.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            {filterName ? (fr ? `Aucun arrivage de ${filterName}` : `No arrival from ${filterName}`) : (fr ? 'Aucun arrivage. Touchez « Nouvel arrivage » quand la marchandise arrive : le stock se met à jour tout seul.' : 'No arrival yet. Tap "New arrival" when goods arrive: stock updates automatically.')}
          </div>
        ) : rows.map((p) => {
          const due = Math.max(0, p.total - p.amountPaid);
          const cancelled = p.status === 'CANCELLED';
          return (
            <div key={p.id} className={`p-4 ${cancelled ? 'opacity-50' : ''}`}>
              <button className="w-full flex items-start justify-between gap-3 text-left" onClick={() => setOpen(open === p.id ? null : p.id)}>
                <div className="min-w-0">
                  <p className="font-semibold">
                    {fr ? 'Achat' : 'Purchase'} N°{p.number} · {p.supplier?.name || (fr ? 'Sans fournisseur' : 'No supplier')}
                    {cancelled && <span className="ml-2 text-xs text-red-600">{fr ? 'annulé' : 'cancelled'}</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(p.date).toLocaleDateString(fr ? 'fr-FR' : 'en-GB')} · {p.items.length} {fr ? 'article(s)' : 'item(s)'} · +{p.items.reduce((s, i) => s + i.quantity, 0)} {fr ? 'en stock' : 'in stock'}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold">{formatCurrency(p.total)}</p>
                  {!cancelled && (due > 0
                    ? <p className="text-xs text-red-600">{fr ? 'Reste' : 'Due'} {formatCurrency(due)}</p>
                    : <p className="text-xs text-green-600">{fr ? 'Payé' : 'Paid'}</p>)}
                </div>
                {open === p.id ? <ChevronUp className="w-4 h-4 mt-1 shrink-0" /> : <ChevronDown className="w-4 h-4 mt-1 shrink-0" />}
              </button>
              {open === p.id && (
                <div className="mt-3 space-y-2 text-sm">
                  {p.items.map((i, k) => (
                    <div key={k} className="flex justify-between gap-2">
                      <span className="truncate">{i.name}{i.variant ? ` · ${i.variant}` : ''} × {i.quantity}</span>
                      <span className="shrink-0">{formatCurrency(i.quantity * i.unitCost)}</span>
                    </div>
                  ))}
                  {p.note && <p className="text-xs italic text-muted-foreground">{p.note}</p>}
                  {p.createdBy && <p className="text-xs text-muted-foreground">{fr ? 'Saisi par' : 'Recorded by'} {p.createdBy.firstName} {p.createdBy.lastName}</p>}
                  {!cancelled && (
                    <div className="flex gap-2 pt-1">
                      {due > 0 && <Button size="sm" onClick={() => { setPayTarget(p); setPayAmount(String(due)); setPayMethod('CASH'); }}>{fr ? 'Payer le fournisseur' : 'Pay supplier'}</Button>}
                      <Button size="sm" variant="outline" onClick={() => setCancelTarget(p)}>{fr ? 'Annuler cet arrivage' : 'Cancel this arrival'}</Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showNew && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center sm:p-4">
          <div className="bg-card w-full sm:max-w-2xl max-h-[95vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg">{fr ? 'Nouvel arrivage' : 'New arrival'}</h3>
              <Button variant="ghost" size="icon" onClick={reset}><X className="w-4 h-4" /></Button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <select className={selectCls} value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                <option value="">{fr ? 'Fournisseur (optionnel)' : 'Supplier (optional)'}</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <Input type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value)} />
            </div>

            <div className="relative">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input className="pl-9" placeholder={fr ? 'Chercher un produit ou code-barres…' : 'Search a product or barcode…'} value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <Button variant="outline" size="icon" onClick={() => setScanning(true)} title={fr ? 'Scanner' : 'Scan'}><ScanLine className="w-4 h-4" /></Button>
              </div>
              {search.trim() !== '' && results.length > 0 && (
                <div className="absolute z-10 left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg max-h-64 overflow-y-auto">
                  {results.map((p) => {
                    const vs = variantsOf(p);
                    return vs.length ? vs.map((v) => (
                      <button key={`${p.id}-${v.name}`} className="w-full text-left px-3 py-2 hover:bg-accent text-sm flex justify-between" onClick={() => addLine(p, v.name)}>
                        <span>{p.name} · {v.name}</span><span className="text-muted-foreground">{fr ? 'stock' : 'stock'} {v.stock}</span>
                      </button>
                    )) : (
                      <button key={p.id} className="w-full text-left px-3 py-2 hover:bg-accent text-sm flex justify-between" onClick={() => addLine(p)}>
                        <span>{p.name}</span><span className="text-muted-foreground">{fr ? 'stock' : 'stock'} {p.totalStock}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            {!quick && (
              <button className="text-sm text-blue-600 flex items-center gap-1" onClick={() => setQuick({ name: search, barcode: '', sellingPrice: '' })}>
                <PackagePlus className="w-4 h-4" />{fr ? 'Produit nouveau ? Le créer ici' : 'New product? Create it here'}
              </button>
            )}
            {quick && (
              <div className="border border-dashed border-border rounded-lg p-3 space-y-2">
                <Input placeholder={fr ? 'Nom du nouveau produit *' : 'New product name *'} value={quick.name} onChange={(e) => setQuick({ ...quick, name: e.target.value })} />
                <div className="grid grid-cols-2 gap-2">
                  <Input type="number" min={0} placeholder={fr ? 'Prix de vente' : 'Selling price'} value={quick.sellingPrice} onChange={(e) => setQuick({ ...quick, sellingPrice: e.target.value })} />
                  <Input placeholder={fr ? 'Code-barres (optionnel)' : 'Barcode (optional)'} value={quick.barcode} onChange={(e) => setQuick({ ...quick, barcode: e.target.value })} />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={createQuick} disabled={!quick.name.trim()}>{fr ? 'Créer et ajouter' : 'Create and add'}</Button>
                  <Button size="sm" variant="ghost" onClick={() => setQuick(null)}>{fr ? 'Annuler' : 'Cancel'}</Button>
                </div>
              </div>
            )}

            {lines.length > 0 && (
              <div className="space-y-2">
                {lines.map((l) => {
                  const vs = variantsOf(l.product);
                  const pack = l.product.packSize && l.product.packSize > 1 ? l.product.packSize : 0;
                  return (
                    <div key={l.key} className="border border-border rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium text-sm truncate">{l.product.name}</p>
                        <button onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))}><Trash2 className="w-4 h-4 text-muted-foreground hover:text-red-500" /></button>
                      </div>
                      {vs.length > 0 && (
                        <select className={selectCls} value={l.variant} onChange={(e) => setLine(l.key, { variant: e.target.value })}>
                          <option value="">{fr ? 'Taille / variante' : 'Size / variant'}</option>
                          {vs.map((v) => <option key={v.name} value={v.name}>{v.name}</option>)}
                        </select>
                      )}
                      <div className="grid grid-cols-3 gap-2">
                        <label className="text-xs text-muted-foreground">{fr ? 'Qté reçue' : 'Qty received'}
                          <Input type="number" min={1} value={l.quantity} onChange={(e) => setLine(l.key, { quantity: e.target.value })} />
                        </label>
                        <label className="text-xs text-muted-foreground">{fr ? "Prix d'achat unité" : 'Unit cost'}
                          <Input type="number" min={0} value={l.unitCost} onChange={(e) => setLine(l.key, { unitCost: e.target.value })} />
                        </label>
                        <label className="text-xs text-muted-foreground">{fr ? 'Nouveau prix vente' : 'New selling price'}
                          <Input type="number" min={0} placeholder={String(vs.find((v) => v.name === l.variant)?.sellingPrice ?? l.product.sellingPrice)} value={l.sellingPrice} onChange={(e) => setLine(l.key, { sellingPrice: e.target.value })} />
                        </label>
                      </div>
                      {pack > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {fr ? `En unités. 1 ${(l.product.packName || 'paquet').toLowerCase()} = ${pack}` : `In units. 1 ${(l.product.packName || 'pack').toLowerCase()} = ${pack}`}
                          {' · '}
                          <button className="text-blue-600" onClick={() => setLine(l.key, { quantity: String((parseInt(l.quantity) || 1) * pack), unitCost: l.unitCost ? String(Math.round((Number(l.unitCost) / pack) * 100) / 100) : l.unitCost })}>
                            {fr ? `J'ai saisi en ${(l.product.packName || 'paquet').toLowerCase()}s` : 'I entered packs'}
                          </button>
                        </p>
                      )}
                      <p className="text-xs text-right text-muted-foreground">{formatCurrency((parseInt(l.quantity) || 0) * (Number(l.unitCost) || 0))}</p>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="border-t border-border pt-3 space-y-2">
              <div className="flex justify-between font-bold"><span>{fr ? 'Total de l\'arrivage' : 'Arrival total'}</span><span>{formatCurrency(total)}</span></div>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs text-muted-foreground">{fr ? 'Payé maintenant' : 'Paid now'}
                  <Input type="number" min={0} placeholder={String(total)} value={paid} onChange={(e) => setPaid(e.target.value)} />
                </label>
                <label className="text-xs text-muted-foreground">{fr ? 'Moyen de paiement' : 'Payment method'}
                  <select className={selectCls} value={method} onChange={(e) => setMethod(e.target.value)}>
                    {METHODS.map(([k, f, e]) => <option key={k} value={k}>{fr ? f : e}</option>)}
                  </select>
                </label>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant={paid === '' ? 'default' : 'outline'} onClick={() => setPaid('')}>{fr ? 'Tout payé' : 'Paid in full'}</Button>
                <Button size="sm" variant={paid === '0' ? 'default' : 'outline'} onClick={() => setPaid('0')}>{fr ? 'À crédit (je paie plus tard)' : 'On credit (pay later)'}</Button>
              </div>
              {total - paidNow > 0 && <p className="text-sm text-red-600">{fr ? 'Reste à payer au fournisseur' : 'Still owed to supplier'} : {formatCurrency(total - paidNow)}</p>}
              <Input placeholder={fr ? 'Note (n° bon de livraison…)' : 'Note (delivery note no.…)'} value={note} onChange={(e) => setNote(e.target.value)} />
              <Button className="w-full" disabled={saving || !lines.length} onClick={save}>
                {saving ? (fr ? 'Enregistrement…' : 'Saving…') : (fr ? 'Enregistrer et ajouter au stock' : 'Save and add to stock')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {scanning && <BarcodeScanner onScan={onScan} onClose={() => setScanning(false)} />}

      {payTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setPayTarget(null)}>
          <div className="bg-card rounded-2xl w-full max-w-sm p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold">{fr ? 'Payer' : 'Pay'} {payTarget.supplier?.name || ''} · N°{payTarget.number}</h3>
            <Input type="number" min={1} value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />
            <select className={selectCls} value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
              {METHODS.map(([k, f, e]) => <option key={k} value={k}>{fr ? f : e}</option>)}
            </select>
            <Button className="w-full" onClick={submitPay} disabled={!(Number(payAmount) > 0)}>{fr ? 'Enregistrer le paiement' : 'Save payment'}</Button>
          </div>
        </div>
      )}
      <ConfirmDialog
        open={!!cancelTarget}
        message={fr ? 'Annuler cet arrivage ? Les quantités seront retirées du stock et ses paiements retirés des dépenses.' : 'Cancel this arrival? Quantities are removed from stock and its payments from expenses.'}
        onConfirm={confirmCancel}
        onCancel={() => setCancelTarget(null)}
      />
    </div>
  );
}
