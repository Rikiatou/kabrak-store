import type { LucideIcon } from 'lucide-react';

export function StatTile({ label, value, icon: Icon, sub, tone, delta }: {
  label: string;
  value: string;
  icon: LucideIcon;
  sub?: string;
  tone?: string;
  /** Change vs the previous period, in % (null = no previous data) */
  delta?: number | null;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 sm:p-4 break-inside-avoid">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium truncate">{label}</p>
        <Icon className="w-4 h-4 text-gray-400 flex-shrink-0" />
      </div>
      <p className={`mt-2 text-xl sm:text-2xl font-semibold tabular-nums ${tone || 'text-gray-900 dark:text-white'}`}>{value}</p>
      {sub || (delta !== undefined && delta !== null) ? (
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 tabular-nums">
          {delta !== undefined && delta !== null ? (
            <span className={delta >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600'}>
              {delta >= 0 ? '+' : ''}{Math.round(delta)} %
            </span>
          ) : null}
          {sub ? <>{delta !== undefined && delta !== null ? ' · ' : ''}{sub}</> : null}
        </p>
      ) : null}
    </div>
  );
}
