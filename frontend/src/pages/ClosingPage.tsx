import { useEffect, useState, useCallback } from 'react';
import { MessageCircle, Printer } from 'lucide-react';
import { useTranslation } from '@/i18n/useTranslation';
import { useAuthStore } from '@/stores/authStore';
import { formatCurrency } from '@/lib/utils';
import api, { getApiErrorMessage } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import toast from 'react-hot-toast';
import { CashDrawer } from '@/components/CashDrawer';

interface Closing {
  date: string; orders: number; itemsSold: number; sales: number; received: number;
  byMethod: Record<string, number>; sellers: Array<{ name: string; orders: number; sales: number }>;
  cost: number; grossProfit: number; expenses: number; netProfit: number; lowStock: number;
}

const METHOD_LABELS: Record<string, { fr: string; en: string }> = {
  CASH: { fr: 'Espèces', en: 'Cash' },
  MOBILE_MONEY: { fr: 'Mobile Money', en: 'Mobile Money' },
  ORANGE_MONEY: { fr: 'Orange Money', en: 'Orange Money' },
  MTN_MOMO: { fr: 'MTN MoMo', en: 'MTN MoMo' },
  BANK_TRANSFER: { fr: 'Virement', en: 'Bank transfer' },
  OTHER: { fr: 'Autre', en: 'Other' },
};

const localDate = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function ClosingPage() {
  const { language } = useTranslation();
  const fr = language === 'fr';
  const lang = (fr ? 'fr' : 'en') as 'fr' | 'en';
  const tenant = useAuthStore((s) => s.tenant);
  const [date, setDate] = useState(localDate());
  const [data, setData] = useState<Closing | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/reports/daily-closing', { params: { date } });
      setData(res.data.data);
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => { load(); }, [load]);

  const summaryText = () => {
    if (!data) return '';
    const d = new Date(`${data.date}T00:00:00`).toLocaleDateString(fr ? 'fr-FR' : 'en-US');
    const lines = [
      `${tenant?.name || 'KABRAK'} · ${fr ? 'Clôture du' : 'Closing'} ${d}`,
      `${fr ? 'Ventes' : 'Sales'} : ${data.orders} (${data.itemsSold} ${fr ? 'articles' : 'items'}) = ${formatCurrency(data.sales)}`,
      `${fr ? 'Encaissé' : 'Received'} : ${formatCurrency(data.received)}`,
      ...Object.entries(data.byMethod).map(([m, v]) => `  - ${(METHOD_LABELS[m] || METHOD_LABELS.OTHER)[lang]} : ${formatCurrency(v)}`),
      `${fr ? 'Bénéfice brut' : 'Gross profit'} : ${formatCurrency(data.grossProfit)}`,
      `${fr ? 'Dépenses' : 'Expenses'} : ${formatCurrency(data.expenses)}`,
      `${fr ? 'Bénéfice net' : 'Net profit'} : ${formatCurrency(data.netProfit)}`,
      ...(data.sellers.length > 1 ? data.sellers.map((s) => `  · ${s.name} : ${s.orders} ${fr ? 'ventes' : 'sales'}, ${formatCurrency(s.sales)}`) : []),
      ...(data.lowStock > 0 ? [`${fr ? 'Produits en stock faible' : 'Low-stock products'} : ${data.lowStock}`] : []),
    ];
    return lines.join('\n');
  };

  const share = () => window.open(`https://wa.me/?text=${encodeURIComponent(summaryText())}`, '_blank');

  const Stat = ({ label, value, tone }: { label: string; value: string; tone?: string }) => (
    <Card><CardContent className="p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-lg sm:text-xl font-bold ${tone || ''}`}>{value}</p>
    </CardContent></Card>
  );

  return (
    <div className="space-y-4 print:space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">{fr ? 'Clôture de caisse' : 'Cash closing'}</h1>
          <p className="text-sm text-muted-foreground">{fr ? 'Ouvrez la caisse le matin, fermez-la le soir et imprimez le rapport Z' : 'Open the drawer in the morning, close it at night and print the Z report'}</p>
        </div>
        <div className="flex items-center gap-2 print:hidden">
          <Input type="date" value={date} max={localDate()} onChange={(e) => setDate(e.target.value)} className="w-auto" />
          <Button variant="outline" onClick={() => window.print()}><Printer className="w-4 h-4" /></Button>
          <Button onClick={share} disabled={!data}><MessageCircle className="w-4 h-4 mr-1" /> WhatsApp</Button>
        </div>
      </div>

      <div className="print:hidden"><CashDrawer /></div>

      <h2 className="text-base font-semibold pt-2">{fr ? 'Résumé de la journée' : 'Day summary'}</h2>
      {loading || !data ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-kabrak-500" /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Stat label={fr ? 'Ventes' : 'Sales'} value={`${data.orders} · ${formatCurrency(data.sales)}`} />
            <Stat label={fr ? 'Encaissé' : 'Received'} value={formatCurrency(data.received)} />
            <Stat label={fr ? 'Dépenses' : 'Expenses'} value={formatCurrency(data.expenses)} />
            <Stat label={fr ? 'Bénéfice net' : 'Net profit'} value={formatCurrency(data.netProfit)} tone={data.netProfit < 0 ? 'text-red-600' : 'text-green-600'} />
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            <Card><CardContent className="p-4 space-y-2">
              <h3 className="font-semibold">{fr ? 'Encaissements par moyen' : 'Received by method'}</h3>
              {Object.keys(data.byMethod).length === 0 && <p className="text-sm text-muted-foreground">{fr ? 'Aucun paiement' : 'No payments'}</p>}
              {Object.entries(data.byMethod).map(([m, v]) => (
                <div key={m} className="flex justify-between text-sm"><span>{(METHOD_LABELS[m] || METHOD_LABELS.OTHER)[lang]}</span><span className="font-medium">{formatCurrency(v)}</span></div>
              ))}
              <div className="flex justify-between text-sm border-t pt-2"><span>{fr ? 'Bénéfice brut (ventes - achats)' : 'Gross profit (sales - cost)'}</span><span className="font-medium">{formatCurrency(data.grossProfit)}</span></div>
            </CardContent></Card>
            <Card><CardContent className="p-4 space-y-2">
              <h3 className="font-semibold">{fr ? 'Par vendeur' : 'By seller'}</h3>
              {data.sellers.length === 0 && <p className="text-sm text-muted-foreground">{fr ? 'Aucune vente' : 'No sales'}</p>}
              {data.sellers.map((s) => (
                <div key={s.name} className="flex justify-between text-sm"><span>{s.name} · {s.orders}</span><span className="font-medium">{formatCurrency(s.sales)}</span></div>
              ))}
            </CardContent></Card>
          </div>
          <Card><CardContent className="p-4">
            <pre className="whitespace-pre-wrap text-xs text-muted-foreground font-sans">{summaryText()}</pre>
          </CardContent></Card>
        </>
      )}
    </div>
  );
}
