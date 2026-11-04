import { useEffect } from 'react';
import toast from 'react-hot-toast';
import { CloudOff, RefreshCw, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { useTranslation } from '@/i18n/useTranslation';
import { useOfflineStatus, syncOfflineSales, discardFailedSales } from '@/lib/offline';
import { cn } from '@/lib/utils';

export function OfflineIndicator() {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const { online, pending, failed, syncing } = useOfflineStatus();

  useEffect(() => {
    const run = async () => {
      const { synced } = await syncOfflineSales();
      if (synced > 0) toast.success(t('offline.synced', { count: synced }));
    };
    run();
    window.addEventListener('online', run);
    const timer = window.setInterval(run, 30000);
    return () => { window.removeEventListener('online', run); window.clearInterval(timer); };
  }, [t]);

  const syncNow = async () => {
    const { synced } = await syncOfflineSales();
    if (synced > 0) toast.success(t('offline.synced', { count: synced }));
  };

  const reviewFailed = async () => {
    if (await confirm({ title: t('offline.failedTitle'), description: t('offline.failedDesc', { count: failed }) })) {
      discardFailedSales();
    }
  };

  if (online && pending === 0 && failed === 0) return null;

  return (
    <div className="flex items-center gap-1">
      {!online && (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/15 px-2.5 py-1 text-xs font-medium text-warning" role="status">
          <CloudOff className="h-3.5 w-3.5" /> <span className="hidden sm:inline">{t('offline.offline')}</span>
        </span>
      )}
      {pending > 0 && (
        <Button variant="ghost" size="sm" className="h-8 gap-1.5 px-2 text-xs" onClick={syncNow} disabled={!online || syncing} title={t('offline.syncNow')}>
          <RefreshCw className={cn('h-3.5 w-3.5', syncing && 'animate-spin')} />
          {syncing ? t('offline.syncing') : t('offline.pending', { count: pending })}
        </Button>
      )}
      {failed > 0 && (
        <Button variant="ghost" size="sm" className="h-8 gap-1.5 px-2 text-xs text-destructive" onClick={reviewFailed}>
          <AlertTriangle className="h-3.5 w-3.5" /> {t('offline.failed', { count: failed })}
        </Button>
      )}
    </div>
  );
}
