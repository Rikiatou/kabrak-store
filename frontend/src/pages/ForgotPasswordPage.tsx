import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '@/lib/api';
import { ArrowLeft, Mail, Phone, CheckCircle, Copy, MessageCircle } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

export function ForgotPasswordPage() {
  const { language } = useAuthStore();
  const fr = language === 'fr';
  const [method, setMethod] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [resetUrl, setResetUrl] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = method === 'email' ? { email } : { phone };
      const { data } = await api.post('/auth/forgot-password', payload);
      if (data.resetUrl) {
        setResetUrl(data.resetUrl);
      }
      setSent(true);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr.response?.data?.message || (fr ? 'Une erreur est survenue' : 'An error occurred'));
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(resetUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const whatsappLink = `https://wa.me/?text=${encodeURIComponent(`Lien de réinitialisation KABRAK : ${resetUrl}`)}`;

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
                {method === 'email' ? (fr ? 'Email envoyé !' : 'Email sent!') : (fr ? 'Lien généré !' : 'Link generated!')}
              </h2>
              <p className="text-sm text-gray-500 leading-relaxed">
                {method === 'email'
                  ? (fr
                    ? `Si un compte existe pour ${email}, vous recevrez un lien de réinitialisation sous peu. Vérifiez aussi vos spams.`
                    : `If an account exists for ${email}, you'll receive a reset link shortly. Check your spam folder too.`)
                  : (fr
                    ? 'Utilisez ce lien pour réinitialiser votre mot de passe. Il expire dans 1 heure.'
                    : 'Use this link to reset your password. It expires in 1 hour.')
                }
              </p>
              {method === 'phone' && (
                <div className="space-y-3 mt-4">
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 break-all text-xs text-gray-600">
                    {resetUrl}
                  </div>
                  <div className="flex gap-2 justify-center">
                    <button
                      onClick={copyToClipboard}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
                    >
                      <Copy className="w-4 h-4" />
                      {copied ? (fr ? 'Copié !' : 'Copied!') : (fr ? 'Copier' : 'Copy')}
                    </button>
                    <a
                      href={whatsappLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      <MessageCircle className="w-4 h-4" />
                      WhatsApp
                    </a>
                  </div>
                </div>
              )}
              <Link
                to="/login"
                className="inline-block mt-4 text-blue-600 font-medium hover:underline text-sm"
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
                    ? 'Choisissez comment recevoir votre lien de réinitialisation.'
                    : 'Choose how to receive your reset link.'}
                </p>
              </div>

              <div className="flex gap-2 mb-6">
                <button
                  type="button"
                  onClick={() => setMethod('email')}
                  className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                    method === 'email'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <Mail className="w-4 h-4 inline mr-1" /> Email
                </button>
                <button
                  type="button"
                  onClick={() => setMethod('phone')}
                  className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                    method === 'phone'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <Phone className="w-4 h-4 inline mr-1" /> {fr ? 'Téléphone' : 'Phone'}
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl border border-red-100">{error}</div>
                )}
                {method === 'email' ? (
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
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      {fr ? 'Numéro de téléphone' : 'Phone number'}
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder={fr ? '+237 6XX XXX XXX' : '+237 6XX XXX XXX'}
                        required
                        className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all bg-gray-50/50"
                      />
                    </div>
                  </div>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold text-sm hover:opacity-90 transition-all shadow-lg shadow-blue-200 disabled:opacity-60"
                >
                  {loading
                    ? (fr ? 'Traitement...' : 'Processing...')
                    : (method === 'email'
                      ? (fr ? 'Envoyer le lien' : 'Send reset link')
                      : (fr ? 'Générer le lien' : 'Generate link'))}
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
