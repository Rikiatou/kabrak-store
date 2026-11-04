import { useState, useEffect, useRef } from 'react';
import { Bell, Check, AlertTriangle, ShoppingCart, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/i18n/useTranslation';
import api from '@/lib/api';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export function NotificationsDropdown() {
  const { t } = useTranslation();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    const load = async () => {
      try {
        const { data } = await api.get('/notifications');
        if (mountedRef.current) {
          setNotifications(data.data);
          setUnreadCount(data.unreadCount);
        }
      } catch { /* silent */ }
    };
    load();
    api.post('/notifications/check-stock').catch(() => {});

    const interval = setInterval(() => {
      load();
      setNow(Date.now());
    }, 60000);
    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, []);

  const markAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch { /* silent */ }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'STOCK_ALERT':
        return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case 'NEW_ORDER':
        return <ShoppingCart className="w-4 h-4 text-primary" />;
      default:
        return <Package className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const timeAgo = (date: string) => {
    const diff = now - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return t('common.justNow');
    if (mins < 60) return t('notifications.minutesAgo', { n: mins });
    const hours = Math.floor(mins / 60);
    if (hours < 24) return t('notifications.hoursAgo', { n: hours });
    return t('notifications.daysAgo', { n: Math.floor(hours / 24) });
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(!open)}
        className="relative"
        aria-label={t('notifications.heading')}
        title={t('notifications.heading')}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-[min(20rem,calc(100vw-1.5rem))] -mr-16 sm:mr-0 bg-popover text-popover-foreground rounded-xl shadow-lg border z-50 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <span className="text-sm font-semibold">{t('notifications.heading')}</span>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  <Check className="w-3 h-3" /> {t('notifications.markAll')}
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  {t('notifications.empty')}
                </div>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`flex gap-3 px-4 py-3 border-b last:border-0 ${
                      !notif.isRead ? 'bg-primary/5' : ''
                    }`}
                  >
                    <div className="mt-0.5">{getIcon(notif.type)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{notif.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">{notif.message}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">{timeAgo(notif.createdAt)}</p>
                    </div>
                    {!notif.isRead && (
                      <div className="w-2 h-2 bg-primary rounded-full mt-2 shrink-0" />
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
