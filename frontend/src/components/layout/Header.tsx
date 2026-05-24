import { Moon, Sun, Globe, LogOut, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/authStore';
import { useNavigate } from 'react-router-dom';
import { NotificationsDropdown } from '@/components/NotificationsDropdown';
import api from '@/lib/api';

export function Header() {
  const { user, tenant, theme, toggleTheme, language, setLanguage, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleBackup = async () => {
    try {
      const res = await api.get('/exports/backup', { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-kabrak-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/95 backdrop-blur-sm px-6">
      <div className="flex-1">
        <h2 className="text-lg font-semibold text-foreground">
          {tenant?.name || 'KABRAK'}
        </h2>
      </div>

      <div className="flex items-center gap-2">
        {/* Language toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLanguage(language === 'fr' ? 'en' : 'fr')}
          title={language === 'fr' ? 'Switch to English' : 'Passer en Français'}
        >
          <Globe className="w-5 h-5" />
          <span className="sr-only">{language.toUpperCase()}</span>
        </Button>

        {/* Theme toggle */}
        <Button variant="ghost" size="icon" onClick={toggleTheme}>
          {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
        </Button>

        {/* Backup button */}
        <Button variant="ghost" size="icon" onClick={handleBackup} title="Backup">
          <Download className="w-5 h-5" />
        </Button>

        {/* Notifications */}
        <NotificationsDropdown />

        {/* User menu */}
        <div className="flex items-center gap-3 ml-2 pl-4 border-l">
          <div className="w-8 h-8 rounded-full bg-kabrak-500 flex items-center justify-center text-white text-sm font-semibold">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-medium">{user?.firstName} {user?.lastName}</p>
            <p className="text-xs text-muted-foreground capitalize">{user?.role?.toLowerCase()}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={handleLogout} title="Logout">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
