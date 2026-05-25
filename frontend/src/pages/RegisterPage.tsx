import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useTranslation } from '@/i18n/useTranslation';
import api from '@/lib/api';
import { ArrowLeft, Check, Eye, EyeOff, Store, ChevronRight, ChevronLeft } from 'lucide-react';
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
  { value: 'STORE', price: '4 900', color: 'blue', features: ['Commandes', 'Clients', 'Facturation', 'WhatsApp'] },
  { value: 'SHOP', price: '7 900', color: 'violet', features: ['Tout STORE +', 'Gestion stock', 'Caisse POS', 'Employés'] },
  { value: 'BUSINESS', price: '12 900', color: 'amber', features: ['Tout SHOP +', 'Multi-employés', 'Permissions', 'Rapports avancés'] },
];

const categoryKeyMap: Record<string, string> = {
  CLOTHING: 'clothing', SHOES: 'shoes', PERFUMES: 'perfumes', COSMETICS: 'cosmetics',
  HIJABS_ABAYAS: 'hijabsAbayas', JEWELRY: 'jewelry', BAGS: 'bags', FOOD: 'food',
  CAKES: 'cakes', KITCHEN_PRODUCTS: 'kitchenProducts', OTHER: 'other',
};

const STEP_LABELS_FR = ['Informations', 'Votre activité', 'Votre plan'];
const STEP_LABELS_EN = ['Your Info', 'Your Business', 'Your Plan'];

export function RegisterPage() {
  const { t, language } = useTranslation();
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [form, setForm] = useState({
    email: '', password: '', firstName: '', lastName: '', phone: '',
    storeName: '', plan: 'STORE' as string, businessCategories: [] as string[],
  });

  const stepLabels = language === 'fr' ? STEP_LABELS_FR : STEP_LABELS_EN;

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
      navigate('/dashboard');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr.response?.data?.message || "Erreur lors de l'inscription");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-start justify-center p-4 py-8 overflow-auto"
      style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #f5f3ff 50%, #fefce8 100%)' }}>

      <Link to="/" className="fixed top-5 left-5 z-10 flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600 font-medium transition-colors bg-white/80 backdrop-blur-sm px-3 py-2 rounded-xl shadow-sm">
        <ArrowLeft className="w-4 h-4" /> {language === 'fr' ? 'Accueil' : 'Home'}
      </Link>

      <div className="w-full max-w-lg pt-14 sm:pt-4">
        <div className="text-center mb-6">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center mb-3 shadow-lg shadow-blue-200">
            <Store className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-xl font-black text-gray-900">KABRAK <span className="text-blue-600">Store</span></h1>
          <p className="text-gray-400 mt-1 text-sm">
            {language === 'fr' ? 'Créez votre espace en 3 étapes' : 'Create your space in 3 steps'}
          </p>
        </div>

        {/* Step progress */}
        <div className="flex items-center justify-center gap-1 mb-6">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all',
                s === step ? 'bg-blue-600 text-white shadow-md shadow-blue-200' :
                s < step ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'
              )}>
                {s < step ? <Check className="w-4 h-4" /> : s}
              </div>
              <span className={cn(
                'text-xs ml-1.5 font-medium hidden sm:inline',
                s === step ? 'text-blue-600' : 'text-gray-400'
              )}>
                {stepLabels[s - 1]}
              </span>
              {s < 3 && <div className={cn('w-8 h-0.5 mx-2', s < step ? 'bg-blue-400' : 'bg-gray-200')} />}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-xl shadow-blue-100/50 p-6 sm:p-8 border border-gray-100">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl border border-red-100 mb-4">{error}</div>
          )}

          {/* Step 1: Personal info */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-base font-semibold text-gray-800 text-center mb-2">
                {language === 'fr' ? 'Vos informations' : 'Your information'}
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('auth.firstName')}</label>
                  <input
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all bg-gray-50/50"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('auth.lastName')}</label>
                  <input
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all bg-gray-50/50"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('auth.email')}</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder={language === 'fr' ? 'vous@exemple.com' : 'you@example.com'}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all bg-gray-50/50"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('auth.password')}</label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all pr-12 bg-gray-50/50"
                    required
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('auth.phone')}</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="6 XX XX XX XX"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all bg-gray-50/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('auth.storeName')}</label>
                <input
                  value={form.storeName}
                  onChange={(e) => setForm({ ...form, storeName: e.target.value })}
                  placeholder={language === 'fr' ? 'Nom de votre boutique' : 'Your store name'}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all bg-gray-50/50"
                  required
                />
              </div>
              <button
                onClick={() => setStep(2)}
                disabled={!form.firstName || !form.lastName || !form.email || !form.password || !form.storeName}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold text-sm hover:opacity-90 transition-all shadow-lg shadow-blue-200 disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {language === 'fr' ? 'Continuer' : 'Continue'} <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Step 2: What do you sell? */}
          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-base font-semibold text-gray-800 text-center">
                {t('auth.whatDoYouSell')}
              </h3>
              <p className="text-xs text-gray-400 text-center">
                {language === 'fr' ? 'Sélectionnez une ou plusieurs catégories' : 'Select one or more categories'}
              </p>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                {BUSINESS_CATEGORIES.map((cat) => {
                  const isSelected = form.businessCategories.includes(cat.value);
                  return (
                    <button
                      key={cat.value}
                      onClick={() => toggleCategory(cat.value)}
                      className={cn(
                        'flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all cursor-pointer',
                        isSelected
                          ? 'border-blue-500 bg-blue-50 shadow-sm'
                          : 'border-gray-100 hover:border-gray-200 bg-gray-50/50'
                      )}
                    >
                      <span className="text-xl">{cat.icon}</span>
                      <span className="text-[11px] font-medium text-center text-gray-600 leading-tight">
                        {t(`categories.${categoryKeyMap[cat.value]}`)}
                      </span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-blue-500" />}
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-medium text-sm hover:bg-gray-50 transition-all flex items-center justify-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" /> {language === 'fr' ? 'Retour' : 'Back'}
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={form.businessCategories.length === 0}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold text-sm hover:opacity-90 transition-all shadow-lg shadow-blue-200 disabled:opacity-40 flex items-center justify-center gap-1"
                >
                  {language === 'fr' ? 'Continuer' : 'Continue'} <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Choose plan */}
          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-base font-semibold text-gray-800 text-center">
                {t('auth.selectPlan')}
              </h3>
              <div className="space-y-3">
                {PLANS.map((plan) => {
                  const isSelected = form.plan === plan.value;
                  return (
                    <button
                      key={plan.value}
                      onClick={() => setForm({ ...form, plan: plan.value })}
                      className={cn(
                        'w-full flex items-start gap-4 p-4 rounded-xl border-2 transition-all text-left cursor-pointer',
                        isSelected
                          ? 'border-blue-500 bg-blue-50/50 shadow-sm'
                          : 'border-gray-100 hover:border-gray-200'
                      )}
                    >
                      <div className={cn(
                        'w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center',
                        isSelected ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                      )}>
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between">
                          <span className="font-bold text-gray-900">KABRAK {plan.value}</span>
                          <span className="text-lg font-bold text-blue-600">
                            {plan.price} <span className="text-xs font-normal text-gray-400">FCFA/mois</span>
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {plan.features.map((f) => (
                            <span key={f} className="text-[11px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                              {f}
                            </span>
                          ))}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-medium text-sm hover:bg-gray-50 transition-all flex items-center justify-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" /> {language === 'fr' ? 'Retour' : 'Back'}
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold text-sm hover:opacity-90 transition-all shadow-lg shadow-blue-200 disabled:opacity-60"
                >
                  {loading
                    ? (language === 'fr' ? 'Création...' : 'Creating...')
                    : (language === 'fr' ? 'Créer mon compte' : 'Create my account')
                  }
                </button>
              </div>
            </div>
          )}

          <p className="text-center text-sm text-gray-400 mt-5">
            {t('auth.alreadyHaveAccount')}{' '}
            <Link to="/login" className="text-blue-600 font-medium hover:underline">
              {t('auth.login')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
