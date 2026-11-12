const KEY = 'kabrak-chunk-reload';

// After a deploy, an open tab still points to old chunk files that no longer exist.
// Reload once to pick up the new build; if it still fails, surface the error.
export function reloadOnStaleChunk(error: unknown): never {
  const last = Number(sessionStorage.getItem(KEY) || 0);
  if (navigator.onLine && Date.now() - last > 30_000) {
    sessionStorage.setItem(KEY, String(Date.now()));
    window.location.reload();
    return new Promise<never>(() => {}) as never;
  }
  throw error;
}

export function installStaleChunkReload(): void {
  window.addEventListener('vite:preloadError', (event) => {
    try {
      reloadOnStaleChunk((event as Event & { payload?: unknown }).payload);
      // Only swallow the error when we reload: otherwise Vite resolves the import with undefined
      event.preventDefault();
    } catch {
      /* already reloaded recently: let the lazy import fail normally */
    }
  });
}
