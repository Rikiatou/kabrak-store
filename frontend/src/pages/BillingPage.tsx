import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from '@/i18n/useTranslation';
import { useAuthStore } from '@/stores/authStore';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Check, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

const PLANS = [
  { value: 'STORE', price: 4900, features: ['Commandes', 'Clients', 'Facturation', 'WhatsApp', 'Dashboard simple'] },
  { value: 'SHOP', price: 7900, features: ['Tout STORE +', 'Gestion stock', 'Caisse POS', 'Employés légers', 'Dashboard avancé'] },
  { value: 'BUSINESS', price: 12900, features: ['Tout SHOP +', 'Multi-employés', 'Permissions', 'Rapports avancés', 'Multi-catégories'] },
];

interface Subscription {
  id: string; plan: string; status: string; priceMonthly: number;
  startDate: string; endDate: string;
  isExpired: boolean; daysRemaining: number;
}

export function BillingPage() {
  const { t } = useTranslation();
  const tenant = useAuthStore((s) => s.tenant);
  const [sub, setSub] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/billing/subscription')
      .then((res) => setSub(res.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleChangePlan = async (plan: string) => {
    try {
      await api.post('/billing/change-plan', { plan });
      const { data } = await api.get('/billing/subscription');
      setSub(data.data);
    } catch (err) { console.error(err); }
  };

  const handlePay = async (method: string) => {
    try {
      await api.post('/billing/pay', { method, phone: '+237 6XX XXX XXX' });
      // Simulate confirmation
      await api.post('/billing/confirm');
      const { data } = await api.get('/billing/subscription');
      setSub(data.data);
    } catch (err) { console.error(err); }
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-kabrak-500" /></div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('billing.title')}</h1>

      {/* Current Subscription */}
      {sub && (
        <Card className="border-2 border-kabrak-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Crown className="w-5 h-5 text-gold-500" />
                  <h2 className="text-xl font-bold">KABRAK {sub.plan}</h2>
                  <Badge variant={sub.isExpired ? 'destructive' : sub.status === 'TRIAL' ? 'warning' : 'success'}>
                    {sub.isExpired ? t('billing.expired') : sub.status === 'TRIAL' ? t('billing.trial') : t('billing.active')}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {formatCurrency(sub.priceMonthly)} FCFA{t('billing.perMonth')} · {sub.daysRemaining} {t('billing.daysRemaining')}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Expire le {formatDate(sub.endDate)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-kabrak-500">{formatCurrency(sub.priceMonthly)}</p>
                <p className="text-sm text-muted-foreground">FCFA/mois</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Methods */}
      <Card>
        <CardHeader><CardTitle>{t('billing.payNow')}</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button onClick={() => handlePay('MTN_MOMO')}
            className="flex items-center gap-4 p-4 border-2 rounded-xl hover:border-yellow-500 transition-colors cursor-pointer text-left">
            <div className="w-12 h-12 rounded-full bg-yellow-400 flex items-center justify-center font-bold text-black text-sm">MTN</div>
            <div><p className="font-semibold">MTN Mobile Money</p><p className="text-xs text-muted-foreground">Payer via MoMo</p></div>
          </button>
          <button onClick={() => handlePay('ORANGE_MONEY')}
            className="flex items-center gap-4 p-4 border-2 rounded-xl hover:border-orange-500 transition-colors cursor-pointer text-left">
            <div className="w-12 h-12 rounded-full bg-orange-500 flex items-center justify-center font-bold text-white text-sm">OM</div>
            <div><p className="font-semibold">Orange Money</p><p className="text-xs text-muted-foreground">Payer via OM</p></div>
          </button>
        </CardContent>
      </Card>

      {/* Plans */}
      <div>
        <h2 className="text-lg font-semibold mb-4">{t('billing.changePlan')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {PLANS.map((plan) => (
            <Card key={plan.value} className={cn(
              'transition-all',
              tenant?.plan === plan.value ? 'border-2 border-kabrak-500 shadow-lg' : 'hover:shadow-md'
            )}>
              <CardContent className="p-6">
                <h3 className="font-bold text-lg mb-1">KABRAK {plan.value}</h3>
                <p className="text-2xl font-bold text-kabrak-500 mb-4">
                  {formatCurrency(plan.price)} <span className="text-sm font-normal text-muted-foreground">/mois</span>
                </p>
                <ul className="space-y-2 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-gold-500" /> {f}
                    </li>
                  ))}
                </ul>
                {tenant?.plan === plan.value ? (
                  <Button disabled className="w-full" variant="outline">Plan actuel</Button>
                ) : (
                  <Button onClick={() => handleChangePlan(plan.value)} className="w-full" variant={plan.value === 'BUSINESS' ? 'gold' : 'default'}>
                    {t('billing.changePlan')}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
