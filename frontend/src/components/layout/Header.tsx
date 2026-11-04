import { Moon, Sun, Globe, LogOut, Download, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/authStore';
import { useNavigate } from 'react-router-dom';
import { NotificationsDropdown } from '@/components/NotificationsDropdown';
import { OfflineIndicator } from '@/components/OfflineIndicator';
import toast from 'react-hot-toast';
import { useTranslation } from '@/i18n/useTranslation';
import { downloadFile } from '@/lib/download';
import { getErrorMessage } from '@/lib/errors';

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { user, tenant, theme, toggleTheme, language, setLanguage, logout } = useAuthStore();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleBackup = async () => {
    try {
      await downloadFile('/exports/backup', `backup-kabrak-${Date.now()}.json`);
    } catch (err) {
      toast.error(getErrorMessage(err, t('common.exportError')));
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 sm:h-16 items-center gap-2 sm:gap-4 border-b bg-background/95 backdrop-blur-sm px-3 sm:px-6">
      {/* Mobile burger */}
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 -ml-1 rounded-lg hover:bg-accent transition-colors"
        aria-label={t('common.openMenu')}
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Business name */}
      <div className="flex-1 min-w-0">
        <h2 className="text-sm sm:text-lg font-semibold text-foreground truncate">
          {tenant?.name || 'KABRAK'}
        </h2>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 sm:gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 sm:h-9 sm:w-9"
          onClick={() => setLanguage(language === 'fr' ? 'en' : 'fr')}
          title={t('common.switchLanguage')}
          aria-label={t('common.switchLanguage')}
        >
          <Globe className="w-4 h-4" />
        </Button>

        <Button variant="ghost" size="icon" className="hidden sm:flex h-9 w-9" onClick={toggleTheme} title={t('common.toggleTheme')} aria-label={t('common.toggleTheme')}>
          {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
        </Button>

        <Button variant="ghost" size="icon" className="hidden sm:flex h-9 w-9" onClick={handleBackup} title={t('common.backup')} aria-label={t('common.backup')}>
          <Download className="w-4 h-4" />
        </Button>

        <OfflineIndicator />

        <NotificationsDropdown />

        {/* User avatar + logout */}
        <div className="flex items-center gap-2 ml-1 sm:ml-2 pl-2 sm:pl-4 border-l">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary flex items-center justify-center text-white text-xs sm:text-sm font-semibold shrink-0">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-medium">{user?.firstName} {user?.lastName}</p>
            <p className="text-xs text-muted-foreground">{user?.role ? t(`employees.${user.role.toLowerCase()}`) : ''}</p>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleLogout} title={t('auth.logout')} aria-label={t('auth.logout')}>
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
