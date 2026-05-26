import { useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useTranslation } from '@/i18n/useTranslation';
import api from '@/lib/api';
import { User, Lock, Save, CheckCircle, AlertCircle, Store, Palette } from 'lucide-react';

export function SettingsPage() {
  const { language } = useTranslation();
  const { user, tenant, fetchMe } = useAuthStore();

  const [profile, setProfile] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
  });

  const [store, setStore] = useState({
    name: tenant?.name || '',
    phone: tenant?.phone || '',
    logo: tenant?.logo || '',
    invoiceColor: tenant?.invoiceColor || '#2563eb',
  });

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
              {language === 'fr' ? 'Logo (lien URL ou base64)' : 'Logo (URL link or base64)'}
            </label>
            <input
              type="text"
              value={store.logo}
              onChange={(e) => setStore({ ...store, logo: e.target.value })}
              placeholder="https://... ou data:image/png;base64,..."
              className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400"
            />
            {store.logo && (
              <div className="mt-2 flex items-center gap-3">
                <img src={store.logo} alt="logo preview" className="w-16 h-16 rounded-xl object-contain border border-border bg-white p-1" />
                <span className="text-xs text-muted-foreground">{language === 'fr' ? 'Aperçu du logo' : 'Logo preview'}</span>
              </div>
            )}
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
