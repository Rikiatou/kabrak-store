import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useTranslation } from '@/i18n/useTranslation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { getErrorMessage } from '@/lib/errors';
import api from '@/lib/api';
import { AlertCircle, ArrowLeft, Eye, EyeOff } from 'lucide-react';

export function LoginPage() {
  const { t } = useTranslation();
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
    } catch (err) {
      setError(getErrorMessage(err, t('auth.loginError')));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Link
        to="/"
        className="fixed left-4 top-4 z-10 flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm font-medium text-muted-foreground shadow-sm transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> {t('auth.home')}
      </Link>

      <div className="w-full max-w-md pt-14 sm:pt-0">
        <div className="mb-6 text-center">
          <img src="/logo.png" alt="KABRAK Store" className="mx-auto mb-2 h-20 object-contain sm:h-24" />
          <p className="text-sm text-muted-foreground">{t('auth.signInSubtitle')}</p>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-5" noValidate={false}>
            {error && (
              <div role="alert" className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400">
                <AlertCircle className="h-4 w-4 shrink-0" /> {error}
              </div>
            )}
            <div>
              <Label htmlFor="login-email">{t('auth.email')}</Label>
              <Input id="login-email" type="email" autoComplete="email" required autoFocus value={form.email}
                placeholder={t('auth.emailPlaceholder')} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="login-password">{t('auth.password')}</Label>
              <div className="relative">
                <Input id="login-password" type={showPass ? 'text' : 'password'} autoComplete="current-password" required
                  value={form.password} placeholder="••••••••" className="pr-10"
                  onChange={(e) => setForm({ ...form, password: e.target.value })} />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  aria-label={showPass ? t('auth.hidePassword') : t('auth.showPassword')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" disabled={loading} className="w-full" size="lg">
              {loading && <Spinner className="mr-2" />}
              {loading ? t('auth.signingIn') : t('auth.login')}
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            {t('auth.noAccount')}{' '}
            <Link to="/register" className="font-medium text-primary hover:underline">{t('auth.freeTrial')}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
