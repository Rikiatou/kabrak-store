import { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useTranslation } from '@/i18n/useTranslation';
import api from '@/lib/api';
import { User, Lock, Save, CheckCircle, AlertCircle, Store, Palette, Upload, X, Check, Globe, CreditCard, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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


export function SettingsPage() {
  const { language } = useTranslation();
  const { user, tenant, fetchMe } = useAuthStore();
  const navigate = useNavigate();

  const [profile, setProfile] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
  });

  const logoInputRef = useRef<HTMLInputElement>(null);

  const [store, setStore] = useState({
    name: tenant?.name || '',
    phone: tenant?.phone || '',
    address: tenant?.address || '',
    logo: tenant?.logo || '',
    invoiceColor: tenant?.invoiceColor || '#2563eb',
    currency: tenant?.currency || 'XAF',
    language: tenant?.language || 'fr',
  });
  const [suggestedCats, setSuggestedCats] = useState<string[]>([]);
  const [customCatInput, setCustomCatInput] = useState('');

  useEffect(() => {
    if (tenant?.businessMode) {
      api.get(`/auth/suggested-categories?mode=${tenant.businessMode}`)
        .then(r => setSuggestedCats(r.data.data || []))
        .catch(() => {});
    }
  }, [tenant?.businessMode]);

  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [storeMsg, setStoreMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [passMsg, setPassMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [storeLoading, setStoreLoading] = useState(false);
  const [passLoading, setPassLoading] = useState(false);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [categoriesMsg, setCategoriesMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(tenant?.businessCategories || []);

  const categories = tenant?.businessMode === 'SERVICE' ? SERVICE_CATEGORIES : PRODUCT_CATEGORIES;

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const handleAddCustomCat = () => {
    const val = customCatInput.trim();
    if (!val || selectedCategories.includes(val)) return;
    setSelectedCategories(prev => [...prev, val]);
    setCustomCatInput('');
    api.post('/auth/suggested-categories', { name: val, mode: tenant?.businessMode || 'PRODUCT' }).catch(() => {});
  };

  const handleCategoriesSubmit = async () => {
    if (selectedCategories.length === 0) {
      setCategoriesMsg({
        type: 'error',
        text: language === 'fr' ? 'Sélectionnez au moins une catégorie' : 'Select at least one category',
      });
      return;
    }
    setCategoriesMsg(null);
    setCategoriesLoading(true);
    try {
      await api.put('/auth/categories', { businessCategories: selectedCategories });
      await fetchMe();
      setCategoriesMsg({
        type: 'success',
        text: language === 'fr' ? 'Catégories mises à jour avec succès' : 'Categories updated successfully',
      });
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setCategoriesMsg({
        type: 'error',
        text: axiosErr.response?.data?.message || (language === 'fr' ? 'Erreur de mise à jour' : 'Update failed'),
      });
    } finally {
      setCategoriesLoading(false);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg(null);
    setProfileLoading(true);
    try {
      await api.put('/auth/profile', profile);
      await fetchMe();
      setProfileMsg({
        type: 'success',
        text: language === 'fr' ? 'Profil mis à jour avec succès' : 'Profile updated successfully',
      });
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setProfileMsg({
        type: 'error',
        text: axiosErr.response?.data?.message || (language === 'fr' ? 'Erreur de mise à jour' : 'Update failed'),
      });
    } finally {
      setProfileLoading(false);
    }
  };

  const handleStoreSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStoreMsg(null);
    setStoreLoading(true);
    try {
      await api.put('/auth/store', store);
      await fetchMe();
      setStoreMsg({
        type: 'success',
        text: language === 'fr' ? 'Boutique mise à jour avec succès' : 'Store updated successfully',
      });
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setStoreMsg({
        type: 'error',
        text: axiosErr.response?.data?.message || (language === 'fr' ? 'Erreur de mise à jour' : 'Update failed'),
      });
    } finally {
      setStoreLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassMsg(null);

    if (passwords.newPassword !== passwords.confirmPassword) {
      setPassMsg({
        type: 'error',
        text: language === 'fr' ? 'Les mots de passe ne correspondent pas' : 'Passwords do not match',
      });
      return;
    }

    if (passwords.newPassword.length < 6) {
      setPassMsg({
        type: 'error',
        text: language === 'fr' ? 'Minimum 6 caractères' : 'Minimum 6 characters',
      });
      return;
    }

    setPassLoading(true);
    try {
      await api.put('/auth/password', {
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      });
      setPassMsg({
        type: 'success',
        text: language === 'fr' ? 'Mot de passe modifié avec succès' : 'Password changed successfully',
      });
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setPassMsg({
        type: 'error',
        text: axiosErr.response?.data?.message || (language === 'fr' ? 'Erreur' : 'Error'),
      });
    } finally {
      setPassLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-foreground">
        {language === 'fr' ? 'Paramètres' : 'Settings'}
      </h1>

      {/* Subscription quick card */}
      <button
        onClick={() => navigate('/billing')}
        className="w-full flex items-center justify-between bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl px-5 py-4 shadow-lg shadow-blue-200 hover:opacity-90 transition-opacity"
      >
        <div className="flex items-center gap-3">
          <CreditCard className="w-5 h-5" />
          <div className="text-left">
            <p className="font-bold text-sm">{language === 'fr' ? 'Mon abonnement' : 'My Subscription'}</p>
            <p className="text-blue-200 text-xs">
              KABRAK {tenant?.plan} &mdash; {language === 'fr' ? 'Voir & gérer' : 'View & manage'}
            </p>
          </div>
        </div>
        <span className="text-blue-200 text-xs font-medium">{language === 'fr' ? 'Voir →' : 'View →'}</span>
      </button>

      {/* Profile Section */}
      <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
            <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">
            {language === 'fr' ? 'Informations personnelles' : 'Personal Information'}
          </h2>
        </div>

        {profileMsg && (
          <div className={`flex items-center gap-2 p-3 rounded-lg mb-4 text-sm ${
            profileMsg.type === 'success'
              ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
              : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
          }`}>
            {profileMsg.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {profileMsg.text}
          </div>
        )}

        <form onSubmit={handleProfileSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                {language === 'fr' ? 'Prénom' : 'First Name'}
              </label>
              <input
                type="text"
                value={profile.firstName}
                onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                {language === 'fr' ? 'Nom' : 'Last Name'}
              </label>
              <input
                type="text"
                value={profile.lastName}
                onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Email
            </label>
            <input
              type="email"
              value={profile.email}
              onChange={(e) => setProfile({ ...profile, email: e.target.value })}
              className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
            />
          </div>
          <button
            type="submit"
            disabled={profileLoading}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {profileLoading
              ? (language === 'fr' ? 'Enregistrement...' : 'Saving...')
              : (language === 'fr' ? 'Enregistrer' : 'Save')}
          </button>
        </form>
      </div>

      {/* Store / Boutique Section */}
      <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-900/30">
            <Store className="w-5 h-5 text-violet-600 dark:text-violet-400" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">
            {language === 'fr' ? 'Ma boutique' : 'My Store'}
          </h2>
        </div>

        {storeMsg && (
          <div className={`flex items-center gap-2 p-3 rounded-lg mb-4 text-sm ${
            storeMsg.type === 'success'
              ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
              : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
          }`}>
            {storeMsg.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {storeMsg.text}
          </div>
        )}

        <form onSubmit={handleStoreSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                {language === 'fr' ? 'Nom de la boutique' : 'Store Name'}
              </label>
              <input
                type="text"
                value={store.name}
                onChange={(e) => setStore({ ...store, name: e.target.value })}
                className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                {language === 'fr' ? 'Téléphone boutique' : 'Store Phone'}
              </label>
              <input
                type="text"
                value={store.phone}
                onChange={(e) => setStore({ ...store, phone: e.target.value })}
                placeholder="+237 6XX XXX XXX"
                className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              {language === 'fr' ? 'Adresse / Ville' : 'Address / City'}
            </label>
            <input
              type="text"
              value={store.address}
              onChange={(e) => setStore({ ...store, address: e.target.value })}
              placeholder={language === 'fr' ? 'Ex: Yaoundé, Douala...' : 'Ex: Yaounde, Douala...'}
              className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400"
            />
          </div>

          {/* Public Storefront Link */}
          {tenant?.slug && (
            <div className="rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-100 dark:border-blue-800 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Globe className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-semibold text-blue-900 dark:text-blue-200">
                  {language === 'fr' ? 'Vitrine publique en ligne' : 'Public Online Storefront'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={`${window.location.origin}/storefront/${tenant.slug}`}
                  className="flex-1 bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-700 rounded-lg px-3 py-2 text-xs text-gray-700 dark:text-gray-300"
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/storefront/${tenant.slug}`);
                    alert(language === 'fr' ? 'Lien copié !' : 'Link copied!');
                  }}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors"
                >
                  {language === 'fr' ? 'Copier' : 'Copy'}
                </button>
                <a
                  href={`/storefront/${tenant.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 border border-blue-600 text-blue-600 rounded-lg text-xs font-medium hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                >
                  {language === 'fr' ? 'Voir' : 'View'}
                </a>
              </div>
              <p className="text-[10px] text-blue-600 dark:text-blue-400 mt-2">
                {language === 'fr' ? 'Partagez ce lien pour que vos clients parcourent votre catalogue et commandent via WhatsApp.' : 'Share this link for clients to browse your catalog and order via WhatsApp.'}
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1 flex items-center gap-1">
                <Globe className="w-3.5 h-3.5" />{language === 'fr' ? 'Devise' : 'Currency'}
              </label>
              <select
                value={store.currency}
                onChange={(e) => setStore({ ...store, currency: e.target.value })}
                className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-violet-200"
              >
                <option value="XAF">FCFA (XAF)</option>
                <option value="EUR">€ Euro</option>
                <option value="USD">$ USD</option>
                <option value="GHS">GHS Cedi</option>
                <option value="NGN">₦ Naira</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1 flex items-center gap-1">
                <Globe className="w-3.5 h-3.5" />{language === 'fr' ? 'Langue de l\'app' : 'App Language'}
              </label>
              <select
                value={store.language}
                onChange={(e) => setStore({ ...store, language: e.target.value })}
                className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-violet-200"
              >
                <option value="fr">Français</option>
                <option value="en">English</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              {language === 'fr' ? 'Logo de la boutique' : 'Store Logo'}
            </label>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (file.size > 3 * 1024 * 1024) { alert(language === 'fr' ? 'Image trop grande (max 3MB)' : 'Image too large (max 3MB)'); return; }
                const reader = new FileReader();
                reader.onloadend = () => setStore({ ...store, logo: reader.result as string });
                reader.readAsDataURL(file);
              }}
            />
            <div className="flex items-center gap-4">
              {store.logo ? (
                <div className="relative">
                  <img src={store.logo} alt="logo" className="w-20 h-20 rounded-xl object-contain border border-border bg-white p-1" />
                  <button type="button" onClick={() => setStore({ ...store, logo: '' })} className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="w-20 h-20 rounded-xl border-2 border-dashed border-border flex items-center justify-center bg-gray-50 dark:bg-gray-800">
                  <Store className="w-8 h-8 text-muted-foreground/40" />
                </div>
              )}
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <Upload className="w-4 h-4" />
                {language === 'fr' ? 'Choisir un logo' : 'Choose a logo'}
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{language === 'fr' ? 'PNG, JPG ou WEBP — max 3MB' : 'PNG, JPG or WEBP — max 3MB'}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
              <Palette className="w-4 h-4" />
              {language === 'fr' ? 'Couleur des factures' : 'Invoice Color'}
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={store.invoiceColor}
                onChange={(e) => setStore({ ...store, invoiceColor: e.target.value })}
                className="w-12 h-12 rounded-xl border border-border cursor-pointer p-0.5"
              />
              <div className="flex gap-2 flex-wrap">
                {['#2563eb', '#7c3aed', '#db2777', '#ea580c', '#16a34a', '#0891b2', '#1e293b'].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setStore({ ...store, invoiceColor: c })}
                    className="w-8 h-8 rounded-full border-2 transition-transform hover:scale-110"
                    style={{ backgroundColor: c, borderColor: store.invoiceColor === c ? '#000' : 'transparent' }}
                  />
                ))}
              </div>
              <span className="text-sm font-mono text-muted-foreground">{store.invoiceColor}</span>
            </div>
            <div className="mt-3 p-3 rounded-xl text-white text-sm font-bold" style={{ background: `linear-gradient(135deg, ${store.invoiceColor}, ${store.invoiceColor}dd)` }}>
              {language === 'fr' ? '✓ Aperçu de la couleur sur facture' : '✓ Color preview on invoice'}
            </div>
          </div>

          <button
            type="submit"
            disabled={storeLoading}
            className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {storeLoading
              ? (language === 'fr' ? 'Enregistrement...' : 'Saving...')
              : (language === 'fr' ? 'Enregistrer la boutique' : 'Save Store')}
          </button>
        </form>
      </div>

      {/* Categories Section */}
      <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
            <Store className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">
            {language === 'fr' ? 'Catégories d\'activité' : 'Business Categories'}
          </h2>
        </div>

        {categoriesMsg && (
          <div className={`flex items-center gap-2 p-3 rounded-lg mb-4 text-sm ${
            categoriesMsg.type === 'success'
              ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
              : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
          }`}>
            {categoriesMsg.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {categoriesMsg.text}
          </div>
        )}

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {language === 'fr'
              ? 'Sélectionnez les catégories qui décrivent votre activité. Vous pouvez les modifier à tout moment.'
              : 'Select the categories that describe your business. You can change them at any time.'}
          </p>

          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 max-h-[320px] overflow-y-auto pr-1">
            {categories.map((cat) => {
              const isSelected = selectedCategories.includes(cat.value);
              return (
                <button
                  key={cat.value}
                  onClick={() => toggleCategory(cat.value)}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all cursor-pointer ${
                    isSelected
                      ? tenant?.businessMode === 'SERVICE'
                        ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20 shadow-sm'
                        : 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-sm'
                      : 'border-gray-100 dark:border-gray-600 hover:border-gray-200 bg-gray-50/50 dark:bg-gray-700'
                  }`}
                >
                  <span className="text-xl">{cat.icon}</span>
                  <span className="text-[11px] font-medium text-center text-gray-600 dark:text-gray-300 leading-tight">
                    {cat.value.replace(/_/g, ' ')}
                  </span>
                  {isSelected && <Check className={`w-3.5 h-3.5 ${tenant?.businessMode === 'SERVICE' ? 'text-violet-500' : 'text-blue-500'}`} />}
                </button>
              );
            })}
            {selectedCategories.filter(c => !categories.some(cat => cat.value === c)).map(custom => (
              <button
                key={custom}
                onClick={() => toggleCategory(custom)}
                className="flex flex-col items-center gap-1 p-3 rounded-xl border-2 border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-sm cursor-pointer transition-all"
              >
                <span className="text-xl">🏷️</span>
                <span className="text-[11px] font-medium text-center text-blue-700 dark:text-blue-300 leading-tight capitalize">{custom}</span>
                <Check className="w-3.5 h-3.5 text-blue-500" />
              </button>
            ))}
          </div>
          {suggestedCats.length > 0 && (
            <div>
              <p className="text-[10px] text-gray-400 mb-1.5">{language === 'fr' ? '💡 Proposées par d\'autres utilisateurs' : '💡 Suggested by other users'}</p>
              <div className="flex flex-wrap gap-1.5">
                {suggestedCats.filter(s => !selectedCategories.includes(s)).map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => { setSelectedCategories(prev => [...prev, s]); }}
                    className="px-2.5 py-1 rounded-full text-[11px] font-medium border bg-gray-50 border-gray-200 text-gray-500 hover:border-blue-300 transition-all capitalize"
                  >
                    + {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
              <Plus className="w-3 h-3" />{language === 'fr' ? 'Ajouter une catégorie personnalisée' : 'Add custom category'}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={customCatInput}
                onChange={(e) => setCustomCatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddCustomCat()}
                placeholder={language === 'fr' ? 'ex: Biscuits artisanaux...' : 'e.g. Artisan biscuits...'}
                className="flex-1 border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-emerald-200"
              />
              <button
                type="button"
                onClick={handleAddCustomCat}
                disabled={!customCatInput.trim()}
                className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-40 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">{language === 'fr' ? 'Sera proposée aux futurs utilisateurs.' : 'Will be suggested to future users.'}</p>
          </div>

          <button
            onClick={handleCategoriesSubmit}
            disabled={categoriesLoading || selectedCategories.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {categoriesLoading
              ? (language === 'fr' ? 'Enregistrement...' : 'Saving...')
              : (language === 'fr' ? 'Enregistrer les catégories' : 'Save Categories')}
          </button>
        </div>
      </div>

      {/* Password Section */}
      <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
            <Lock className="w-5 h-5 text-orange-600 dark:text-orange-400" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">
            {language === 'fr' ? 'Changer le mot de passe' : 'Change Password'}
          </h2>
        </div>

        {passMsg && (
          <div className={`flex items-center gap-2 p-3 rounded-lg mb-4 text-sm ${
            passMsg.type === 'success'
              ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
              : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
          }`}>
            {passMsg.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {passMsg.text}
          </div>
        )}

        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              {language === 'fr' ? 'Mot de passe actuel' : 'Current Password'}
            </label>
            <input
              type="password"
              value={passwords.currentPassword}
              onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
              required
              className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                {language === 'fr' ? 'Nouveau mot de passe' : 'New Password'}
              </label>
              <input
                type="password"
                value={passwords.newPassword}
                onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                required
                className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                {language === 'fr' ? 'Confirmer' : 'Confirm'}
              </label>
              <input
                type="password"
                value={passwords.confirmPassword}
                onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                required
                className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={passLoading}
            className="flex items-center gap-2 px-4 py-2.5 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 transition-colors disabled:opacity-50"
          >
            <Lock className="w-4 h-4" />
            {passLoading
              ? (language === 'fr' ? 'Modification...' : 'Changing...')
              : (language === 'fr' ? 'Modifier le mot de passe' : 'Change Password')}
          </button>
        </form>
      </div>
    </div>
  );
}
