import { Moon, Sun, Globe, LogOut, Download, Menu, WifiOff, RefreshCw, AlertTriangle, ChevronDown } from 'lucide-react';
import { useOfflineStatus, syncOfflineSales, discardFailedSales } from '@/lib/offline';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/authStore';
import { useNavigate } from 'react-router-dom';
import { NotificationsDropdown } from '@/components/NotificationsDropdown';
import api, { getApiErrorMessage } from '@/lib/api';
import toast from 'react-hot-toast';

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { user, tenant, theme, toggleTheme, language, setLanguage, logout, boutiques, switchBoutique } = useAuthStore();
  const navigate = useNavigate();
  const offline = useOfflineStatus();
  const fr = language === 'fr';

  const handleSync = async () => {
    const { synced, failed } = await syncOfflineSales();
    if (synced) toast.success(fr ? `${synced} vente(s) synchronisée(s)` : `${synced} sale(s) synced`);
    if (failed) toast.error(fr ? `${failed} vente(s) refusée(s) par le serveur` : `${failed} sale(s) rejected by the server`);
  };

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
      toast.error(getApiErrorMessage(err, language === 'fr' ? 'Erreur lors de la sauvegarde' : 'Backup error'));
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 sm:h-16 items-center gap-2 sm:gap-4 border-b bg-background/95 backdrop-blur-sm px-3 sm:px-6">
      {/* Mobile burger */}
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 -ml-1 rounded-lg hover:bg-accent transition-colors"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Business name */}
      <div className="flex-1 min-w-0">
        {boutiques.length > 1 && tenant ? (
          <label className="relative inline-flex max-w-full items-center">
            <span className="sr-only">{fr ? 'Changer de boutique' : 'Switch store'}</span>
            <select
              value={tenant.id}
              onChange={(e) => switchBoutique(e.target.value).catch((err) => toast.error(getApiErrorMessage(err)))}
              className="max-w-full appearance-none truncate rounded-lg border bg-background py-1 pl-2 pr-7 text-sm sm:text-lg font-semibold text-foreground"
            >
              {boutiques.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 w-4 h-4 text-muted-foreground" />
          </label>
        ) : (
          <h2 className="text-sm sm:text-lg font-semibold text-foreground truncate">
            {tenant?.name || 'KABRAK'}
          </h2>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 sm:gap-2">
        {!offline.online && (
          <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
            <WifiOff className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{fr ? 'Hors ligne' : 'Offline'}</span>
          </span>
        )}
        {offline.pending > 0 && (
          <button
            onClick={handleSync}
            disabled={!offline.online || offline.syncing}
            className="flex items-center gap-1 rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800 disabled:opacity-60 dark:bg-blue-900/40 dark:text-blue-200"
            title={fr ? 'Synchroniser maintenant' : 'Sync now'}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${offline.syncing ? 'animate-spin' : ''}`} />
            {offline.pending} {fr ? 'en attente' : 'pending'}
          </button>
        )}
        {offline.failed > 0 && (
          <button
            onClick={() => { discardFailedSales(); toast(fr ? 'Ventes refusées effacées' : 'Rejected sales cleared'); }}
            className="flex items-center gap-1 rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700 dark:bg-red-900/40 dark:text-red-200"
            title={fr ? 'Ventes hors ligne refusées par le serveur (cliquer pour effacer)' : 'Offline sales rejected by the server (click to clear)'}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            {offline.failed}
          </button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 sm:h-9 sm:w-9"
          onClick={() => setLanguage(language === 'fr' ? 'en' : 'fr')}
          title={language === 'fr' ? 'Switch to English' : 'Passer en Français'}
        >
          <Globe className="w-4 h-4" />
        </Button>

        <Button variant="ghost" size="icon" className="hidden sm:flex h-9 w-9" onClick={toggleTheme}>
          {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
        </Button>

        <Button variant="ghost" size="icon" className="hidden sm:flex h-9 w-9" onClick={handleBackup} title={language === 'fr' ? 'Sauvegarde' : 'Backup'}>
          <Download className="w-4 h-4" />
        </Button>

        <NotificationsDropdown />

        {/* User avatar + logout */}
        <div className="flex items-center gap-2 ml-1 sm:ml-2 pl-2 sm:pl-4 border-l">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs sm:text-sm font-semibold shrink-0">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-medium">{user?.firstName} {user?.lastName}</p>
            <p className="text-xs text-muted-foreground capitalize">{user?.role?.toLowerCase()}</p>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleLogout} title="Logout">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
