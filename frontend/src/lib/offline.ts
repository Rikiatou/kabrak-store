import { useSyncExternalStore } from 'react';
import axios from 'axios';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

// Offline POS: sales made without a connection are queued in localStorage and
// replayed to POST /orders when the connection returns. `offlineId` makes the
// replay idempotent on the server.

const QUEUE_KEY = 'kabrak_offline_sales';
const FAILED_KEY = 'kabrak_offline_failed';
const CACHE_PREFIX = 'kabrak_cache_';

export interface OfflineSale {
  offlineId: string;
  owner: string;
  createdAt: string;
  total: number;
  payload: Record<string, unknown>;
}

interface OfflineSnapshot {
  online: boolean;
  pending: number;
  failed: number;
  syncing: boolean;
}

function readAll(key: string): OfflineSale[] {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
}

// Queued sales and caches belong to one account, so switching accounts on a device never mixes them.
function currentOwner(): string | null {
  const { user, tenant } = useAuthStore.getState();
  return user && tenant ? `${tenant.id}:${user.id}` : null;
}

function read(key: string): OfflineSale[] {
  const owner = currentOwner();
  return owner ? readAll(key).filter((s) => s.owner === owner) : [];
}

const listeners = new Set<() => void>();
let syncing = false;
let snapshot: OfflineSnapshot = compute();

function compute(): OfflineSnapshot {
  return { online: navigator.onLine, pending: read(QUEUE_KEY).length, failed: read(FAILED_KEY).length, syncing };
}

function emit() {
  snapshot = compute();
  listeners.forEach((l) => l());
}

function write(key: string, list: OfflineSale[]) {
  localStorage.setItem(key, JSON.stringify(list));
  emit();
}

window.addEventListener('online', emit);
window.addEventListener('offline', emit);
useAuthStore.subscribe(emit);

export function useOfflineStatus(): OfflineSnapshot {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => { listeners.delete(l); }; },
    () => snapshot
  );
}

function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/** True when the request never reached the server (no connection, DNS, timeout). */
export function isNetworkError(err: unknown): boolean {
  return axios.isAxiosError(err) && !err.response;
}

export const newOfflineId = uuid;

export function queueSale(payload: Record<string, unknown>, total: number, offlineId: string = uuid()): OfflineSale {
  const owner = currentOwner() ?? 'unknown';
  const sale: OfflineSale = { offlineId, owner, createdAt: new Date().toISOString(), total, payload };
  write(QUEUE_KEY, [...readAll(QUEUE_KEY), sale]);
  return sale;
}

export async function syncOfflineSales(): Promise<{ synced: number; failed: number }> {
  const result = { synced: 0, failed: 0 };
  if (syncing || !navigator.onLine || read(QUEUE_KEY).length === 0) return result;
  syncing = true;
  emit();
  try {
    for (const sale of read(QUEUE_KEY)) {
      try {
        await api.post('/orders', { ...sale.payload, offlineId: sale.offlineId, createdAt: sale.createdAt });
        result.synced++;
      } catch (err) {
        const status = axios.isAxiosError(err) ? err.response?.status : undefined;
        // Retry later on connection, auth or server errors; only park sales the server rejected as invalid.
        if (!status || status === 401 || status >= 500) break;
        result.failed++;
        write(FAILED_KEY, [...readAll(FAILED_KEY), sale]);
      }
      write(QUEUE_KEY, readAll(QUEUE_KEY).filter((s) => s.offlineId !== sale.offlineId));
    }
  } finally {
    syncing = false;
    emit();
  }
  return result;
}

export function discardFailedSales() {
  const owner = currentOwner();
  write(FAILED_KEY, readAll(FAILED_KEY).filter((s) => s.owner !== owner));
}

function cacheKey(key: string) {
  return `${CACHE_PREFIX}${useAuthStore.getState().tenant?.id ?? 'none'}_${key}`;
}

export function cacheSet(key: string, value: unknown) {
  try { localStorage.setItem(cacheKey(key), JSON.stringify(value)); } catch { /* storage full */ }
}

export function cacheGet<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(cacheKey(key));
    return raw ? (JSON.parse(raw) as T) : null;
  } catch { return null; }
}
