import { useEffect, useState, useCallback } from 'react';
import { HandCoins, MessageCircle, Wallet, X } from 'lucide-react';
import { useTranslation } from '@/i18n/useTranslation';
import { useAuthStore } from '@/stores/authStore';
import { formatCurrency } from '@/lib/utils';
import api, { getApiErrorMessage } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import toast from 'react-hot-toast';

interface DebtInvoice { id: string; invoiceNumber: string; totalAmount: number; amountPaid: number; amountDue: number; createdAt: string }
interface Debt { client: { id: string; name: string; phone: string | null }; totalDue: number; oldest: string; invoices: DebtInvoice[] }

const waPhone = (phone: string) => {
  const digits = phone.replace(/\D/g, '');
  return digits.startsWith('237') ? digits : `237${digits}`;
};

export function DebtsPage() {
  const { language } = useTranslation();
  const fr = language === 'fr';
  const tenant = useAuthStore((s) => s.tenant);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState<DebtInvoice | null>(null);
  const [amount, setAmount] = useState<number | ''>('');
  const [method, setMethod] = useState('CASH');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/reports/debts');
      setDebts(data.data || []);
      setTotal(data.totalDue || 0);
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const reminder = (d: Debt) => {
    const shop = tenant?.name || 'KABRAK';
    const msg = fr
      ? `Bonjour ${d.client.name}, c'est ${shop}. Petit rappel : il reste ${formatCurrency(d.totalDue)} à régler (${d.invoices.map((i) => i.invoiceNumber).join(', ')}). Merci !`
      : `Hello ${d.client.name}, this is ${shop}. Friendly reminder: ${formatCurrency(d.totalDue)} is still due (${d.invoices.map((i) => i.invoiceNumber).join(', ')}). Thank you!`;
    window.open(`https://wa.me/${waPhone(d.client.phone || '')}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const submitPayment = async () => {
    if (!paying || !amount || amount <= 0) return;
    setSaving(true);
    try {
      await api.post(`/invoices/${paying.id}/payments`, { amount: Math.min(Number(amount), paying.amountDue), method });
      toast.success(fr ? 'Paiement enregistré' : 'Payment recorded');
      setPaying(null);
      setAmount('');
      load();
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const days = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">{fr ? 'Dettes clients' : 'Client debts'}</h1>
          <p className="text-sm text-muted-foreground">{fr ? 'Clients qui vous doivent de l\'argent' : 'Clients who owe you money'}</p>
        </div>
        <Card><CardContent className="p-3 text-right">
          <p className="text-xs text-muted-foreground">{fr ? 'Total à encaisser' : 'Total due'}</p>
          <p className="text-lg font-bold text-red-600">{formatCurrency(total)}</p>
        </CardContent></Card>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-kabrak-500" /></div>
      ) : debts.length === 0 ? (
        <div className="text-center py-12">
          <HandCoins className="w-14 h-14 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">{fr ? 'Aucune dette en cours.' : 'No outstanding debts.'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {debts.map((d) => (
            <Card key={d.client.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{d.client.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {d.client.phone || (fr ? 'Pas de téléphone' : 'No phone')} · {fr ? `depuis ${days(d.oldest)} j` : `${days(d.oldest)} days`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-red-600">{formatCurrency(d.totalDue)}</span>
                    {d.client.phone && (
                      <Button size="sm" variant="outline" onClick={() => reminder(d)}>
                        <MessageCircle className="w-4 h-4 mr-1" /> {fr ? 'Rappel' : 'Remind'}
                      </Button>
                    )}
                  </div>
                </div>
                <div className="divide-y rounded-lg border">
                  {d.invoices.map((inv) => (
                    <div key={inv.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{inv.invoiceNumber}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(inv.createdAt).toLocaleDateString(fr ? 'fr-FR' : 'en-US')} · {fr ? 'payé' : 'paid'} {formatCurrency(inv.amountPaid)} / {formatCurrency(inv.totalAmount)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-semibold">{formatCurrency(inv.amountDue)}</span>
                        <Button size="sm" onClick={() => { setPaying(inv); setAmount(inv.amountDue); }}>
                          <Wallet className="w-4 h-4 mr-1" /> {fr ? 'Encaisser' : 'Collect'}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {paying && (
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4">
          <Card className="w-full max-w-sm">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold">{fr ? 'Encaisser' : 'Collect'} · {paying.invoiceNumber}</h3>
                <button onClick={() => setPaying(null)} className="p-1 rounded hover:bg-accent"><X className="w-5 h-5" /></button>
              </div>
              <p className="text-sm text-muted-foreground">{fr ? 'Reste à payer' : 'Remaining'} : {formatCurrency(paying.amountDue)}</p>
              <Input type="number" min={1} max={paying.amountDue} value={amount} onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))} />
              <select value={method} onChange={(e) => setMethod(e.target.value)} className="w-full h-10 rounded-md border bg-background px-3 text-sm">
                <option value="CASH">{fr ? 'Espèces' : 'Cash'}</option>
                <option value="ORANGE_MONEY">Orange Money</option>
                <option value="MTN_MOMO">MTN MoMo</option>
                <option value="BANK_TRANSFER">{fr ? 'Virement' : 'Bank transfer'}</option>
                <option value="OTHER">{fr ? 'Autre' : 'Other'}</option>
              </select>
              <Button className="w-full" disabled={saving || !amount} onClick={submitPayment}>
                {saving ? '...' : fr ? 'Enregistrer le paiement' : 'Save payment'}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
