import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useTranslation } from '@/i18n/useTranslation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { getErrorMessage } from '@/lib/errors';
import { businessTypeKey } from '@/lib/businessType';
import { CATEGORY_ICONS, PRODUCT_CATEGORY_GROUPS, SERVICE_CATEGORIES } from '@/lib/categoryIcons';
import api from '@/lib/api';
import { AlertCircle, ArrowLeft, Check, Eye, EyeOff, ChevronRight, ChevronLeft, ShoppingBag, Briefcase, ClipboardList } from 'lucide-react';
import { cn } from '@/lib/utils';

type BusinessMode = 'PRODUCT' | 'SERVICE';


const PLANS = [
  { value: 'STORE', price: '4 900', features: ['featOrders', 'pClients', 'pInvoicing', 'pWhatsapp'] },
  { value: 'SHOP', price: '7 900', features: ['allStore', 'pStock', 'pPos', 'pEmployees'] },
  { value: 'BUSINESS', price: '12 900', features: ['allShop', 'pMultiEmployees', 'pPermissions', 'pReports'] },
];

const SERVICE_PLANS = [
  { value: 'STORE', price: '4 900', features: ['featProjects', 'pClients', 'pInvoicing', 'pWhatsapp'] },
  { value: 'SHOP', price: '7 900', features: ['allStore', 'featRecurring', 'featMilestones', 'pEmployees'] },
  { value: 'BUSINESS', price: '12 900', features: ['allShop', 'pMultiEmployees', 'pPermissions', 'pReports'] },
];

const MODES: Array<{ value: BusinessMode; icon: typeof ShoppingBag; title: string; desc: string; features: string[] }> = [
  { value: 'PRODUCT', icon: ShoppingBag, title: 'productsMode', desc: 'productsModeDesc', features: ['featStock', 'featPos', 'featOrders', 'featDelivery'] },
  { value: 'SERVICE', icon: Briefcase, title: 'servicesMode', desc: 'servicesModeDesc', features: ['featProjects', 'featInvoices', 'featRecurring', 'featMilestones'] },
];

function BackButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <Button type="button" variant="outline" className="flex-1" onClick={onClick}>
      <ChevronLeft className="mr-1 h-4 w-4" /> {label}
    </Button>
  );
}

export function RegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [form, setForm] = useState({
    email: '', password: '', firstName: '', lastName: '', phone: '',
    storeName: '', plan: 'STORE' as string,
    businessMode: '' as BusinessMode | '',
    businessCategories: [] as string[],
  });

  const stepLabels = [t('auth.stepBusiness'), t('auth.stepInfo'), t('auth.stepCategories'), t('auth.stepPlan')];
  const isService = form.businessMode === 'SERVICE';
  const categoryGroups = isService ? [{ key: '', cats: SERVICE_CATEGORIES }] : PRODUCT_CATEGORY_GROUPS;
  const plans = isService ? SERVICE_PLANS : PLANS;
  const tooShort = form.password.length > 0 && form.password.length < 6;

  const toggleCategory = (cat: string) => {
    setForm((prev) => ({
      ...prev,
      businessCategories: prev.businessCategories.includes(cat)
        ? prev.businessCategories.filter((c) => c !== cat)
        : [...prev.businessCategories, cat],
    }));
  };

  const selectMode = (mode: BusinessMode) => {
    setForm((prev) => ({ ...prev, businessMode: mode, businessCategories: prev.businessMode === mode ? prev.businessCategories : [] }));
    setStep(2);
  };

  const handleInfoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < 6) return;
    setError('');
    setStep(3);
  };

  const handleSubmit = async () => {
    setError('');
    setLoading(true);
    try {
      const payload = { ...form, businessMode: form.businessMode || 'PRODUCT' };
      const { data } = await api.post('/auth/register', payload);
      setAuth(data.data);
      navigate('/dashboard');
    } catch (err) {
      setError(getErrorMessage(err, t('auth.registerError')));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-start justify-center bg-muted/40 p-4 py-8">
      <Link
        to="/"
        className="fixed left-4 top-4 z-10 flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm font-medium text-muted-foreground shadow-sm transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> {t('auth.home')}
      </Link>

      <div className="w-full max-w-lg pt-14 sm:pt-4">
        <div className="mb-6 text-center">
          <img src="/logo.png" alt="KABRAK Store" className="mx-auto mb-1 h-16 object-contain sm:h-20" />
          <p className="text-sm text-muted-foreground">{t('auth.registerSubtitle')}</p>
        </div>

        <ol className="mb-6 flex items-center justify-center gap-1" aria-label={t('auth.registerSubtitle')}>
          {[1, 2, 3, 4].map((s) => (
            <li key={s} className="flex items-center" aria-current={s === step ? 'step' : undefined}>
              <div className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors',
                s === step ? 'bg-primary text-primary-foreground' : s < step ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
              )}>
                {s < step ? <Check className="h-4 w-4" /> : s}
              </div>
              <span className={cn('ml-1.5 hidden text-xs font-medium sm:inline', s === step ? 'text-primary' : 'text-muted-foreground')}>
                {stepLabels[s - 1]}
              </span>
              {s < 4 && <div className={cn('mx-1 h-0.5 w-6', s < step ? 'bg-primary/50' : 'bg-border')} />}
            </li>
          ))}
        </ol>

        <div className="rounded-xl border bg-card p-6 shadow-sm sm:p-8">
          {error && (
            <div role="alert" className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0" /> {error}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div className="text-center">
                <h2 className="text-base font-semibold">{t('auth.whatDoYouManage')}</h2>
                <p className="mt-1 text-xs text-muted-foreground">{t('auth.modeHint')}</p>
              </div>
              {MODES.map((m) => {
                const Icon = m.icon;
                const selected = form.businessMode === m.value;
                return (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => selectMode(m.value)}
                    className={cn(
                      'group flex w-full items-start gap-4 rounded-xl border-2 p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      selected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
                    )}
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{t(`auth.${m.title}`)}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{t(`auth.${m.desc}`)}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {m.features.map((f) => (
                          <span key={f} className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">{t(`auth.${f}`)}</span>
                        ))}
                      </div>
                    </div>
                    <ChevronRight className="mt-3 h-5 w-5 shrink-0 text-muted-foreground group-hover:text-primary" />
                  </button>
                );
              })}
            </div>
          )}

          {step === 2 && (
            <form onSubmit={handleInfoSubmit} className="space-y-4">
              <h2 className="text-center text-base font-semibold">{t('auth.yourInfo')}</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="rg-first">{t('auth.firstName')} *</Label>
                  <Input id="rg-first" required autoComplete="given-name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="rg-last">{t('auth.lastName')} *</Label>
                  <Input id="rg-last" required autoComplete="family-name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
                </div>
              </div>
              <div>
                <Label htmlFor="rg-email">{t('auth.email')} *</Label>
                <Input id="rg-email" type="email" required autoComplete="email" value={form.email} placeholder={t('auth.emailPlaceholder')}
                  onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="rg-pass">{t('auth.password')} *</Label>
                <div className="relative">
                  <Input id="rg-pass" type={showPass ? 'text' : 'password'} required minLength={6} autoComplete="new-password"
                    value={form.password} placeholder="••••••••" aria-invalid={tooShort}
                    className={cn('pr-10', tooShort && 'border-destructive focus-visible:ring-destructive')}
                    onChange={(e) => setForm({ ...form, password: e.target.value })} />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    aria-label={showPass ? t('auth.hidePassword') : t('auth.showPassword')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {tooShort && <p className="mt-1 text-xs text-destructive">{t('common.minPassword')}</p>}
              </div>
              <div>
                <Label htmlFor="rg-phone">{t('auth.phone')}</Label>
                <Input id="rg-phone" type="tel" autoComplete="tel" value={form.phone} placeholder="6 XX XX XX XX"
                  onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="rg-store">{isService ? t('auth.businessName') : t('auth.storeName')} *</Label>
                <Input id="rg-store" required value={form.storeName}
                  placeholder={isService ? t('auth.businessNameHint') : t('auth.storeNameHint')}
                  onChange={(e) => setForm({ ...form, storeName: e.target.value })} />
              </div>
              <div className="flex gap-3 pt-2">
                <BackButton onClick={() => setStep(1)} label={t('auth.back')} />
                <Button type="submit" className="flex-1">{t('auth.continue')} <ChevronRight className="ml-1 h-4 w-4" /></Button>
              </div>
            </form>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="text-center">
                <h2 className="text-base font-semibold">{isService ? t('auth.whatService') : t('auth.whatDoYouSell')}</h2>
                <p className="mt-1 text-xs text-muted-foreground">{t('auth.selectCategories')}</p>
              </div>
              <div className="max-h-[360px] space-y-4 overflow-y-auto pr-1">
                {categoryGroups.map((group) => (
                  <div key={group.key || 'all'}>
                    {group.key && <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t(`categories.${group.key}`)}</p>}
                    <div className="grid grid-cols-2 gap-2.5 min-[400px]:grid-cols-3 sm:grid-cols-4">
                      {group.cats.map((cat) => {
                        const isSelected = form.businessCategories.includes(cat);
                        const Icon = CATEGORY_ICONS[cat] || ClipboardList;
                        return (
                          <button
                            key={cat}
                            type="button"
                            aria-pressed={isSelected}
                            onClick={() => toggleCategory(cat)}
                            className={cn(
                              'relative flex flex-col items-center gap-1.5 rounded-lg border-2 p-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                              isSelected ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/40'
                            )}
                          >
                            {isSelected && <Check className="absolute right-1.5 top-1.5 h-3.5 w-3.5" />}
                            <Icon className={cn('h-5 w-5', !isSelected && 'text-muted-foreground')} />
                            <span className="text-center text-[11px] font-medium leading-tight text-foreground">{t(businessTypeKey(cat))}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-3 pt-2">
                <BackButton onClick={() => setStep(2)} label={t('auth.back')} />
                <Button className="flex-1" onClick={() => setStep(4)} disabled={form.businessCategories.length === 0}>
                  {t('auth.continue')} <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <h2 className="text-center text-base font-semibold">{t('auth.selectPlan')}</h2>
              <div role="radiogroup" aria-label={t('auth.selectPlan')} className="space-y-3">
                {plans.map((plan) => {
                  const isSelected = form.plan === plan.value;
                  return (
                    <button
                      key={plan.value}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      onClick={() => setForm({ ...form, plan: plan.value })}
                      className={cn(
                        'flex w-full items-start gap-4 rounded-xl border-2 p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
                      )}
                    >
                      <div className={cn(
                        'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2',
                        isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/40'
                      )}>
                        {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                          <span className="font-bold">KABRAK {plan.value}</span>
                          <span className="text-lg font-bold text-primary">
                            {plan.price} <span className="text-xs font-normal text-muted-foreground">{t('auth.perMonth')}</span>
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {plan.features.map((f) => (
                            <span key={f} className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">{t(`auth.${f}`)}</span>
                          ))}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
              <p className="text-center text-xs text-muted-foreground">{t('auth.trialNote')}</p>
              <div className="flex gap-3 pt-1">
                <BackButton onClick={() => setStep(3)} label={t('auth.back')} />
                <Button className="flex-1" onClick={handleSubmit} disabled={loading}>
                  {loading && <Spinner className="mr-2" />}
                  {loading ? t('auth.creating') : t('auth.createAccount')}
                </Button>
              </div>
            </div>
          )}

          <p className="mt-5 text-center text-sm text-muted-foreground">
            {t('auth.alreadyHaveAccount')}{' '}
            <Link to="/login" className="font-medium text-primary hover:underline">{t('auth.login')}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
