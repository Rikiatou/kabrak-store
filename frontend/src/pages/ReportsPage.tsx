import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { StatTile } from '@/components/StatTile';
import { canSeeCosts } from '@/lib/modules';
import { useTranslation } from '@/i18n/useTranslation';
import { useAuthStore } from '@/stores/authStore';
import { formatCurrency } from '@/lib/utils';
import {
  DollarSign, ShoppingCart, Download, FolderKanban, FileText, Wallet, Percent, Undo2, TrendingUp,
  Receipt, PiggyBank, HandCoins, MessageCircle, Printer, AlertTriangle,
} from 'lucide-react';
import api, { getApiErrorMessage } from '@/lib/api';
import toast from 'react-hot-toast';

type Lang = 'fr' | 'en';

const METHOD_LABELS: Record<string, { fr: string; en: string }> = {
  CASH: { fr: 'Espèces', en: 'Cash' },
  MOBILE_MONEY: { fr: 'Mobile Money', en: 'Mobile Money' },
  ORANGE_MONEY: { fr: 'Orange Money', en: 'Orange Money' },
  MTN_MOMO: { fr: 'MTN MoMo', en: 'MTN MoMo' },
  BANK_TRANSFER: { fr: 'Virement', en: 'Bank transfer' },
  OTHER: { fr: 'Autre', en: 'Other' },
};
const WEEKDAYS: Record<Lang, string[]> = {
  fr: ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'],
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
};

interface SellerRow {
  name: string; orders: number; sales: number; discounts: number; returns: number;
  cancelled: number; cancelledAmount: number; zeroSales: number; bigDiscounts: number;
}
interface ProductRow { name: string; quantity: number; amount: number; cost: number; profit: number }
interface SalesReport {
  from: string;
  to: string;
  groupBy: 'day' | 'week' | 'month';
  summary: {
    orders: number; itemsSold: number; sales: number; received: number; discounts: number;
    returns: number; returnedItems: number; refunds: number; grossProfit: number; expenses: number;
    netProfit: number; newDebts: number; newDebtsCount: number; averageBasket: number;
    cancelled: { count: number; amount: number };
  };
  previous: { orders: number; sales: number; received: number; grossProfit: number; expenses: number; netProfit: number };
  byMethod: Record<string, number>;
  salesByPeriod: Array<{ period: string; revenue: number; orders: number; profit: number }>;
  sellers: SellerRow[];
  topProducts: ProductRow[];
  bestMargins: ProductRow[];
  unsold: Array<{ name: string; stock: number; value: number }>;
  unsoldCount: number;
  belowCost: Array<{ name: string; quantity: number; unitPrice: number; unitCost: number; loss: number }>;
  categories: Array<{ name: string; quantity: number; amount: number; profit: number }>;
  byHour: Array<{ hour: number; orders: number; sales: number }>;
  byWeekday: Array<{ day: number; orders: number; sales: number }>;
}

interface ServiceReport {
  totalProjects: number;
  activeProjects: number;
  totalRevenue: number;
  totalPending: number;
  projects: Array<{
    id: string; name: string; status: string; totalBudget: number;
    amountPaid: number; amountRemaining: number;
    client?: { name: string } | null;
  }>;
}

const localDate = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const shiftDays = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return d; };
const fmtDay = (s: string, lang: Lang) => new Date(`${s}T00:00:00`).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' });
const pct = (cur: number, prev: number) => (prev > 0 ? ((cur - prev) / prev) * 100 : null);

type Preset = 'today' | 'yesterday' | '7d' | 'month' | 'lastMonth' | 'custom';

function rangeFor(preset: Preset, custom: { from: string; to: string }) {
  const now = new Date();
  switch (preset) {
    case 'today': return { from: localDate(), to: localDate() };
    case 'yesterday': return { from: localDate(shiftDays(-1)), to: localDate(shiftDays(-1)) };
    case '7d': return { from: localDate(shiftDays(-6)), to: localDate() };
    case 'month': return { from: localDate(new Date(now.getFullYear(), now.getMonth(), 1)), to: localDate() };
    case 'lastMonth': return {
      from: localDate(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
      to: localDate(new Date(now.getFullYear(), now.getMonth(), 0)),
    };
    default: return custom;
  }
}

async function exportData(type: string, lang: Lang) {
  try {
    const res = await api.get(`/exports/${type}`, { responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error(err);
    toast.error(getApiErrorMessage(err, lang === 'fr' ? 'Échec de l\'export' : 'Export failed'));
  }
}

function Section({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 break-inside-avoid">
      <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h2>
      {sub ? <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{sub}</p> : null}
      <div className="mt-3">{children}</div>
    </section>
  );
}

function BarRow({ label, value, max, right }: { label: string; value: number; max: number; right: string }) {
  const w = max > 0 ? Math.max(2, (value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-24 sm:w-28 shrink-0 truncate text-gray-600 dark:text-gray-300">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
        <div className="h-full rounded-full bg-gray-700 dark:bg-gray-300" style={{ width: `${w}%` }} />
      </div>
      <span className="w-28 shrink-0 text-right tabular-nums text-gray-900 dark:text-white">{right}</span>
    </div>
  );
}

const Empty = ({ text }: { text: string }) => <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">{text}</p>;

function ServiceReports() {
  const { t, language } = useTranslation();
  const [serviceReport, setServiceReport] = useState<ServiceReport | null>(null);
  const [loading, setLoading] = useState(true);
  const exportClients = (type: string) => exportData(type, language as Lang);

  useEffect(() => {
    let alive = true;
    api.get('/projects')
      .then((res) => {
        if (!alive) return;
        const projects = res.data.data || [];
        const active = projects.filter((p: { status: string }) => p.status === 'ACTIVE');
        const totalRevenue = projects.reduce((s: number, p: { amountPaid: number }) => s + (p.amountPaid || 0), 0);
        const totalPending = projects.reduce((s: number, p: { amountRemaining: number }) => s + (p.amountRemaining || 0), 0);
        setServiceReport({ totalProjects: projects.length, activeProjects: active.length, totalRevenue, totalPending, projects });
      })
      .catch((err) => { console.error(err); toast.error(getApiErrorMessage(err)); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-kabrak-500" /></div>;
  }
  return (

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold dark:text-white">{t('nav.reports')}</h1>
          <Button variant="outline" size="sm" onClick={() => exportClients('clients')}>
            <Download className="w-4 h-4 mr-1" /> Clients
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-violet-500">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                <FolderKanban className="w-6 h-6 text-violet-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{language === 'fr' ? 'Total Projets' : 'Total Projects'}</p>
                <p className="text-2xl font-bold dark:text-white">{serviceReport?.totalProjects || 0}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <FolderKanban className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{language === 'fr' ? 'Projets Actifs' : 'Active Projects'}</p>
                <p className="text-2xl font-bold dark:text-white">{serviceReport?.activeProjects || 0}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{language === 'fr' ? 'Revenus Reçus' : 'Revenue Received'}</p>
                <p className="text-2xl font-bold dark:text-white">{formatCurrency(serviceReport?.totalRevenue || 0)}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-amber-500">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <FileText className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{language === 'fr' ? 'Paiements en Attente' : 'Pending Payments'}</p>
                <p className="text-2xl font-bold dark:text-white">{formatCurrency(serviceReport?.totalPending || 0)}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Projects list */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 dark:text-white">
              <FolderKanban className="w-5 h-5 text-violet-500" />
              {language === 'fr' ? 'Tous les projets' : 'All Projects'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {serviceReport?.projects?.length ? (
              <div className="space-y-2">
                {serviceReport.projects.map((project) => (
                  <div key={project.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium dark:text-white">{project.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {project.client?.name || (language === 'fr' ? 'Pas de client' : 'No client')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold dark:text-white">{formatCurrency(project.totalBudget)}</p>
                      <div className="flex gap-2 text-xs">
                        <span className="text-green-600">{language === 'fr' ? 'Reçu' : 'Paid'}: {formatCurrency(project.amountPaid)}</span>
                        <span className="text-amber-600">{language === 'fr' ? 'Reste' : 'Due'}: {formatCurrency(project.amountRemaining)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-8">{t('common.noResults')}</p>
            )}
          </CardContent>
        </Card>
      </div>
  );
}

function ProductReports() {
  const { language } = useTranslation();
  const lang = (language === 'en' ? 'en' : 'fr') as Lang;
  const fr = lang === 'fr';
  const tenant = useAuthStore((s) => s.tenant);
  const showCosts = canSeeCosts(useAuthStore((s) => s.user));
  const [preset, setPreset] = useState<Preset>('today');
  const [custom, setCustom] = useState({ from: localDate(shiftDays(-6)), to: localDate() });
  const [result, setResult] = useState<{ key: string; data: SalesReport | null } | null>(null);
  const { from, to } = rangeFor(preset, custom);
  const key = `${from}|${to}`;
  const data = result?.data ?? null;
  const loading = result?.key !== key;

  useEffect(() => {
    let alive = true;
    api.get('/reports/sales', { params: { from, to } })
      .then((res) => { if (alive) setResult({ key: `${from}|${to}`, data: res.data.data }); })
      .catch((err) => {
        console.error(err);
        toast.error(getApiErrorMessage(err));
        if (alive) setResult((r) => ({ key: `${from}|${to}`, data: r?.data ?? null }));
      });
    return () => { alive = false; };
  }, [from, to]);

  const presets: Array<{ key: Preset; fr: string; en: string }> = [
    { key: 'today', fr: "Aujourd'hui", en: 'Today' },
    { key: 'yesterday', fr: 'Hier', en: 'Yesterday' },
    { key: '7d', fr: '7 jours', en: '7 days' },
    { key: 'month', fr: 'Ce mois', en: 'This month' },
    { key: 'lastMonth', fr: 'Mois dernier', en: 'Last month' },
    { key: 'custom', fr: 'Dates', en: 'Dates' },
  ];
  const periodLabel = data ? (data.from === data.to ? fmtDay(data.from, lang) : `${fmtDay(data.from, lang)} – ${fmtDay(data.to, lang)}`) : '';
  const methodLabel = (m: string) => (METHOD_LABELS[m] || METHOD_LABELS.OTHER)[lang];

  const shareText = () => {
    if (!data) return '';
    const s = data.summary;
    return [
      `${tenant?.name || 'KABRAK'} · ${fr ? 'Rapport' : 'Report'} ${periodLabel}`,
      `${fr ? 'Ventes' : 'Sales'} : ${s.orders} (${s.itemsSold} ${fr ? 'articles' : 'items'}) = ${formatCurrency(s.sales)}`,
      `${fr ? 'Encaissé' : 'Received'} : ${formatCurrency(s.received)}`,
      ...Object.entries(data.byMethod).map(([m, v]) => `  - ${methodLabel(m)} : ${formatCurrency(v)}`),
      ...(s.discounts > 0 ? [`${fr ? 'Remises' : 'Discounts'} : ${formatCurrency(s.discounts)}`] : []),
      ...(s.returns > 0 ? [`${fr ? 'Retours' : 'Returns'} : ${formatCurrency(s.returns)}`] : []),
      ...(showCosts ? [`${fr ? 'Bénéfice brut' : 'Gross profit'} : ${formatCurrency(s.grossProfit)}`] : []),
      `${fr ? 'Dépenses' : 'Expenses'} : ${formatCurrency(s.expenses)}`,
      ...(showCosts ? [`${fr ? 'Bénéfice net' : 'Net profit'} : ${formatCurrency(s.netProfit)}`] : []),
      ...(s.newDebts > 0 ? [`${fr ? 'Reste à payer sur ces ventes' : 'Still owed on these sales'} : ${formatCurrency(s.newDebts)}`] : []),
      ...(data.sellers.length ? [fr ? 'Par vendeur :' : 'By seller:'] : []),
      ...data.sellers.map((x) => `  · ${x.name} : ${x.orders} ${fr ? 'ventes' : 'sales'}, ${formatCurrency(x.sales)}${x.discounts ? ` (${fr ? 'remises' : 'discounts'} −${formatCurrency(x.discounts)})` : ''}`),
      ...(data.topProducts.length ? [fr ? 'Top produits :' : 'Top products:'] : []),
      ...data.topProducts.slice(0, 5).map((p) => `  ${p.quantity} x ${p.name} = ${formatCurrency(p.amount)}`),
    ].join('\n');
  };

  const s = data?.summary;
  const p = data?.previous;
  const methods = data ? Object.entries(data.byMethod).filter(([, v]) => v !== 0).sort((a, b) => b[1] - a[1]) : [];
  const maxMethod = Math.max(0, ...methods.map(([, v]) => v));
  const maxPeriod = Math.max(0, ...(data?.salesByPeriod.map((x) => x.revenue) ?? []));
  const hours = data?.byHour.filter((h) => h.orders > 0) ?? [];
  const maxHour = Math.max(0, ...hours.map((h) => h.sales));
  const weekdays = data ? [1, 2, 3, 4, 5, 6, 0].map((d) => data.byWeekday[d]).filter((d) => d.orders > 0) : [];
  const maxWeekday = Math.max(0, ...weekdays.map((d) => d.sales));
  const maxCategory = Math.max(0, ...(data?.categories.map((c) => c.amount) ?? []));
  const bestHour = hours.length ? hours.reduce((a, b) => (b.sales > a.sales ? b : a)) : null;
  const noSales = fr ? 'Aucune vente sur cette période' : 'No sales in this period';
  const periodName = (k: string) => {
    if (!data) return k;
    if (data.groupBy === 'month') return new Date(`${k}-01T00:00:00`).toLocaleDateString(fr ? 'fr-FR' : 'en-US', { month: 'short', year: 'numeric' });
    const d = new Date(`${k}T00:00:00`).toLocaleDateString(fr ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'short' });
    return data.groupBy === 'week' ? `${fr ? 'Sem.' : 'Wk'} ${d}` : d;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">{fr ? 'Rapports' : 'Reports'}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {periodLabel || '…'}
            <span className="print:hidden"> · {fr ? 'mêmes chiffres que le tableau de bord et le Z' : 'same numbers as the dashboard and the Z report'}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <Button variant="outline" size="sm" onClick={() => window.print()} disabled={!data}>
            <Printer className="w-4 h-4 mr-1" /> PDF
          </Button>
          <Button size="sm" onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(shareText())}`, '_blank')} disabled={!data}>
            <MessageCircle className="w-4 h-4 mr-1" /> WhatsApp
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <div className="flex flex-wrap gap-1 rounded-lg border border-gray-200 dark:border-gray-700 p-1 bg-white dark:bg-gray-800">
          {presets.map((x) => (
            <button
              key={x.key}
              type="button"
              onClick={() => setPreset(x.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md ${preset === x.key ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'}`}
            >
              {x[lang]}
            </button>
          ))}
        </div>
        {preset === 'custom' && (
          <div className="flex items-center gap-2">
            <Input type="date" value={custom.from} max={custom.to} onChange={(e) => e.target.value && setCustom((c) => ({ ...c, from: e.target.value }))} className="w-auto h-9" />
            <span className="text-gray-400">–</span>
            <Input type="date" value={custom.to} min={custom.from} max={localDate()} onChange={(e) => e.target.value && setCustom((c) => ({ ...c, to: e.target.value }))} className="w-auto h-9" />
          </div>
        )}
      </div>

      {loading && !data ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-kabrak-500" /></div>
      ) : !data || !s || !p ? null : (
        <div className={`space-y-4 ${loading ? 'opacity-60' : ''}`}>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatTile label={fr ? 'Ventes' : 'Sales'} icon={ShoppingCart} value={formatCurrency(s.sales)} delta={pct(s.sales, p.sales)} sub={`${s.orders} ${fr ? 'ventes' : 'sales'} · ${s.itemsSold} ${fr ? 'articles' : 'items'}`} />
            <StatTile label={fr ? 'Encaissé' : 'Received'} icon={Wallet} value={formatCurrency(s.received)} delta={pct(s.received, p.received)} sub={s.refunds > 0 ? `${fr ? 'dont remboursé' : 'refunded'} −${formatCurrency(s.refunds)}` : undefined} />
            {showCosts && <StatTile label={fr ? 'Bénéfice brut' : 'Gross profit'} icon={TrendingUp} value={formatCurrency(s.grossProfit)} delta={pct(s.grossProfit, p.grossProfit)} sub={fr ? 'ventes − prix d\'achat' : 'sales − cost'} />}
            {showCosts && <StatTile label={fr ? 'Bénéfice net' : 'Net profit'} icon={PiggyBank} value={formatCurrency(s.netProfit)} tone={s.netProfit < 0 ? 'text-red-600' : undefined} delta={pct(s.netProfit, p.netProfit)} sub={fr ? 'brut − dépenses' : 'gross − expenses'} />}
            <StatTile label={fr ? 'Dépenses' : 'Expenses'} icon={Receipt} value={formatCurrency(s.expenses)} sub={fr ? 'hors achats de stock' : 'excl. stock purchases'} />
            <StatTile label={fr ? 'Remises accordées' : 'Discounts given'} icon={Percent} value={formatCurrency(s.discounts)} tone={s.discounts > 0 ? 'text-red-600' : undefined} />
            <StatTile label={fr ? 'Retours' : 'Returns'} icon={Undo2} value={formatCurrency(s.returns)} sub={s.returnedItems ? `${s.returnedItems} ${fr ? 'articles rendus' : 'items returned'}` : undefined} />
            <StatTile label={fr ? 'Reste à payer' : 'Still owed'} icon={HandCoins} value={formatCurrency(s.newDebts)} tone={s.newDebts > 0 ? 'text-amber-700 dark:text-amber-400' : undefined} sub={s.newDebtsCount ? `${s.newDebtsCount} ${fr ? 'ventes à crédit' : 'credit sales'}` : undefined} />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {fr ? 'Panier moyen' : 'Average basket'} : <span className="tabular-nums text-gray-900 dark:text-white">{formatCurrency(s.averageBasket)}</span>
            {s.cancelled.count > 0 ? <> · {fr ? 'Annulées (non comptées)' : 'Cancelled (not counted)'} : <span className="tabular-nums">{s.cancelled.count} · {formatCurrency(s.cancelled.amount)}</span></> : null}
            {' · '}{fr ? '% comparé à la période d\'avant de même durée' : '% vs the previous period of the same length'}
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Section title={fr ? 'Encaissé par moyen de paiement' : 'Received by payment method'}>
              {methods.length ? (
                <div className="space-y-2">
                  {methods.map(([m, v]) => <BarRow key={m} label={methodLabel(m)} value={Math.max(0, v)} max={maxMethod} right={formatCurrency(v)} />)}
                </div>
              ) : <Empty text={fr ? 'Aucun paiement reçu' : 'No payment received'} />}
            </Section>

            <Section title={fr ? 'Ventes dans le temps' : 'Sales over time'} sub={data.groupBy === 'day' ? (fr ? 'par jour' : 'per day') : data.groupBy === 'week' ? (fr ? 'par semaine' : 'per week') : (fr ? 'par mois' : 'per month')}>
              {data.salesByPeriod.length ? (
                <div className="space-y-2">
                  {data.salesByPeriod.map((x) => <BarRow key={x.period} label={periodName(x.period)} value={x.revenue} max={maxPeriod} right={`${formatCurrency(x.revenue)} · ${x.orders}`} />)}
                </div>
              ) : <Empty text={noSales} />}
            </Section>
          </div>

          <Section title={fr ? 'Par vendeur' : 'By seller'} sub={fr ? 'Chaque vente compte pour la personne qui l\'a faite' : 'Each sale counts for the person who made it'}>
            {data.sellers.length ? (
              <div className="overflow-x-auto -mx-4 px-4">
                <table className="w-full text-sm min-w-[560px]">
                  <thead>
                    <tr className="text-left text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                      <th className="py-2 font-medium">{fr ? 'Vendeur' : 'Seller'}</th>
                      <th className="py-2 font-medium text-right">{fr ? 'Ventes' : 'Sales'}</th>
                      <th className="py-2 font-medium text-right">{fr ? 'Montant' : 'Amount'}</th>
                      <th className="py-2 font-medium text-right">{fr ? 'Remises' : 'Discounts'}</th>
                      <th className="py-2 font-medium text-right">{fr ? 'Retours' : 'Returns'}</th>
                      <th className="py-2 font-medium text-right">{fr ? 'Annulées' : 'Cancelled'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.sellers.map((x) => (
                      <tr key={x.name} className="border-b border-gray-100 dark:border-gray-700/60 last:border-0 align-top">
                        <td className="py-2">
                          <p className="font-medium text-gray-900 dark:text-white">{x.name}</p>
                          {x.zeroSales > 0 || x.bigDiscounts > 0 ? (
                            <p className="mt-0.5 flex items-center gap-1 text-xs text-red-600">
                              <AlertTriangle className="w-3 h-3" />
                              {[
                                x.zeroSales ? `${x.zeroSales} ${fr ? 'vente(s) à 0' : 'sale(s) at 0'}` : '',
                                x.bigDiscounts ? `${x.bigDiscounts} ${fr ? 'grosse(s) remise(s)' : 'big discount(s)'}` : '',
                              ].filter(Boolean).join(' · ')}
                            </p>
                          ) : null}
                        </td>
                        <td className="py-2 text-right tabular-nums">{x.orders}</td>
                        <td className="py-2 text-right tabular-nums font-medium text-gray-900 dark:text-white">{formatCurrency(x.sales)}</td>
                        <td className={`py-2 text-right tabular-nums ${x.discounts ? 'text-red-600' : 'text-gray-400'}`}>{x.discounts ? `−${formatCurrency(x.discounts)}` : '—'}</td>
                        <td className="py-2 text-right tabular-nums text-gray-600 dark:text-gray-300">{x.returns ? formatCurrency(x.returns) : '—'}</td>
                        <td className="py-2 text-right tabular-nums text-gray-600 dark:text-gray-300">{x.cancelled ? `${x.cancelled} · ${formatCurrency(x.cancelledAmount)}` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {data.sellers.some((x) => x.zeroSales > 0) ? (
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 print:hidden">
                    {fr ? 'Une vente à 0 vient souvent d\'un montant tapé dans « Remise ». Corrigez-la dans Commandes → « Corriger la remise ».' : 'A 0 sale usually comes from an amount typed in "Discount". Fix it in Orders → "Fix discount".'}
                  </p>
                ) : null}
              </div>
            ) : <Empty text={noSales} />}
          </Section>

          <Section title={fr ? 'Produits les plus vendus' : 'Best-selling products'} sub={showCosts ? (fr ? 'Montant après remises · marge = montant − prix d\'achat' : 'Amount after discounts · margin = amount − cost') : (fr ? 'Montant après remises' : 'Amount after discounts')}>
            {data.topProducts.length ? (
              <div className="overflow-x-auto -mx-4 px-4">
                <table className="w-full text-sm min-w-[480px]">
                  <thead>
                    <tr className="text-left text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                      <th className="py-2 font-medium">{fr ? 'Produit' : 'Product'}</th>
                      <th className="py-2 font-medium text-right">{fr ? 'Qté' : 'Qty'}</th>
                      <th className="py-2 font-medium text-right">{fr ? 'Montant' : 'Amount'}</th>
                      {showCosts && <th className="py-2 font-medium text-right">{fr ? 'Marge' : 'Margin'}</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {data.topProducts.map((x) => (
                      <tr key={x.name} className="border-b border-gray-100 dark:border-gray-700/60 last:border-0">
                        <td className="py-2 text-gray-900 dark:text-white">{x.name}</td>
                        <td className="py-2 text-right tabular-nums">{x.quantity}</td>
                        <td className="py-2 text-right tabular-nums">{formatCurrency(x.amount)}</td>
                        {showCosts && <td className={`py-2 text-right tabular-nums ${x.profit < 0 ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}>{formatCurrency(x.profit)}</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <Empty text={noSales} />}
          </Section>

          {showCosts && data.belowCost.length > 0 && (
            <Section title={fr ? 'Vendus en dessous du prix d\'achat' : 'Sold below cost'} sub={fr ? 'Vérifiez le prix de vente ou le prix d\'achat de ces produits' : 'Check the selling or purchase price of these products'}>
              <div className="space-y-1.5">
                {data.belowCost.map((x) => (
                  <div key={x.name} className="flex items-center justify-between gap-3 text-sm">
                    <span className="truncate text-gray-900 dark:text-white">{x.quantity} × {x.name}</span>
                    <span className="shrink-0 tabular-nums text-gray-500 dark:text-gray-400">
                      {formatCurrency(x.unitPrice)} / {fr ? 'achat' : 'cost'} {formatCurrency(x.unitCost)} · <span className="text-red-600">−{formatCurrency(x.loss)}</span>
                    </span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Section title={fr ? 'Par catégorie' : 'By category'}>
              {data.categories.length ? (
                <div className="space-y-2">
                  {data.categories.map((c) => (
                    <BarRow key={c.name || 'none'} label={c.name || (fr ? 'Sans catégorie' : 'No category')} value={c.amount} max={maxCategory} right={formatCurrency(c.amount)} />
                  ))}
                </div>
              ) : <Empty text={noSales} />}
            </Section>

            <Section title={fr ? 'Produits pas vendus' : 'Products not sold'} sub={data.unsoldCount ? `${data.unsoldCount} ${fr ? 'produits en stock sans aucune vente sur la période' : 'products in stock with no sale in the period'}` : undefined}>
              {data.unsold.length ? (
                <div className="space-y-1.5">
                  {data.unsold.map((x) => (
                    <div key={x.name} className="flex items-center justify-between gap-3 text-sm">
                      <span className="truncate text-gray-900 dark:text-white">{x.name}</span>
                      <span className="shrink-0 tabular-nums text-gray-500 dark:text-gray-400">{x.stock} {fr ? 'en stock' : 'in stock'}{x.value ? ` · ${formatCurrency(x.value)}` : ''}</span>
                    </div>
                  ))}
                </div>
              ) : <Empty text={fr ? 'Tous les produits en stock se sont vendus' : 'Every product in stock sold'} />}
            </Section>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Section title={fr ? 'Heures de vente' : 'Sales by hour'} sub={bestHour ? `${fr ? 'Heure la plus forte' : 'Busiest hour'} : ${bestHour.hour} h – ${bestHour.hour + 1} h` : undefined}>
              {hours.length ? (
                <div className="space-y-2">
                  {hours.map((h) => <BarRow key={h.hour} label={`${h.hour} h – ${h.hour + 1} h`} value={h.sales} max={maxHour} right={`${formatCurrency(h.sales)} · ${h.orders}`} />)}
                </div>
              ) : <Empty text={noSales} />}
            </Section>

            <Section title={fr ? 'Jours de la semaine' : 'Days of the week'}>
              {weekdays.length ? (
                <div className="space-y-2">
                  {weekdays.map((d) => <BarRow key={d.day} label={WEEKDAYS[lang][d.day]} value={d.sales} max={maxWeekday} right={`${formatCurrency(d.sales)} · ${d.orders}`} />)}
                </div>
              ) : <Empty text={noSales} />}
            </Section>
          </div>

          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <span className="text-xs text-gray-500 dark:text-gray-400">{fr ? 'Exporter (Excel / CSV)' : 'Export (Excel / CSV)'} :</span>
            <Button variant="outline" size="sm" onClick={() => exportData('orders', lang)}><Download className="w-4 h-4 mr-1" /> {fr ? 'Commandes' : 'Orders'}</Button>
            <Button variant="outline" size="sm" onClick={() => exportData('clients', lang)}><Download className="w-4 h-4 mr-1" /> Clients</Button>
            <Button variant="outline" size="sm" onClick={() => exportData('products', lang)}><Download className="w-4 h-4 mr-1" /> {fr ? 'Produits' : 'Products'}</Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function ReportsPage() {
  const tenant = useAuthStore((s) => s.tenant);
  return tenant?.businessMode === 'SERVICE' ? <ServiceReports /> : <ProductReports />;
}
