import { useEffect, useRef, useState } from 'react';
import { History } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from '@/i18n/useTranslation';
import { useAuthStore } from '@/stores/authStore';
import { canSeeCosts } from '@/lib/modules';
import api, { getApiErrorMessage } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface Activity {
  id: string;
  userId: string | null;
  userName: string;
  userRole: string;
  action: string;
  summary: string;
  createdAt: string;
}
interface Person { userId: string | null; userName: string }

const ACTIONS: { key: string; fr: string; en: string }[] = [
  { key: 'ORDER_CANCEL', fr: 'Ventes annulées', en: 'Cancelled sales' },
  { key: 'ORDER_RETURN', fr: 'Retours', en: 'Returns' },
  { key: 'SALE_DISCOUNT', fr: 'Ventes avec remise', en: 'Sales with discount' },
  { key: 'DISCOUNT_FIX', fr: 'Remises corrigées', en: 'Fixed discounts' },
  { key: 'PRODUCT_', fr: 'Produits (prix, stock, suppression)', en: 'Products (price, stock, deletion)' },
  { key: 'STOCK_TRANSFER', fr: 'Transferts entre boutiques', en: 'Transfers between stores' },
  { key: 'CASH_CLOSE', fr: 'Fermetures de caisse', en: 'Cash closings' },
  { key: 'EXPENSE_DELETE', fr: 'Dépenses supprimées', en: 'Deleted expenses' },
  { key: 'CLIENT_DELETE', fr: 'Clients supprimés', en: 'Deleted clients' },
  { key: 'EMPLOYEE_', fr: 'Employés', en: 'Employees' },
  { key: 'OFFLINE_DISCARD', fr: 'Ventes hors ligne effacées', en: 'Cleared offline sales' },
  { key: 'SETTINGS_UPDATE', fr: 'Paramètres', en: 'Settings' },
];

const RED = new Set(['ORDER_CANCEL', 'OFFLINE_DISCARD', 'PRODUCT_DELETE', 'EXPENSE_DELETE', 'CLIENT_DELETE', 'EMPLOYEE_DELETE']);
const ROLE: Record<string, { fr: string; en: string }> = {
  OWNER: { fr: 'Propriétaire', en: 'Owner' },
  MANAGER: { fr: 'Manager', en: 'Manager' },
  CASHIER: { fr: 'Caissier', en: 'Cashier' },
  EMPLOYEE: { fr: 'Employé', en: 'Employee' },
};

const pad = (n: number) => String(n).padStart(2, '0');
const day = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return day(d); };

export function ActivityPage() {
  const { language } = useTranslation();
  const fr = language === 'fr';
  const allowed = canSeeCosts(useAuthStore((s) => s.user));
  const [from, setFrom] = useState(daysAgo(6));
  const [to, setTo] = useState(day(new Date()));
  const [userId, setUserId] = useState('');
  const [action, setAction] = useState('');
  const [page, setPage] = useState(1);
  const [logs, setLogs] = useState<Activity[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  useEffect(() => {
    if (!allowed) return;
    api.get('/activity', { params: { from, to, userId: userId || undefined, action: action || undefined, page } })
      .then(({ data }) => {
        if (!mountedRef.current) return;
        setLogs(data.data || []);
        setPeople(data.users || []);
        setPages(data.pagination?.pages || 1);
      })
      .catch((err) => toast.error(getApiErrorMessage(err)))
      .finally(() => { if (mountedRef.current) setLoading(false); });
  }, [allowed, from, to, userId, action, page]);

  if (!allowed) {
    return <p className="text-sm text-muted-foreground">{fr ? 'Réservé à la propriétaire et aux managers.' : 'Owner and managers only.'}</p>;
  }

  const presets: { label: string; from: string }[] = [
    { label: fr ? "Aujourd'hui" : 'Today', from: day(new Date()) },
    { label: fr ? '7 jours' : '7 days', from: daysAgo(6) },
    { label: fr ? '30 jours' : '30 days', from: daysAgo(29) },
  ];
  const select = 'px-3 py-2 border border-border rounded-lg bg-background text-sm';
  const fmt = (s: string) => new Date(s).toLocaleString(fr ? 'fr-FR' : 'en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold flex items-center gap-2"><History className="w-5 h-5" />{fr ? "Journal d'activité" : 'Activity log'}</h1>
        <p className="text-sm text-muted-foreground">
          {fr ? 'Qui a annulé, rendu, corrigé une remise, changé un prix ou supprimé quelque chose.' : 'Who cancelled, returned, fixed a discount, changed a price or deleted something.'}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {presets.map((p) => (
          <Button key={p.label} size="sm" variant={from === p.from && to === day(new Date()) ? 'default' : 'outline'}
            onClick={() => { setFrom(p.from); setTo(day(new Date())); setPage(1); }}>{p.label}</Button>
        ))}
        <input type="date" value={from} max={to} onChange={(e) => { setFrom(e.target.value); setPage(1); }} className={select} />
        <input type="date" value={to} min={from} onChange={(e) => { setTo(e.target.value); setPage(1); }} className={select} />
        <select value={userId} onChange={(e) => { setUserId(e.target.value); setPage(1); }} className={select}>
          <option value="">{fr ? 'Tout le monde' : 'Everyone'}</option>
          {people.filter((p) => p.userId).map((p) => <option key={p.userId!} value={p.userId!}>{p.userName}</option>)}
        </select>
        <select value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }} className={select}>
          <option value="">{fr ? 'Toutes les actions' : 'All actions'}</option>
          {ACTIONS.map((a) => <option key={a.key} value={a.key}>{fr ? a.fr : a.en}</option>)}
        </select>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <p className="p-6 text-sm text-muted-foreground">{fr ? 'Chargement…' : 'Loading…'}</p>
          ) : logs.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">{fr ? 'Aucune action sur cette période.' : 'No actions in this period.'}</p>
          ) : (
            <ul className="divide-y divide-border">
              {logs.map((l) => (
                <li key={l.id} className="px-4 py-3 flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4">
                  <span className="text-xs text-muted-foreground w-28 shrink-0 tabular-nums">{fmt(l.createdAt)}</span>
                  <span className="text-sm font-medium w-44 shrink-0">
                    {l.userName}
                    <span className="ml-1 text-[11px] font-normal text-muted-foreground">· {ROLE[l.userRole]?.[fr ? 'fr' : 'en'] ?? l.userRole}</span>
                  </span>
                  <span className={`text-sm ${RED.has(l.action) ? 'text-red-600' : ''}`}>{l.summary}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>{fr ? 'Précédent' : 'Previous'}</Button>
          <span className="text-sm text-muted-foreground">{page} / {pages}</span>
          <Button size="sm" variant="outline" disabled={page >= pages} onClick={() => setPage(page + 1)}>{fr ? 'Suivant' : 'Next'}</Button>
        </div>
      )}
    </div>
  );
}
