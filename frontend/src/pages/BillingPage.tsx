import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import { LoadingState, Spinner } from '@/components/ui/spinner';
import { useTranslation } from '@/i18n/useTranslation';
import { useAuthStore } from '@/stores/authStore';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import { getErrorMessage } from '@/lib/errors';
import { Check, Crown, Copy, Clock, ArrowLeft, Shield, Zap, Star } from 'lucide-react';
import api from '@/lib/api';

const PLANS = [
  { value: 'STORE', price: 4900, icon: Shield, features: ['orders', 'clients', 'invoicing', 'whatsapp', 'simpleDashboard'] },
  { value: 'SHOP', price: 7900, icon: Zap, features: ['allStore', 'stock', 'pos', 'lightEmployees', 'advancedDashboard'] },
  { value: 'BUSINESS', price: 12900, icon: Star, features: ['allShop', 'multiEmployees', 'permissions', 'multiStores', 'advancedReports'] },
];

const DURATIONS = [1, 3, 6, 12];

const PAYMENT_PROVIDERS = [
  { key: 'om', name: 'Orange Money', short: 'OM', badge: 'bg-orange-500 text-white', hover: 'hover:border-orange-500' },
  { key: 'mtn', name: 'MTN Mobile Money', short: 'MTN', badge: 'bg-yellow-400 text-black', hover: 'hover:border-yellow-500' },
];

function CopyRow({ label, value, copied, onCopy, copyLabel, copiedLabel }: {
  label: string; value: string; copied: boolean; onCopy: () => void; copyLabel: string; copiedLabel: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-muted p-3">
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate font-mono font-semibold">{value}</p>
      </div>
      <Button variant="ghost" size="icon" onClick={onCopy} aria-label={copyLabel} title={copied ? copiedLabel : copyLabel}>
        {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
      </Button>
    </div>
  );
}

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
  const [sub, setSub] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1); // 1=choose, 2=instructions, 3=waiting
  const [selectedPlan, setSelectedPlan] = useState('');
  const [selectedMonths, setSelectedMonths] = useState(1);
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [copied, setCopied] = useState('');
  const [pollCount, setPollCount] = useState(0);
  const [initiating, setInitiating] = useState<string | null>(null);

  useEffect(() => {
    api.get('/billing/subscription')
      .then((res) => {
        setSub(res.data.data);
        setSelectedPlan(res.data.data.plan);
      })
      .catch((err) => toast.error(getErrorMessage(err, t('common.loadError'))))
      .finally(() => setLoading(false));
  }, [t]);

  const handleInitiate = async (provider: string) => {
    if (!selectedPlan) return;
    setInitiating(provider);
    try {
      const res = await api.post('/billing/initiate', { plan: selectedPlan, months: selectedMonths });
      const data = res.data?.data;
      setPaymentData(data);
      if (data.mode === 'redirect' && data.paymentUrl) {
        window.location.assign(data.paymentUrl);
      } else {
        setStep(2);
      }
    } catch (err) {
      toast.error(getErrorMessage(err, t('billing.paymentError')));
    } finally {
      setInitiating(null);
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
        toast.success(t('billing.paymentConfirmed'));
      } else {
        setPollCount((c) => c + 1);
      }
    } catch {
      setPollCount((c) => c + 1);
    }
  }, [paymentData, t]);

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

  const durationLabel = (m: number) => t(`billing.month${m}`);
  const totalAmount = selectedPlan ? (PLANS.find((p) => p.value === selectedPlan)?.price || 0) * selectedMonths : 0;

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-6">
      {step > 1 && (
        <Button variant="ghost" size="sm" onClick={() => setStep(step - 1)} className="-ml-2">
          <ArrowLeft className="mr-2 h-4 w-4" /> {t('billing.back')}
        </Button>
      )}

      <PageHeader title={t('billing.title')} />

      {step === 1 && (
        <>
          {sub && (
            <Card className="border-primary">
              <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <Crown className="h-5 w-5 text-gold-500" />
                    <h2 className="text-lg font-bold sm:text-xl">KABRAK {sub.plan}</h2>
                    <Badge variant={sub.isExpired ? 'destructive' : sub.status === 'TRIAL' ? 'warning' : 'success'}>
                      {sub.isExpired ? t('billing.expired') : sub.status === 'TRIAL' ? t('billing.trial') : t('billing.active')}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {sub.daysRemaining} {t('billing.daysRemaining').toLowerCase()}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{t('billing.expiresOn', { date: formatDate(sub.endDate) })}</p>
                </div>
                <div className="sm:text-right">
                  <p className="text-2xl font-bold text-primary sm:text-3xl">{formatCurrency(sub.priceMonthly)}</p>
                  <p className="text-sm text-muted-foreground">{t('billing.perMonth')}</p>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('billing.duration')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div role="radiogroup" aria-label={t('billing.duration')} className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {DURATIONS.map((m) => (
                  <button
                    key={m}
                    role="radio"
                    aria-checked={selectedMonths === m}
                    onClick={() => setSelectedMonths(m)}
                    className={cn(
                      'rounded-lg border-2 px-2 py-3 text-sm font-medium transition-colors',
                      selectedMonths === m ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/40'
                    )}
                  >
                    {durationLabel(m)}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <div>
            <h2 className="mb-4 text-lg font-semibold">{t('billing.changePlan')}</h2>
            <div role="radiogroup" aria-label={t('billing.changePlan')} className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {PLANS.map((plan) => {
                const PlanIcon = plan.icon;
                const isSelected = selectedPlan === plan.value;
                return (
                  <button
                    key={plan.value}
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => setSelectedPlan(plan.value)}
                    className={cn(
                      'rounded-xl border-2 bg-card p-5 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:p-6',
                      isSelected ? 'border-primary shadow-md' : 'border-border hover:shadow-sm'
                    )}
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <PlanIcon className="h-5 w-5 text-primary" />
                        <h3 className="text-lg font-bold">KABRAK {plan.value}</h3>
                      </div>
                      {isSelected && <Check className="h-5 w-5 text-primary" />}
                    </div>
                    <p className="mb-4 text-2xl font-bold">
                      {formatCurrency(plan.price)}{' '}
                      <span className="text-sm font-normal text-muted-foreground">{t('billing.perMonth')}</span>
                    </p>
                    <ul className="mb-4 space-y-2">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-center gap-2 text-sm">
                          <Check className="h-4 w-4 shrink-0 text-success" /> {t(`planFeatures.${f}`)}
                        </li>
                      ))}
                    </ul>
                    {tenant?.plan === plan.value && (
                      <Badge variant="outline" className="w-full justify-center">{t('billing.currentPlan')}</Badge>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('billing.payNow')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4 text-center">
                <p className="text-3xl font-bold text-primary">{formatCurrency(totalAmount)}</p>
                <p className="text-sm text-muted-foreground">KABRAK {selectedPlan} × {durationLabel(selectedMonths)}</p>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                {PAYMENT_PROVIDERS.map((p) => (
                  <button
                    key={p.key}
                    onClick={() => handleInitiate(p.key)}
                    disabled={!!initiating}
                    className={cn('flex items-center gap-4 rounded-xl border-2 p-4 text-left transition-colors disabled:opacity-50', p.hover)}
                  >
                    <div className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-bold', p.badge)}>
                      {initiating === p.key ? <Spinner /> : p.short}
                    </div>
                    <div>
                      <p className="font-semibold">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{t('billing.payWith', { name: p.name })}</p>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {step === 2 && paymentData?.instructions && (
        <Card className="mx-auto max-w-xl">
          <CardHeader>
            <CardTitle className="text-base">{t('billing.instructions')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-3xl font-bold text-primary">{formatCurrency(paymentData.amountXAF)}</p>
            <CopyRow label={t('billing.reference')} value={paymentData.instructions.reference} copied={copied === 'ref'}
              onCopy={() => copy(paymentData.instructions!.reference, 'ref')} copyLabel={t('billing.copy')} copiedLabel={t('billing.copied')} />
            <CopyRow label={t('billing.ussd')} value={paymentData.instructions.ussd} copied={copied === 'ussd'}
              onCopy={() => copy(paymentData.instructions!.ussd, 'ussd')} copyLabel={t('billing.copy')} copiedLabel={t('billing.copied')} />
            <ol className="space-y-2">
              {paymentData.instructions.steps.map((s, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">{i + 1}</span>
                  <span>{s}</span>
                </li>
              ))}
            </ol>
            <Button onClick={() => setStep(3)} className="w-full">{t('billing.iHavePaid')}</Button>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card className="mx-auto max-w-xl">
          <CardContent className="p-8 text-center">
            <Clock className="mx-auto mb-4 h-14 w-14 animate-pulse text-primary" />
            <h2 className="mb-2 text-xl font-bold">{t('billing.waiting')}</h2>
            <p className="mb-4 text-sm text-muted-foreground">{t('billing.waitingDesc')}</p>
            <p className="text-xs text-muted-foreground">{t('billing.check', { n: pollCount + 1 })}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
