import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '@/lib/api';
import { ArrowLeft, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

export function ResetPasswordPage() {
  const { language } = useAuthStore();
  const fr = language === 'fr';
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError(fr ? 'Le mot de passe doit contenir au moins 6 caractères' : 'Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirm) {
      setError(fr ? 'Les mots de passe ne correspondent pas' : 'Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, newPassword });
      setDone(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr.response?.data?.message || (fr ? 'Lien invalide ou expiré' : 'Invalid or expired link'));
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4"
        style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #f5f3ff 50%, #fefce8 100%)' }}>
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center border border-gray-100">
          <p className="text-red-600 font-medium mb-4">
            {fr ? 'Lien invalide.' : 'Invalid link.'}
          </p>
          <Link to="/forgot-password" className="text-blue-600 font-medium hover:underline text-sm">
            {fr ? 'Demander un nouveau lien' : 'Request a new link'}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #f5f3ff 50%, #fefce8 100%)' }}
    >
      <Link
        to="/login"
        className="fixed top-5 left-5 z-10 flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600 font-medium transition-colors bg-white/80 backdrop-blur-sm px-3 py-2 rounded-xl shadow-sm"
      >
        <ArrowLeft className="w-4 h-4" /> {fr ? 'Connexion' : 'Login'}
      </Link>

      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/logo.png" alt="KABRAK Store" className="mx-auto h-20 sm:h-24 object-contain mb-2" />
        </div>

        <div className="bg-white rounded-2xl shadow-xl shadow-blue-100/50 p-8 border border-gray-100">
          {done ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">
                {fr ? 'Mot de passe réinitialisé !' : 'Password reset!'}
              </h2>
              <p className="text-sm text-gray-500">
                {fr ? 'Vous allez être redirigé vers la connexion...' : 'Redirecting you to login...'}
              </p>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  {fr ? 'Nouveau mot de passe' : 'New password'}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {fr ? 'Choisissez un nouveau mot de passe sécurisé.' : 'Choose a new secure password.'}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl border border-red-100">{error}</div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    {fr ? 'Nouveau mot de passe' : 'New password'}
                  </label>
                  <div className="relative">
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      minLength={6}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all pr-12 bg-gray-50/50"
                    />
                    <button type="button" onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    {fr ? 'Confirmer le mot de passe' : 'Confirm password'}
                  </label>
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all bg-gray-50/50"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold text-sm hover:opacity-90 transition-all shadow-lg shadow-blue-200 disabled:opacity-60"
                >
                  {loading
                    ? (fr ? 'Réinitialisation...' : 'Resetting...')
                    : (fr ? 'Réinitialiser le mot de passe' : 'Reset password')}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
