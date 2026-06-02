import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '@/lib/api';
import { ArrowLeft, Mail, CheckCircle } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

export function ForgotPasswordPage() {
  const { language } = useAuthStore();
  const fr = language === 'fr';
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr.response?.data?.message || (fr ? 'Une erreur est survenue' : 'An error occurred'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #f5f3ff 50%, #fefce8 100%)' }}
    >
      <Link
        to="/login"
        className="fixed top-5 left-5 z-10 flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600 font-medium transition-colors bg-white/80 backdrop-blur-sm px-3 py-2 rounded-xl shadow-sm"
      >
        <ArrowLeft className="w-4 h-4" /> {fr ? 'Retour' : 'Back'}
      </Link>

      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/logo.png" alt="KABRAK Store" className="mx-auto h-20 sm:h-24 object-contain mb-2" />
        </div>

        <div className="bg-white rounded-2xl shadow-xl shadow-blue-100/50 p-8 border border-gray-100">
          {sent ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">
                {fr ? 'Email envoyé !' : 'Email sent!'}
              </h2>
              <p className="text-sm text-gray-500 leading-relaxed">
                {fr
                  ? `Si un compte existe pour ${email}, vous recevrez un lien de réinitialisation sous peu. Vérifiez aussi vos spams.`
                  : `If an account exists for ${email}, you'll receive a reset link shortly. Check your spam folder too.`}
              </p>
              <Link
                to="/login"
                className="inline-block mt-2 text-blue-600 font-medium hover:underline text-sm"
              >
                {fr ? 'Retour à la connexion' : 'Back to login'}
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  {fr ? 'Mot de passe oublié ?' : 'Forgot your password?'}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {fr
                    ? 'Entrez votre email et nous vous enverrons un lien pour réinitialiser votre mot de passe.'
                    : 'Enter your email and we\'ll send you a link to reset your password.'}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl border border-red-100">{error}</div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    {fr ? 'Adresse email' : 'Email address'}
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={fr ? 'vous@exemple.com' : 'you@example.com'}
                      required
                      className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all bg-gray-50/50"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold text-sm hover:opacity-90 transition-all shadow-lg shadow-blue-200 disabled:opacity-60"
                >
                  {loading
                    ? (fr ? 'Envoi...' : 'Sending...')
                    : (fr ? 'Envoyer le lien' : 'Send reset link')}
                </button>
              </form>

              <p className="text-center text-sm text-gray-400 mt-6">
                <Link to="/login" className="text-blue-600 font-medium hover:underline">
                  {fr ? 'Retour à la connexion' : 'Back to login'}
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
