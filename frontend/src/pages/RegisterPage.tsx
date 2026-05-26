import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useTranslation } from '@/i18n/useTranslation';
import api from '@/lib/api';
import { ArrowLeft, Check, Eye, EyeOff, ChevronRight, ChevronLeft, ShoppingBag, Briefcase } from 'lucide-react';
import { cn } from '@/lib/utils';

type BusinessMode = 'PRODUCT' | 'SERVICE';

const PRODUCT_CATEGORIES = [
  { value: 'CLOTHING', icon: '👗' },
  { value: 'SHOES', icon: '👟' },
  { value: 'PERFUMES', icon: '🧴' },
  { value: 'COSMETICS', icon: '💄' },
  { value: 'HIJABS_ABAYAS', icon: '🧕' },
  { value: 'JEWELRY', icon: '💍' },
  { value: 'BAGS', icon: '👜' },
  { value: 'ELECTRONICS', icon: '📱' },
  { value: 'HOUSE_PRODUCTS', icon: '🏠' },
  { value: 'KITCHEN_PRODUCTS', icon: '🍳' },
  { value: 'DECORATION', icon: '🪴' },
  { value: 'EVENT_DECORATION', icon: '🎉' },
  { value: 'CATERING', icon: '🍽️' },
  { value: 'MINI_MARKET', icon: '🏪' },
  { value: 'WHOLESALE', icon: '📦' },
  { value: 'MIXED_SHOP', icon: '🛒' },
  { value: 'CAKES', icon: '🎂' },
  { value: 'FOOD_BUSINESS', icon: '🍽️' },
  { value: 'FOOD_DELIVERY', icon: '🛵' },
  { value: 'HOME_COOKING', icon: '🥘' },
  { value: 'WHATSAPP_SELLER', icon: '💬' },
  { value: 'MADE_TO_ORDER', icon: '✂️' },
  { value: 'OTHER', icon: '📋' },
];

const SERVICE_CATEGORIES = [
  { value: 'DIGITAL_MARKETING', icon: '📈' },
  { value: 'FREELANCER', icon: '💻' },
  { value: 'AGENCY', icon: '🏢' },
  { value: 'CONSULTANT', icon: '🎯' },
  { value: 'DESIGNER', icon: '🎨' },
  { value: 'DEVELOPER', icon: '⚙️' },
  { value: 'SOCIAL_MEDIA', icon: '📱' },
  { value: 'PRINTING', icon: '🖨️' },
  { value: 'BUSINESS_SERVICES', icon: '💼' },
  { value: 'OTHER', icon: '📋' },
];

const PLANS = [
  { value: 'STORE', price: '4 900', features: ['Commandes', 'Clients', 'Facturation', 'WhatsApp'] },
  { value: 'SHOP', price: '7 900', features: ['Tout STORE +', 'Gestion stock', 'Caisse POS', 'Employés'] },
  { value: 'BUSINESS', price: '12 900', features: ['Tout SHOP +', 'Multi-employés', 'Permissions', 'Rapports avancés'] },
];

const SERVICE_PLANS = [
  { value: 'STORE', price: '4 900', features: ['Projets', 'Clients', 'Facturation', 'WhatsApp'] },
  { value: 'SHOP', price: '7 900', features: ['Tout STORE +', 'Récurrent', 'Milestones', 'Employés'] },
  { value: 'BUSINESS', price: '12 900', features: ['Tout SHOP +', 'Multi-employés', 'Permissions', 'Rapports avancés'] },
];

const categoryKeyMap: Record<string, string> = {
  CLOTHING: 'clothing', SHOES: 'shoes', PERFUMES: 'perfumes', COSMETICS: 'cosmetics',
  HIJABS_ABAYAS: 'hijabsAbayas', JEWELRY: 'jewelry', BAGS: 'bags',
  ELECTRONICS: 'electronics', HOUSE_PRODUCTS: 'houseProducts',
  KITCHEN_PRODUCTS: 'kitchenProducts', DECORATION: 'decoration',
  EVENT_DECORATION: 'eventDecoration', CATERING: 'catering',
  MINI_MARKET: 'miniMarket', WHOLESALE: 'wholesale', MIXED_SHOP: 'mixedShop',
  CAKES: 'cakes', FOOD_BUSINESS: 'foodBusiness', FOOD_DELIVERY: 'foodDelivery',
  HOME_COOKING: 'homeCooking', WHATSAPP_SELLER: 'whatsappSeller', MADE_TO_ORDER: 'madeToOrder',
  DIGITAL_MARKETING: 'digitalMarketing', FREELANCER: 'freelancer', AGENCY: 'agency',
  CONSULTANT: 'consultant', DESIGNER: 'designer', DEVELOPER: 'developer',
  SOCIAL_MEDIA: 'socialMedia', PRINTING: 'printing', BUSINESS_SERVICES: 'businessServices',
  OTHER: 'other',
};

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
    storeName: '', plan: 'STORE' as string,
    businessMode: '' as BusinessMode | '',
    businessCategories: [] as string[],
  });

  const stepLabels = language === 'fr'
    ? ['Votre activité', 'Informations', 'Catégories', 'Plan']
    : ['Your Business', 'Your Info', 'Categories', 'Plan'];

  const categories = form.businessMode === 'SERVICE' ? SERVICE_CATEGORIES : PRODUCT_CATEGORIES;
  const plans = form.businessMode === 'SERVICE' ? SERVICE_PLANS : PLANS;

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
      const payload = {
        ...form,
        businessMode: form.businessMode || 'PRODUCT',
      };
      const { data } = await api.post('/auth/register', payload);
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
    <div className="min-h-screen flex items-start justify-center p-4 py-8 overflow-auto dark:bg-gray-900"
      style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #f5f3ff 50%, #fefce8 100%)' }}>

      <Link to="/" className="fixed top-5 left-5 z-10 flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600 font-medium transition-colors bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm px-3 py-2 rounded-xl shadow-sm">
        <ArrowLeft className="w-4 h-4" /> {language === 'fr' ? 'Accueil' : 'Home'}
      </Link>

      <div className="w-full max-w-lg pt-14 sm:pt-4">
        <div className="text-center mb-6">
          <img src="/logo.png" alt="KABRAK Store" className="mx-auto h-16 sm:h-20 object-contain mb-1" />
          <p className="text-gray-400 mt-1 text-sm">
            {language === 'fr' ? 'Créez votre espace en 4 étapes' : 'Create your space in 4 steps'}
          </p>
        </div>

        {/* Step progress */}
        <div className="flex items-center justify-center gap-1 mb-6">
          {[1, 2, 3, 4].map((s) => (
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
              {s < 4 && <div className={cn('w-6 h-0.5 mx-1', s < step ? 'bg-blue-400' : 'bg-gray-200')} />}
            </div>
          ))}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl shadow-blue-100/50 dark:shadow-gray-900/50 p-6 sm:p-8 border border-gray-100 dark:border-gray-700">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm p-3 rounded-xl border border-red-100 dark:border-red-800 mb-4">{error}</div>
          )}

          {/* Step 1: Business Mode */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200 text-center mb-1">
                {language === 'fr' ? 'Que gérez-vous principalement ?' : 'What do you mainly manage?'}
              </h3>
              <p className="text-xs text-gray-400 text-center mb-2">
                {language === 'fr'
                  ? 'Choisissez le type qui correspond le mieux à votre activité'
                  : 'Choose the type that best matches your business'}
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => { setForm({ ...form, businessMode: 'PRODUCT', businessCategories: [] }); setStep(2); }}
                  className={cn(
                    'w-full flex items-start gap-4 p-5 rounded-xl border-2 transition-all text-left cursor-pointer group hover:shadow-md',
                    form.businessMode === 'PRODUCT'
                      ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20'
                      : 'border-gray-100 dark:border-gray-600 hover:border-blue-200'
                  )}
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0 shadow-md">
                    <ShoppingBag className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <span className="font-bold text-gray-900 dark:text-white text-base">
                      {language === 'fr' ? 'Produits à vendre' : 'Products to sell'}
                    </span>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                      {language === 'fr'
                        ? 'Boutique, restaurant, gâteaux, livraison, vente en ligne, mini-marché...'
                        : 'Shop, restaurant, cakes, delivery, online selling, mini-market...'}
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {['Stock', 'POS', language === 'fr' ? 'Commandes' : 'Orders', language === 'fr' ? 'Livraison' : 'Delivery'].map((f) => (
                        <span key={f} className="text-[10px] text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full font-medium">{f}</span>
                      ))}
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-blue-400 mt-3 flex-shrink-0" />
                </button>

                <button
                  onClick={() => { setForm({ ...form, businessMode: 'SERVICE', businessCategories: [] }); setStep(2); }}
                  className={cn(
                    'w-full flex items-start gap-4 p-5 rounded-xl border-2 transition-all text-left cursor-pointer group hover:shadow-md',
                    form.businessMode === 'SERVICE'
                      ? 'border-violet-500 bg-violet-50/50 dark:bg-violet-900/20'
                      : 'border-gray-100 dark:border-gray-600 hover:border-violet-200'
                  )}
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center flex-shrink-0 shadow-md">
                    <Briefcase className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <span className="font-bold text-gray-900 dark:text-white text-base">
                      {language === 'fr' ? 'Services clients' : 'Client services'}
                    </span>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                      {language === 'fr'
                        ? 'Marketing digital, freelance, agence, consultant, design, développement...'
                        : 'Digital marketing, freelance, agency, consultant, design, development...'}
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {[language === 'fr' ? 'Projets' : 'Projects', language === 'fr' ? 'Factures' : 'Invoices', language === 'fr' ? 'Récurrent' : 'Recurring', 'Milestones'].map((f) => (
                        <span key={f} className="text-[10px] text-violet-600 bg-violet-50 dark:bg-violet-900/30 px-2 py-0.5 rounded-full font-medium">{f}</span>
                      ))}
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-violet-400 mt-3 flex-shrink-0" />
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Personal info */}
          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200 text-center mb-2">
                {language === 'fr' ? 'Vos informations' : 'Your information'}
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('auth.firstName')}</label>
                  <input
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all bg-gray-50/50 dark:bg-gray-700 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('auth.lastName')}</label>
                  <input
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all bg-gray-50/50 dark:bg-gray-700 dark:text-white"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('auth.email')}</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder={language === 'fr' ? 'vous@exemple.com' : 'you@example.com'}
                  className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all bg-gray-50/50 dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('auth.password')}</label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all pr-12 bg-gray-50/50 dark:bg-gray-700 dark:text-white"
                    required
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('auth.phone')}</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="6 XX XX XX XX"
                  className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all bg-gray-50/50 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  {form.businessMode === 'SERVICE'
                    ? (language === 'fr' ? 'Nom de votre entreprise' : 'Your business name')
                    : t('auth.storeName')}
                </label>
                <input
                  value={form.storeName}
                  onChange={(e) => setForm({ ...form, storeName: e.target.value })}
                  placeholder={form.businessMode === 'SERVICE'
                    ? (language === 'fr' ? 'Ex: Mon Agence Marketing' : 'Ex: My Marketing Agency')
                    : (language === 'fr' ? 'Nom de votre boutique' : 'Your store name')}
                  className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all bg-gray-50/50 dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 font-medium text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-all flex items-center justify-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" /> {language === 'fr' ? 'Retour' : 'Back'}
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={!form.firstName || !form.lastName || !form.email || !form.password || !form.storeName}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold text-sm hover:opacity-90 transition-all shadow-lg shadow-blue-200 disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  {language === 'fr' ? 'Continuer' : 'Continue'} <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Categories */}
          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200 text-center">
                {form.businessMode === 'SERVICE'
                  ? (language === 'fr' ? 'Quel type de service ?' : 'What type of service?')
                  : (language === 'fr' ? 'Que vendez-vous ?' : 'What do you sell?')}
              </h3>
              <p className="text-xs text-gray-400 text-center">
                {language === 'fr' ? 'Sélectionnez une ou plusieurs catégories' : 'Select one or more categories'}
              </p>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 max-h-[320px] overflow-y-auto pr-1">
                {categories.map((cat) => {
                  const isSelected = form.businessCategories.includes(cat.value);
                  return (
                    <button
                      key={cat.value}
                      onClick={() => toggleCategory(cat.value)}
                      className={cn(
                        'flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all cursor-pointer',
                        isSelected
                          ? form.businessMode === 'SERVICE'
                            ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20 shadow-sm'
                            : 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-sm'
                          : 'border-gray-100 dark:border-gray-600 hover:border-gray-200 bg-gray-50/50 dark:bg-gray-700'
                      )}
                    >
                      <span className="text-xl">{cat.icon}</span>
                      <span className="text-[11px] font-medium text-center text-gray-600 dark:text-gray-300 leading-tight">
                        {t(`categories.${categoryKeyMap[cat.value]}`) || cat.value.replace(/_/g, ' ')}
                      </span>
                      {isSelected && <Check className={cn('w-3.5 h-3.5', form.businessMode === 'SERVICE' ? 'text-violet-500' : 'text-blue-500')} />}
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 font-medium text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-all flex items-center justify-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" /> {language === 'fr' ? 'Retour' : 'Back'}
                </button>
                <button
                  onClick={() => setStep(4)}
                  disabled={form.businessCategories.length === 0}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold text-sm hover:opacity-90 transition-all shadow-lg shadow-blue-200 disabled:opacity-40 flex items-center justify-center gap-1"
                >
                  {language === 'fr' ? 'Continuer' : 'Continue'} <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Choose plan */}
          {step === 4 && (
            <div className="space-y-4">
              <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200 text-center">
                {t('auth.selectPlan')}
              </h3>
              <div className="space-y-3">
                {plans.map((plan) => {
                  const isSelected = form.plan === plan.value;
                  return (
                    <button
                      key={plan.value}
                      onClick={() => setForm({ ...form, plan: plan.value })}
                      className={cn(
                        'w-full flex items-start gap-4 p-4 rounded-xl border-2 transition-all text-left cursor-pointer',
                        isSelected
                          ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20 shadow-sm'
                          : 'border-gray-100 dark:border-gray-600 hover:border-gray-200'
                      )}
                    >
                      <div className={cn(
                        'w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center',
                        isSelected ? 'border-blue-500 bg-blue-500' : 'border-gray-300 dark:border-gray-500'
                      )}>
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between">
                          <span className="font-bold text-gray-900 dark:text-white">KABRAK {plan.value}</span>
                          <span className="text-lg font-bold text-blue-600">
                            {plan.price} <span className="text-xs font-normal text-gray-400">FCFA/mois</span>
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {plan.features.map((f) => (
                            <span key={f} className="text-[11px] text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
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
                  onClick={() => setStep(3)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 font-medium text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-all flex items-center justify-center gap-1"
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
