import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from '@/i18n/useTranslation';
import { useAuthStore } from '@/stores/authStore';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Check, Crown, Copy, Clock, ArrowLeft, Shield, Zap, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

const PLANS = [
  { value: 'STORE', price: 4900, icon: Shield, features: ['Produits & stock', 'Commandes', 'Clients', 'Factures WhatsApp', 'Dépenses & Bénéfice net', 'Dashboard & stats', 'Logo & couleur facture'], quote: false },
  { value: 'SHOP', price: 9900, icon: Zap, features: ['Tout STORE +', 'Caisse POS', 'Catégories & organisation', 'Livraisons & suivi', 'Programme fidélité', 'Employés (3)', 'Fournisseurs', 'Rapports avancés'], quote: false },
  { value: 'BUSINESS', price: 14900, icon: Star, features: ['Tout SHOP +', 'Multi-magasins', 'Employés (10+)', 'Vitrine publique', 'AI Reports (GPT-4o)', 'Lien WhatsApp commande', 'Support prioritaire'], quote: false },
];

const ORDER_BASED_PLANS = [
  { value: 'STORE', price: 4900, icon: Shield, features: ['Produits & stock', 'Commandes WhatsApp', 'Clients', 'Factures WhatsApp', 'Dépenses & Bénéfice net', 'Dashboard & stats'], quote: false },
  { value: 'SHOP', price: 9900, icon: Zap, features: ['Tout STORE +', 'Livraisons & suivi', 'Catégories & organisation', 'Programme fidélité', 'Employés (3)', 'Fournisseurs', 'Rapports avancés'], quote: false },
  { value: 'BUSINESS', price: 14900, icon: Star, features: ['Tout SHOP +', 'Multi-magasins', 'Employés (10+)', 'Vitrine publique', 'AI Reports (GPT-4o)', 'Lien WhatsApp commande', 'Support prioritaire'], quote: false },
];

const ORDER_BASED_CATS = new Set([
  'CAKES', 'FOOD_BUSINESS', 'FOOD_DELIVERY', 'HOME_COOKING', 'MADE_TO_ORDER', 'WHATSAPP_SELLER',
]);

const DURATIONS = [
  { months: 1, label: '1 mois' },
  { months: 3, label: '3 mois' },
  { months: 6, label: '6 mois' },
  { months: 12, label: '1 an' },
];

interface Subscription {
  id: string;
  plan: string;
  status: string;
  priceMonthly: number;
  startDate: string;
  endDate: string;
  isExpired: boolean;
  daysRemaining: number;
}

interface PaymentData {
  paymentId: string;
  mode: string;
  amountXAF: number;
  paymentUrl?: string;
  instructions?: {
    number: string;
    ussd: string;
    reference: string;
    steps: string[];
  };
}

export function BillingPage() {
  const { t } = useTranslation();
  const tenant = useAuthStore((s) => s.tenant);
  const businessCategories = tenant?.businessCategories || [];
  const isOrderBased = !!(businessCategories.length &&
    businessCategories.every((cat) => ORDER_BASED_CATS.has(cat)));
  const plans = isOrderBased ? ORDER_BASED_PLANS : PLANS;

  const [sub, setSub] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1); // 1=choose, 2=instructions, 3=waiting
  const [selectedPlan, setSelectedPlan] = useState('');
  const [selectedMonths, setSelectedMonths] = useState(1);
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [copied, setCopied] = useState('');
  const [pollCount, setPollCount] = useState(0);
  const [initiating, setInitiating] = useState(false);

  useEffect(() => {
    api.get('/billing/subscription')
      .then((res) => {
        setSub(res.data.data);
        setSelectedPlan(res.data.data.plan);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleInitiate = async () => {
    if (!selectedPlan) return;
    setInitiating(true);
    try {
      const res = await api.post('/billing/initiate', { plan: selectedPlan, months: selectedMonths });
      const data = res.data?.data;
      setPaymentData(data);
      if (data.mode === 'redirect' && data.paymentUrl) {
        window.location.href = data.paymentUrl;
      } else {
        setStep(2);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setInitiating(false);
    }
  };

  const pollStatus = useCallback(async () => {
    if (!paymentData?.paymentId) return;
    try {
      const res = await api.get(`/billing/status/${paymentData.paymentId}`);
      if (res.data?.data?.status === 'SUCCEEDED') {
        const { data } = await api.get('/billing/subscription');
        setSub(data.data);
        setStep(1);
        setPaymentData(null);
      } else {
        setPollCount((c) => c + 1);
      }
    } catch {
      // silent
    }
  }, [paymentData]);

  useEffect(() => {
    if (step !== 3) return;
    const timer = setTimeout(pollStatus, 5000);
    return () => clearTimeout(timer);
  }, [step, pollCount, pollStatus]);

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(''), 2000);
    });
  };

  const totalAmount = selectedPlan ? PLANS.find((p) => p.value === selectedPlan)!.price * selectedMonths : 0;

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-kabrak-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {step > 1 && (
        <Button variant="ghost" onClick={() => setStep(step - 1)}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Retour
        </Button>
      )}

      <h1 className="text-2xl font-bold">{t('billing.title')}</h1>

      {step === 1 && (
        <>
          {/* Current Subscription */}
          {sub && (
            <Card className="border-2 border-kabrak-500">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Crown className="w-5 h-5 text-amber-500" />
                      <h2 className="text-xl font-bold">KABRAK {sub.plan}</h2>
                      <Badge
                        variant={
                          sub.isExpired ? 'destructive' : sub.status === 'TRIAL' ? 'warning' : 'success'
                        }
                      >
                        {sub.isExpired
                          ? t('billing.expired')
                          : sub.status === 'TRIAL'
                            ? t('billing.trial')
                            : t('billing.active')}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {formatCurrency(sub.priceMonthly)} FCFA{t('billing.perMonth')} · {sub.daysRemaining}{' '}
                      {t('billing.daysRemaining')}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Expire le {formatDate(sub.endDate)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-blue-600">{formatCurrency(sub.priceMonthly)}</p>
                    <p className="text-sm text-muted-foreground">FCFA/mois</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Duration selector */}
          <Card>
            <CardHeader>
              <CardTitle>Durée d'abonnement</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-2">
                {DURATIONS.map((d) => (
                  <button
                    key={d.months}
                    onClick={() => setSelectedMonths(d.months)}
                    className={cn(
                      'py-3 px-2 rounded-lg text-sm font-medium transition-all border-2',
                      selectedMonths === d.months
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-700'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                    )}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Plans */}
          <div>
            <h2 className="text-lg font-semibold mb-4">{t('billing.changePlan')}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {plans.map((plan) => {
                const PlanIcon = plan.icon;
                const isSelected = selectedPlan === plan.value;
                return (
                  <Card
                    key={plan.value}
                    className={cn(
                      'transition-all cursor-pointer',
                      isSelected ? 'border-2 border-kabrak-500 shadow-lg' : 'hover:shadow-md'
                    )}
                    onClick={() => setSelectedPlan(plan.value)}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-center gap-2 mb-2">
                        <PlanIcon className="w-5 h-5 text-blue-600" />
                        <h3 className="font-bold text-lg">KABRAK {plan.value}</h3>
                      </div>
                      {plan.quote ? (
                        <p className="text-xl font-bold text-amber-600 mb-4">Sur devis</p>
                      ) : (
                        <p className="text-2xl font-bold text-blue-600 mb-4">
                          {formatCurrency(plan.price)}{' '}
                          <span className="text-sm font-normal text-muted-foreground">/mois</span>
                        </p>
                      )}
                      <ul className="space-y-2 mb-6">
                        {plan.features.map((f) => (
                          <li key={f} className="flex items-center gap-2 text-sm">
                            <Check className="w-4 h-4 text-amber-500" /> {f}
                          </li>
                        ))}
                      </ul>
                      {plan.quote && (
                        <a href="https://wa.me/237653561862?text=Bonjour%2C%20je%20suis%20int%C3%A9ress%C3%A9%20par%20le%20plan%20BUSINESS" target="_blank" rel="noreferrer"
                          className="block text-center py-2 px-4 rounded-lg bg-amber-50 text-amber-700 text-sm font-medium border border-amber-200 hover:bg-amber-100 transition-colors">
                          Contactez-nous sur WhatsApp
                        </a>
                      )}
                      {tenant?.plan === plan.value && (
                        <Badge variant="outline" className="w-full justify-center">
                          Plan actuel
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Payment buttons */}
          <Card>
            <CardHeader>
              <CardTitle>{t('billing.payNow')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center mb-4">
                <p className="text-3xl font-bold text-blue-600">{formatCurrency(totalAmount)} FCFA</p>
                <p className="text-sm text-muted-foreground">
                  KABRAK {selectedPlan} × {selectedMonths} mois
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={handleInitiate}
                  disabled={initiating}
                  className="flex items-center gap-4 p-4 border-2 rounded-xl hover:border-orange-500 transition-colors cursor-pointer text-left disabled:opacity-50"
                >
                  <div className="w-12 h-12 rounded-full bg-orange-500 flex items-center justify-center font-bold text-white text-sm">
                    OM
                  </div>
                  <div>
                    <p className="font-semibold">Orange Money</p>
                    <p className="text-xs text-muted-foreground">Payer via Orange Money</p>
                  </div>
                </button>
                <button
                  onClick={handleInitiate}
                  disabled={initiating}
                  className="flex items-center gap-4 p-4 border-2 rounded-xl hover:border-yellow-500 transition-colors cursor-pointer text-left disabled:opacity-50"
                >
                  <div className="w-12 h-12 rounded-full bg-yellow-400 flex items-center justify-center font-bold text-black text-sm">
                    MTN
                  </div>
                  <div>
                    <p className="font-semibold">MTN Mobile Money</p>
                    <p className="text-xs text-muted-foreground">Payer via MoMo</p>
                  </div>
                </button>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Step 2: Payment Instructions */}
      {step === 2 && paymentData?.instructions && (
        <Card>
          <CardHeader>
            <CardTitle>Instructions de paiement</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center mb-4">
              <p className="text-3xl font-bold text-blue-600">
                {formatCurrency(paymentData.amountXAF)} FCFA
              </p>
            </div>

            {/* Reference */}
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Référence</p>
                <p className="font-mono font-bold">{paymentData.instructions.reference}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => copy(paymentData.instructions!.reference, 'ref')}
              >
                {copied === 'ref' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>

            {/* USSD */}
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Code USSD</p>
                <p className="font-mono font-bold">{paymentData.instructions.ussd}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => copy(paymentData.instructions!.ussd, 'ussd')}
              >
                {copied === 'ussd' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>

            {/* Steps */}
            <div className="space-y-2">
              {paymentData.instructions.steps.map((s, i) => (
                <div key={i} className="flex gap-3 text-sm">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs shrink-0">
                    {i + 1}
                  </span>
                  <span>{s}</span>
                </div>
              ))}
            </div>

            <Button onClick={() => setStep(3)} className="w-full">
              J'ai effectué le paiement
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Waiting for confirmation */}
      {step === 3 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Clock className="w-16 h-16 mx-auto text-blue-600 mb-4 animate-pulse" />
            <h2 className="text-xl font-bold mb-2">En attente de confirmation...</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Nous vérifions votre paiement. Cela peut prendre quelques minutes.
            </p>
            <p className="text-xs text-muted-foreground">
              Vérification #{pollCount + 1}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
