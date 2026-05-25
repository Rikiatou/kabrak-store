import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useTranslation } from '@/i18n/useTranslation';
import api from '@/lib/api';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';

export function LoginPage() {
  const { t, language } = useTranslation();
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data } = await api.post('/auth/login', form);
      setAuth(data.data);
      navigate('/dashboard');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr.response?.data?.message || 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 overflow-auto"
      style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #f5f3ff 50%, #fefce8 100%)' }}>

      <Link to="/" className="fixed top-5 left-5 z-10 flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600 font-medium transition-colors bg-white/80 backdrop-blur-sm px-3 py-2 rounded-xl shadow-sm">
        <ArrowLeft className="w-4 h-4" /> {language === 'fr' ? 'Accueil' : 'Home'}
      </Link>

      <div className="w-full max-w-md pt-14 sm:pt-0">
        <div className="text-center mb-8">
          <img src="/logo.png" alt="KABRAK Store" className="mx-auto h-20 sm:h-24 object-contain mb-2" />
          <p className="text-gray-400 mt-1 text-sm">
            {language === 'fr' ? 'Connectez-vous à votre espace' : 'Sign in to your space'}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl shadow-blue-100/50 p-8 border border-gray-100">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl border border-red-100">{error}</div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('auth.email')}</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder={language === 'fr' ? 'vous@exemple.com' : 'you@example.com'}
                required
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all bg-gray-50/50"
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
                  required
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all pr-12 bg-gray-50/50"
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold text-sm hover:opacity-90 transition-all shadow-lg shadow-blue-200 disabled:opacity-60"
            >
              {loading ? (language === 'fr' ? 'Connexion...' : 'Signing in...') : t('auth.login')}
            </button>
          </form>
          <p className="text-center text-sm text-gray-400 mt-6">
            {t('auth.noAccount')}{' '}
            <Link to="/register" className="text-blue-600 font-medium hover:underline">
              {language === 'fr' ? 'Essai gratuit 14 jours' : '14-day free trial'}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
