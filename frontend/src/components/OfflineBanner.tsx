import { useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw, WifiOff } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { canSeeCosts } from '@/lib/modules';
import { useAuthStore } from '@/stores/authStore';
import { failedSales, syncOfflineSales, useOfflineStatus } from '@/lib/offline';

/** POS: makes it obvious when sales are only on this device. */
export function OfflineBanner() {
  const fr = useAuthStore((s) => s.language) !== 'en';
  const { online, pending, failed, pendingTotal, syncing } = useOfflineStatus();
  if (online && !pending && !failed) return null;

  const send = async () => {
    const r = await syncOfflineSales();
    if (r.synced) toast.success(fr ? `${r.synced} vente(s) envoyée(s)` : `${r.synced} sale(s) sent`);
  };
  const reason = failed ? failedSales().find((s) => s.error)?.error : undefined;

  return (
    <div className="mb-3 space-y-2">
      {(!online || pending > 0) && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-900/30 dark:text-amber-100">
          {online ? <RefreshCw className={`w-4 h-4 shrink-0 ${syncing ? 'animate-spin' : ''}`} /> : <WifiOff className="w-4 h-4 shrink-0" />}
          <span className="flex-1">
            {!online && (fr ? 'Pas d’internet : vous pouvez vendre, les ventes restent sur ce téléphone. ' : 'No internet: you can sell, sales stay on this device. ')}
            {pending > 0 && (fr
              ? <><b>{pending} vente(s) pas encore envoyée(s)</b> ({formatCurrency(pendingTotal)}). Ne vous déconnectez pas et rouvrez l’app avec internet.</>
              : <><b>{pending} sale(s) not sent yet</b> ({formatCurrency(pendingTotal)}). Don’t log out; reopen the app with internet.</>)}
          </span>
          {online && pending > 0 && (
            <button onClick={send} disabled={syncing} className="font-semibold underline disabled:opacity-60">
              {fr ? 'Envoyer' : 'Send'}
            </button>
          )}
        </div>
      )}
      {failed > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-900/30 dark:text-red-200">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span className="flex-1">
            {fr ? <><b>{failed} vente(s) hors ligne refusée(s)</b> par le serveur{reason ? ` : ${reason}` : ''}. La propriétaire est prévenue ; refaites la vente si besoin.</>
              : <><b>{failed} offline sale(s) rejected</b> by the server{reason ? `: ${reason}` : ''}. The owner is notified; make the sale again if needed.</>}
          </span>
        </div>
      )}
    </div>
  );
}

interface StaffQueue {
  userId: string; name: string; pending: number; pendingTotal: number; oldest: string | null;
  failed: number; failedTotal: number; failedReason: string | null; reportedAt: string | null;
}

/** Dashboard (owner/manager): sales still on a staff member's phone, or refused. */
export function OfflineAlerts() {
  const user = useAuthStore((s) => s.user);
  const fr = useAuthStore((s) => s.language) !== 'en';
  const allowed = canSeeCosts(user);
  const [rows, setRows] = useState<StaffQueue[]>([]);

  useEffect(() => {
    if (!allowed) return;
    let alive = true;
    api.get('/offline').then(({ data }) => { if (alive) setRows(data.data || []); }).catch(() => undefined);
    return () => { alive = false; };
  }, [allowed]);

  if (!allowed || rows.length === 0) return null;
  const at = (s: string | null) => s ? new Date(s).toLocaleString(fr ? 'fr-FR' : 'en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-900/20 p-4 space-y-2">
      <p className="flex items-center gap-2 font-semibold text-amber-900 dark:text-amber-100 text-sm">
        <AlertTriangle className="w-4 h-4" />
        {fr ? 'Ventes restées sur un téléphone' : 'Sales still on a device'}
      </p>
      <ul className="space-y-1 text-sm text-amber-900 dark:text-amber-100">
        {rows.map((r) => (
          <li key={r.userId}>
            <b>{r.name}</b>
            {r.pending > 0 && (fr
              ? ` : ${r.pending} vente(s) pas encore envoyée(s) (${formatCurrency(r.pendingTotal)}), la plus ancienne du ${at(r.oldest)}.`
              : `: ${r.pending} sale(s) not sent yet (${formatCurrency(r.pendingTotal)}), oldest ${at(r.oldest)}.`)}
            {r.failed > 0 && <span className="text-red-700 dark:text-red-300">{fr
              ? ` ${r.failed} vente(s) refusée(s) (${formatCurrency(r.failedTotal)})${r.failedReason ? ` : ${r.failedReason}` : ''}.`
              : ` ${r.failed} sale(s) rejected (${formatCurrency(r.failedTotal)})${r.failedReason ? `: ${r.failedReason}` : ''}.`}</span>}
            <span className="text-xs text-amber-700 dark:text-amber-300"> {fr ? `Vu le ${at(r.reportedAt)}` : `Seen ${at(r.reportedAt)}`}</span>
          </li>
        ))}
      </ul>
      <p className="text-xs text-amber-800 dark:text-amber-200">
        {fr ? 'Demandez à cette personne d’ouvrir l’app avec internet, sans se déconnecter : les ventes partiront toutes seules.' : 'Ask this person to open the app with internet, without logging out: the sales will be sent automatically.'}
      </p>
    </div>
  );
}
