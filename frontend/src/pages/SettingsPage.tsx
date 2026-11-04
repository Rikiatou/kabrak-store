import { useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useTranslation } from '@/i18n/useTranslation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/ui/page-header';
import { LoadingState, Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { getErrorMessage } from '@/lib/errors';
import api from '@/lib/api';
import { User, Lock, Save, CheckCircle, AlertCircle } from 'lucide-react';

type Msg = { type: 'success' | 'error'; text: string } | null;

function FormMessage({ msg }: { msg: Msg }) {
  if (!msg) return null;
  return (
    <div
      role={msg.type === 'error' ? 'alert' : 'status'}
      className={cn(
        'mb-4 flex items-center gap-2 rounded-lg border p-3 text-sm',
        msg.type === 'success'
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-400'
          : 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400'
      )}
    >
      {msg.type === 'success' ? <CheckCircle className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
      {msg.text}
    </div>
  );
}

export function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  if (!user) return <LoadingState />;
  return <SettingsForm key={user.id} />;
}

function SettingsForm() {
  const { t } = useTranslation();
  const { user, fetchMe } = useAuthStore();

  const [profile, setProfile] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
  });

  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [profileMsg, setProfileMsg] = useState<Msg>(null);
  const [passMsg, setPassMsg] = useState<Msg>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [passLoading, setPassLoading] = useState(false);

  const mismatch = passwords.confirmPassword.length > 0 && passwords.newPassword !== passwords.confirmPassword;
  const tooShort = passwords.newPassword.length > 0 && passwords.newPassword.length < 6;

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg(null);
    setProfileLoading(true);
    try {
      await api.put('/auth/profile', profile);
      await fetchMe();
      setProfileMsg({ type: 'success', text: t('settings.profileUpdated') });
    } catch (err) {
      setProfileMsg({ type: 'error', text: getErrorMessage(err, t('settings.updateFailed')) });
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassMsg(null);

    if (passwords.newPassword !== passwords.confirmPassword) {
      setPassMsg({ type: 'error', text: t('settings.mismatch') });
      return;
    }
    if (passwords.newPassword.length < 6) {
      setPassMsg({ type: 'error', text: t('common.minPassword') });
      return;
    }

    setPassLoading(true);
    try {
      await api.put('/auth/password', {
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      });
      setPassMsg({ type: 'success', text: t('settings.passwordChanged') });
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setPassMsg({ type: 'error', text: getErrorMessage(err, t('common.error')) });
    } finally {
      setPassLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title={t('settings.title')} />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-base">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary"><User className="h-5 w-5" /></span>
            {t('settings.personalInfo')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <FormMessage msg={profileMsg} />
          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="st-first">{t('settings.firstName')}</Label>
                <Input id="st-first" value={profile.firstName} required onChange={(e) => setProfile({ ...profile, firstName: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="st-last">{t('settings.lastName')}</Label>
                <Input id="st-last" value={profile.lastName} required onChange={(e) => setProfile({ ...profile, lastName: e.target.value })} />
              </div>
            </div>
            <div>
              <Label htmlFor="st-email">{t('settings.email')}</Label>
              <Input id="st-email" type="email" value={profile.email} required onChange={(e) => setProfile({ ...profile, email: e.target.value })} />
            </div>
            <Button type="submit" disabled={profileLoading}>
              {profileLoading ? <Spinner className="mr-2" /> : <Save className="mr-2 h-4 w-4" />}
              {profileLoading ? t('common.saving') : t('common.save')}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-base">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-foreground"><Lock className="h-5 w-5" /></span>
            {t('settings.changePassword')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <FormMessage msg={passMsg} />
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <Label htmlFor="st-cur">{t('settings.currentPassword')}</Label>
              <Input id="st-cur" type="password" autoComplete="current-password" required value={passwords.currentPassword}
                onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })} />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="st-new">{t('settings.newPassword')}</Label>
                <Input id="st-new" type="password" autoComplete="new-password" required minLength={6} value={passwords.newPassword}
                  aria-invalid={tooShort} className={cn(tooShort && 'border-destructive focus-visible:ring-destructive')}
                  onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })} />
                {tooShort && <p className="mt-1 text-xs text-destructive">{t('common.minPassword')}</p>}
              </div>
              <div>
                <Label htmlFor="st-conf">{t('settings.confirmPassword')}</Label>
                <Input id="st-conf" type="password" autoComplete="new-password" required value={passwords.confirmPassword}
                  aria-invalid={mismatch} className={cn(mismatch && 'border-destructive focus-visible:ring-destructive')}
                  onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })} />
                {mismatch && <p className="mt-1 text-xs text-destructive">{t('settings.mismatch')}</p>}
              </div>
            </div>
            <Button type="submit" variant="outline" disabled={passLoading}>
              {passLoading ? <Spinner className="mr-2" /> : <Lock className="mr-2 h-4 w-4" />}
              {passLoading ? t('settings.changing') : t('settings.changePassword')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
