import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Lock, Unlock, Printer, MessageCircle, X, History } from 'lucide-react';
import api, { getApiErrorMessage } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { useOfflineStatus } from '@/lib/offline';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import toast from 'react-hot-toast';

interface Summary {
  orders: number; itemsSold: number; sales: number; discounts: number; received: number;
  byMethod: Record<string, number>; sellers: Array<{ name: string; orders: number; sales: number; items?: Array<{ name: string; quantity: number; amount: number }> }>;
  topProducts: Array<{ name: string; quantity: number; amount: number }>;
  cancelled: { count: number; amount: number };
  cost?: number; grossProfit?: number; expenses: number; cashExpenses: number; netProfit?: number;
  cashIn?: number;
}
interface Person { firstName: string; lastName: string }
interface CashSession {
  id: string; number: number; status: 'OPEN' | 'CLOSED';
  openingFloat: number; countedCash: number | null; expectedCash: number | null; difference: number | null;
  openingNote: string | null; closingNote: string | null;
  openedAt: string; closedAt: string | null;
  openedBy?: Person; closedBy?: Person | null;
  summary?: Summary | null;
  // live (current session only)
  cashIn?: number;
}
type Live = CashSession & { summary: Summary; cashIn: number; expectedCash: number };

const METHODS: Record<string, { fr: string; en: string }> = {
  CASH: { fr: 'Espèces', en: 'Cash' },
  MOBILE_MONEY: { fr: 'Mobile Money', en: 'Mobile Money' },
  ORANGE_MONEY: { fr: 'Orange Money', en: 'Orange Money' },
  MTN_MOMO: { fr: 'MTN MoMo', en: 'MTN MoMo' },
  BANK_TRANSFER: { fr: 'Virement', en: 'Bank transfer' },
  OTHER: { fr: 'Autre', en: 'Other' },
};

const name = (p?: Person | null) => (p ? `${p.firstName} ${p.lastName}`.trim() : '');
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

function zLines(z: CashSession, shop: string, fr: boolean): Array<[string, string] | string> {
  const s = z.summary as Summary;
  const lang = fr ? 'fr' : 'en';
  const dt = (d: string | null) => (d ? new Date(d).toLocaleString(fr ? 'fr-FR' : 'en-US', { dateStyle: 'short', timeStyle: 'short' }) : '-');
  const diff = z.difference ?? 0;
  return [
    `# ${shop}`,
    `# ${fr ? 'RAPPORT Z' : 'Z REPORT'} N° ${z.number}`,
    '---',
    [fr ? 'Ouverture' : 'Opened', dt(z.openedAt)],
    [fr ? 'Par' : 'By', name(z.openedBy)],
    [fr ? 'Fermeture' : 'Closed', dt(z.closedAt)],
    [fr ? 'Par' : 'By', name(z.closedBy)],
    '---',
    [fr ? 'Ventes' : 'Sales', String(s.orders)],
    [fr ? 'Articles' : 'Items', String(s.itemsSold)],
    [fr ? 'Total ventes' : 'Total sales', formatCurrency(s.sales)],
    ...(s.discounts > 0 ? [[fr ? 'Remises' : 'Discounts', formatCurrency(s.discounts)] as [string, string]] : []),
    ...(s.cancelled?.count ? [[fr ? `Annulées (${s.cancelled.count})` : `Cancelled (${s.cancelled.count})`, formatCurrency(s.cancelled.amount)] as [string, string]] : []),
    '---',
    `## ${fr ? 'Encaissements' : 'Payments'}`,
    ...Object.entries(s.byMethod).map(([m, v]) => [(METHODS[m] || METHODS.OTHER)[lang], formatCurrency(v)] as [string, string]),
    [fr ? 'Total encaissé' : 'Total received', formatCurrency(s.received)],
    '---',
    `## ${fr ? 'Tiroir espèces' : 'Cash drawer'}`,
    [fr ? 'Fond de caisse' : 'Opening float', formatCurrency(z.openingFloat)],
    [fr ? '+ Espèces reçues' : '+ Cash received', formatCurrency(s.cashIn ?? s.byMethod.CASH ?? 0)],
    [fr ? '- Sorties espèces' : '- Cash out', formatCurrency(s.cashExpenses)],
    [fr ? '= Attendu' : '= Expected', formatCurrency(z.expectedCash ?? 0)],
    [fr ? 'Compté' : 'Counted', formatCurrency(z.countedCash ?? 0)],
    [diff === 0 ? (fr ? 'Écart' : 'Difference') : diff < 0 ? (fr ? 'MANQUE' : 'SHORT') : (fr ? 'SURPLUS' : 'OVER'), formatCurrency(Math.abs(diff))],
    ...(s.sellers.length ? ['---', `## ${fr ? 'Par vendeur' : 'By seller'}`, ...s.sellers.flatMap((x) => [[`${x.name} (${x.orders})`, formatCurrency(x.sales)] as [string, string], ...(x.items || []).map((it) => [`  ${it.quantity} x ${it.name}`, formatCurrency(it.amount)] as [string, string])])] : []),
    ...(s.topProducts?.length ? ['---', `## ${fr ? 'Articles vendus' : 'Items sold'}`, ...s.topProducts.map((p) => [`${p.quantity} x ${p.name}`, formatCurrency(p.amount)] as [string, string])] : []),
    '---',
    ...(s.grossProfit !== undefined ? [[fr ? 'Bénéfice brut' : 'Gross profit', formatCurrency(s.grossProfit)] as [string, string]] : []),
    [fr ? 'Dépenses' : 'Expenses', formatCurrency(s.expenses)],
    ...(s.netProfit !== undefined ? [[fr ? 'Bénéfice net' : 'Net profit', formatCurrency(s.netProfit)] as [string, string]] : []),
    ...(z.closingNote ? ['---', `${fr ? 'Note' : 'Note'} : ${z.closingNote}`] : []),
  ];
}

export function printZ(z: CashSession, shop: string, fr: boolean, width: '58mm' | '80mm') {
  const rows = zLines(z, shop, fr).map((l) => {
    if (typeof l !== 'string') return `<div class="r"><span>${esc(l[0])}</span><span>${esc(l[1])}</span></div>`;
    if (l === '---') return '<hr/>';
    if (l.startsWith('## ')) return `<div class="h">${esc(l.slice(3))}</div>`;
    return `<div class="t">${esc(l.slice(2))}</div>`;
  }).join('');
  const w = window.open('', '_blank', 'width=420,height=700');
  if (!w) return;
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Z ${z.number}</title><style>
    @page { size: ${width} auto; margin: 2mm; }
    body { width: ${width === '58mm' ? '54mm' : '76mm'}; margin: 0 auto; font: ${width === '58mm' ? '10px' : '12px'}/1.35 monospace; color: #000; }
    .t { text-align: center; font-weight: bold; } .h { font-weight: bold; margin-top: 2px; }
    .r { display: flex; justify-content: space-between; gap: 6px; } .r span:last-child { white-space: nowrap; }
    hr { border: 0; border-top: 1px dashed #000; margin: 4px 0; }
  </style></head><body>${rows}<script>window.onload=function(){window.print();}</script></body></html>`);
  w.document.close();
}

function zText(z: CashSession, shop: string, fr: boolean) {
  return zLines(z, shop, fr).map((l) => (typeof l === 'string' ? (l === '---' ? '' : l.replace(/^#+ /, '*') + (l.startsWith('#') ? '*' : '')) : `${l[0]} : ${l[1]}`)).join('\n');
}

function ZView({ z, onClose }: { z: CashSession; onClose: () => void }) {
  const fr = useAuthStore((s) => s.language) !== 'en';
  const shop = useAuthStore((s) => s.tenant?.name) || 'KABRAK';
  const lines = zLines(z, shop, fr);
  return (
    <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4">
      <Card className="w-full max-w-sm max-h-[90vh] flex flex-col shadow-2xl">
        <CardContent className="p-4 flex flex-col gap-3 min-h-0">
          <div className="flex items-center justify-between">
            <h3 className="font-bold">{fr ? 'Rapport Z' : 'Z report'} N° {z.number}</h3>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"><X className="w-5 h-5" /></button>
          </div>
          <div className="overflow-y-auto font-mono text-xs space-y-0.5 border rounded-lg p-3 bg-white text-black">
            {lines.map((l, i) => typeof l === 'string'
              ? l === '---' ? <hr key={i} className="border-dashed border-gray-400 my-1" />
                : <p key={i} className={l.startsWith('## ') ? 'font-bold' : 'font-bold text-center'}>{l.replace(/^#+ /, '')}</p>
              : <div key={i} className={`flex justify-between gap-2 ${/MANQUE|SHORT/.test(l[0]) ? 'text-red-600 font-bold' : /SURPLUS|OVER/.test(l[0]) ? 'text-amber-600 font-bold' : ''}`}><span>{l[0]}</span><span className="whitespace-nowrap">{l[1]}</span></div>)}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Button variant="outline" size="sm" onClick={() => printZ(z, shop, fr, '58mm')}><Printer className="w-4 h-4 mr-1" />58mm</Button>
            <Button variant="outline" size="sm" onClick={() => printZ(z, shop, fr, '80mm')}><Printer className="w-4 h-4 mr-1" />80mm</Button>
            <Button size="sm" onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(zText(z, shop, fr))}`, '_blank')}><MessageCircle className="w-4 h-4 mr-1" />WhatsApp</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function CashDrawer() {
  const fr = useAuthStore((s) => s.language) !== 'en';
  const lang = fr ? 'fr' : 'en';
  const { pending } = useOfflineStatus();
  const [current, setCurrent] = useState<Live | null>(null);
  const [history, setHistory] = useState<CashSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [floatAmount, setFloatAmount] = useState('');
  const [counted, setCounted] = useState('');
  const [note, setNote] = useState('');
  const [viewZ, setViewZ] = useState<CashSession | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const load = useCallback(async () => {
    try {
      const [cur, hist] = await Promise.all([api.get('/cash-sessions/current'), api.get('/cash-sessions', { params: { limit: 30 } })]);
      setCurrent(cur.data.data);
      setHistory(hist.data.data || []);
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openDrawer = async () => {
    setBusy(true);
    try {
      await api.post('/cash-sessions/open', { openingFloat: Number(floatAmount) || 0, note: note || undefined });
      toast.success(fr ? 'Caisse ouverte' : 'Drawer opened');
      setFloatAmount(''); setNote('');
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err));
      load();
    } finally { setBusy(false); }
  };

  const closeDrawer = async () => {
    if (!current || counted === '') return;
    setBusy(true);
    try {
      const res = await api.post(`/cash-sessions/${current.id}/close`, { countedCash: Number(counted), note: note || undefined });
      toast.success(fr ? 'Caisse fermée' : 'Drawer closed');
      setCounted(''); setNote('');
      setViewZ(res.data.data);
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err));
      load();
    } finally { setBusy(false); }
  };

  if (loading) return null;

  const countedNum = counted === '' ? null : Number(counted);
  const diff = current && countedNum !== null ? countedNum - current.expectedCash : null;

  return (
    <>
      <Card className={current ? 'border-green-300 dark:border-green-800' : 'border-amber-300 dark:border-amber-800'}>
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-semibold flex items-center gap-2">
              {current ? <Unlock className="w-4 h-4 text-green-600" /> : <Lock className="w-4 h-4 text-amber-600" />}
              {current
                ? `${fr ? 'Caisse ouverte' : 'Drawer open'} · N° ${current.number}`
                : (fr ? 'Caisse fermée' : 'Drawer closed')}
            </h3>
            {history.length > 0 && (
              <Button variant="outline" size="sm" onClick={() => setShowHistory((v) => !v)}>
                <History className="w-4 h-4 mr-1" />{fr ? 'Rapports Z' : 'Z reports'} ({history.length})
              </Button>
            )}
          </div>

          {!current ? (
            <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] items-end">
              <div>
                <label className="text-xs text-muted-foreground">{fr ? 'Fond de caisse (monnaie dans le tiroir)' : 'Opening float (change in drawer)'}</label>
                <Input type="number" inputMode="numeric" min={0} placeholder="0" value={floatAmount} onChange={(e) => setFloatAmount(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">{fr ? 'Note (optionnel)' : 'Note (optional)'}</label>
                <Input value={note} onChange={(e) => setNote(e.target.value)} />
              </div>
              <Button onClick={openDrawer} disabled={busy}>{fr ? 'Ouvrir la caisse' : 'Open drawer'}</Button>
            </div>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">
                {fr ? 'Ouverte par' : 'Opened by'} {name(current.openedBy)} · {new Date(current.openedAt).toLocaleString(fr ? 'fr-FR' : 'en-US', { dateStyle: 'short', timeStyle: 'short' })}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                <div className="rounded-lg bg-muted/50 p-2"><p className="text-xs text-muted-foreground">{fr ? 'Fond de caisse' : 'Float'}</p><p className="font-semibold">{formatCurrency(current.openingFloat)}</p></div>
                <div className="rounded-lg bg-muted/50 p-2"><p className="text-xs text-muted-foreground">{fr ? '+ Espèces reçues' : '+ Cash in'}</p><p className="font-semibold">{formatCurrency(current.cashIn)}</p></div>
                <div className="rounded-lg bg-muted/50 p-2"><p className="text-xs text-muted-foreground">{fr ? '- Sorties espèces' : '- Cash out'}</p><p className="font-semibold">{formatCurrency(current.summary.cashExpenses)}</p></div>
                <div className="rounded-lg bg-green-50 dark:bg-green-900/20 p-2"><p className="text-xs text-muted-foreground">{fr ? '= Attendu dans le tiroir' : '= Expected in drawer'}</p><p className="font-bold">{formatCurrency(current.expectedCash)}</p></div>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span>{current.summary.orders} {fr ? 'ventes' : 'sales'} · {formatCurrency(current.summary.sales)}</span>
                {Object.entries(current.summary.byMethod).filter(([m]) => m !== 'CASH').map(([m, v]) => (
                  <span key={m}>{(METHODS[m] || METHODS.OTHER)[lang]} : {formatCurrency(v)}</span>
                ))}
              </div>
              {pending > 0 && (
                <p className="text-xs rounded-lg bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 p-2">
                  {fr ? `${pending} vente(s) hors ligne pas encore envoyée(s). Reconnectez-vous et synchronisez avant de fermer, sinon elles ne seront pas dans ce Z.` : `${pending} offline sale(s) not synced yet. Reconnect and sync before closing, otherwise they won't be in this Z.`}
                </p>
              )}
              <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] items-end border-t pt-3">
                <div>
                  <label className="text-xs text-muted-foreground">{fr ? 'Espèces comptées dans le tiroir' : 'Cash counted in drawer'}</label>
                  <Input type="number" inputMode="numeric" min={0} value={counted} onChange={(e) => setCounted(e.target.value)} />
                  {diff !== null && (
                    <p className={`text-xs mt-1 font-semibold ${diff === 0 ? 'text-green-600' : diff < 0 ? 'text-red-600' : 'text-amber-600'}`}>
                      {diff === 0 ? (fr ? 'Caisse juste' : 'Balanced') : diff < 0 ? `${fr ? 'Manque' : 'Short'} ${formatCurrency(-diff)}` : `${fr ? 'Surplus' : 'Over'} ${formatCurrency(diff)}`}
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">{fr ? 'Note (optionnel)' : 'Note (optional)'}</label>
                  <Input value={note} onChange={(e) => setNote(e.target.value)} />
                </div>
                <Button variant="destructive" onClick={closeDrawer} disabled={busy || counted === ''}>{fr ? 'Fermer et éditer le Z' : 'Close & print Z'}</Button>
              </div>
            </>
          )}

          {showHistory && (
            <div className="border-t pt-3 space-y-1">
              {history.map((z) => (
                <button key={z.id} onClick={() => setViewZ(z)} className="w-full flex items-center justify-between gap-2 text-sm px-2 py-1.5 rounded-lg hover:bg-muted">
                  <span>Z {z.number} · {new Date(z.closedAt || z.openedAt).toLocaleDateString(fr ? 'fr-FR' : 'en-US')} · {name(z.closedBy)}</span>
                  <span className={`font-medium ${(z.difference ?? 0) < 0 ? 'text-red-600' : (z.difference ?? 0) > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                    {(z.difference ?? 0) === 0 ? 'OK' : `${(z.difference ?? 0) > 0 ? '+' : '-'}${formatCurrency(Math.abs(z.difference ?? 0))}`}
                  </span>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      {viewZ && <ZView z={viewZ} onClose={() => setViewZ(null)} />}
    </>
  );
}

export function DrawerStatusCard() {
  const fr = useAuthStore((s) => s.language) !== 'en';
  const [state, setState] = useState<{ loaded: boolean; current: Live | null }>({ loaded: false, current: null });

  useEffect(() => {
    let alive = true;
    api.get('/cash-sessions/current')
      .then((r) => { if (alive) setState({ loaded: true, current: r.data.data }); })
      .catch(() => { if (alive) setState({ loaded: true, current: null }); });
    return () => { alive = false; };
  }, []);

  if (!state.loaded) return null;
  const c = state.current;
  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3 sm:p-4 ${c ? 'border-green-300 bg-green-50 dark:bg-green-900/20 dark:border-green-800' : 'border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800'}`}>
      <div className="flex items-center gap-3 min-w-0">
        {c ? <Unlock className="w-5 h-5 text-green-600 shrink-0" /> : <Lock className="w-5 h-5 text-amber-600 shrink-0" />}
        <div className="min-w-0">
          <p className="font-semibold text-sm">
            {c ? `${fr ? 'Caisse ouverte' : 'Drawer open'} · N° ${c.number}` : (fr ? 'Caisse fermée' : 'Drawer closed')}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {c
              ? `${fr ? 'Par' : 'By'} ${name(c.openedBy)} · ${c.summary.orders} ${fr ? 'ventes' : 'sales'} · ${fr ? 'attendu dans le tiroir' : 'expected in drawer'} ${formatCurrency(c.expectedCash)}`
              : (fr ? 'Ouvrez la caisse avec votre fond de caisse avant de vendre.' : 'Open the drawer with your float before selling.')}
          </p>
        </div>
      </div>
      <Link to="/closing" className={`shrink-0 rounded-lg px-4 py-2 text-sm font-semibold text-white ${c ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}>
        {c ? (fr ? 'Fermer la caisse (Z)' : 'Close drawer (Z)') : (fr ? 'Ouvrir la caisse' : 'Open drawer')}
      </Link>
    </div>
  );
}
