import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/stores/authStore';
import { useTranslation } from '@/i18n/useTranslation';
import api from '@/lib/api';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const BUSINESS_CATEGORIES = [
  { value: 'CLOTHING', icon: '👗' },
  { value: 'SHOES', icon: '👟' },
  { value: 'PERFUMES', icon: '🧴' },
  { value: 'COSMETICS', icon: '💄' },
  { value: 'HIJABS_ABAYAS', icon: '🧕' },
  { value: 'JEWELRY', icon: '💍' },
  { value: 'BAGS', icon: '👜' },
  { value: 'FOOD', icon: '🍽️' },
  { value: 'CAKES', icon: '🎂' },
  { value: 'KITCHEN_PRODUCTS', icon: '🍳' },
  { value: 'OTHER', icon: '📦' },
];

const PLANS = [
  { value: 'STORE', price: '4 900', features: ['Commandes', 'Clients', 'Facturation', 'WhatsApp'] },
  { value: 'SHOP', price: '7 900', features: ['Tout STORE +', 'Gestion stock', 'Caisse POS', 'Employés'] },
  { value: 'BUSINESS', price: '12 900', features: ['Tout SHOP +', 'Multi-employés', 'Permissions', 'Rapports avancés'] },
];

const categoryKeyMap: Record<string, string> = {
  CLOTHING: 'clothing', SHOES: 'shoes', PERFUMES: 'perfumes', COSMETICS: 'cosmetics',
  HIJABS_ABAYAS: 'hijabsAbayas', JEWELRY: 'jewelry', BAGS: 'bags', FOOD: 'food',
  CAKES: 'cakes', KITCHEN_PRODUCTS: 'kitchenProducts', OTHER: 'other',
};

export function RegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    email: '', password: '', firstName: '', lastName: '', phone: '',
    storeName: '', plan: 'STORE' as string, businessCategories: [] as string[],
  });

  const toggleCategory = (cat: string) => {
    setForm((prev) => ({
      ...prev,
      businessCategories: prev.businessCategories.includes(cat)
        ? prev.businessCategories.filter((c) => c !== cat)
        : [...prev.businessCategories, cat],
    }));
  };

  const handleSubmit = async () => {
    setError('');
    setLoading(true);

    try {
      const { data } = await api.post('/auth/register', form);
      setAuth(data.data);
      navigate('/');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr.response?.data?.message || "Erreur lors de l'inscription");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-kabrak-500 via-kabrak-600 to-kabrak-900 p-4">
      <Card className="w-full max-w-2xl shadow-2xl">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-kabrak-500 flex items-center justify-center mb-4">
            <span className="text-white font-bold text-2xl">K</span>
          </div>
          <CardTitle className="text-2xl">KABRAK</CardTitle>
          <p className="text-gold-500 font-semibold text-sm tracking-widest">
            {t('auth.register')} — {t('common.status')} {step}/3
          </p>

          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2 mt-4">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={cn(
                  'w-3 h-3 rounded-full transition-all',
                  s === step ? 'bg-kabrak-500 scale-125' : s < step ? 'bg-gold-500' : 'bg-muted'
                )}
              />
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg mb-4">{error}</div>
          )}

          {/* Step 1: Personal info */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">{t('auth.firstName')}</label>
                  <Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">{t('auth.lastName')}</label>
                  <Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">{t('auth.email')}</label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">{t('auth.password')}</label>
                <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">{t('auth.phone')}</label>
                <Input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">{t('auth.storeName')}</label>
                <Input value={form.storeName} onChange={(e) => setForm({ ...form, storeName: e.target.value })} required />
              </div>
              <Button onClick={() => setStep(2)} className="w-full" size="lg"
                disabled={!form.firstName || !form.lastName || !form.email || !form.password || !form.storeName}>
                {t('common.next')}
              </Button>
            </div>
          )}

          {/* Step 2: What do you sell? */}
          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-center">{t('auth.whatDoYouSell')}</h3>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {BUSINESS_CATEGORIES.map((cat) => {
                  const isSelected = form.businessCategories.includes(cat.value);
                  return (
                    <button
                      key={cat.value}
                      onClick={() => toggleCategory(cat.value)}
                      className={cn(
                        'flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all cursor-pointer',
                        isSelected
                          ? 'border-kabrak-500 bg-kabrak-50 dark:bg-kabrak-900/20'
                          : 'border-border hover:border-kabrak-300'
                      )}
                    >
                      <span className="text-2xl">{cat.icon}</span>
                      <span className="text-xs font-medium text-center">
                        {t(`categories.${categoryKeyMap[cat.value]}`)}
                      </span>
                      {isSelected && <Check className="w-4 h-4 text-kabrak-500" />}
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">{t('common.back')}</Button>
                <Button onClick={() => setStep(3)} className="flex-1"
                  disabled={form.businessCategories.length === 0}>{t('common.next')}</Button>
              </div>
            </div>
          )}

          {/* Step 3: Choose plan */}
          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-center">{t('auth.selectPlan')}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {PLANS.map((plan) => (
                  <button
                    key={plan.value}
                    onClick={() => setForm({ ...form, plan: plan.value })}
                    className={cn(
                      'flex flex-col p-4 rounded-xl border-2 transition-all text-left cursor-pointer',
                      form.plan === plan.value
                        ? 'border-kabrak-500 bg-kabrak-50 dark:bg-kabrak-900/20 shadow-lg'
                        : 'border-border hover:border-kabrak-300'
                    )}
                  >
                    <span className="font-bold text-lg">KABRAK {plan.value}</span>
                    <span className="text-2xl font-bold text-kabrak-500 mt-1">
                      {plan.price} <span className="text-sm font-normal text-muted-foreground">FCFA/mois</span>
                    </span>
                    <ul className="mt-3 space-y-1">
                      {plan.features.map((f) => (
                        <li key={f} className="text-xs text-muted-foreground flex items-center gap-1">
                          <Check className="w-3 h-3 text-gold-500" /> {f}
                        </li>
                      ))}
                    </ul>
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(2)} className="flex-1">{t('common.back')}</Button>
                <Button onClick={handleSubmit} className="flex-1" size="lg" disabled={loading}>
                  {loading ? t('common.loading') : t('auth.createAccount')}
                </Button>
              </div>
            </div>
          )}

          <p className="text-center text-sm text-muted-foreground mt-4">
            {t('auth.alreadyHaveAccount')}{' '}
            <Link to="/login" className="text-kabrak-500 font-medium hover:underline">
              {t('auth.login')}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
