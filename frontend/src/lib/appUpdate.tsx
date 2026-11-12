import toast from 'react-hot-toast';

// Home-screen apps on iPhone have no reload button and resume the old version for days.
// When the app comes back to the foreground, compare our bundle with the one on the server.
const bundleOf = (html: string) => html.match(/\/assets\/index-[\w-]+\.js/)?.[0] ?? null;
const current = () => {
  const src = document.querySelector<HTMLScriptElement>('script[type="module"][src*="/assets/index-"]')?.src;
  return src ? new URL(src).pathname : null;
};

let checking = false;
let notified = false;

async function checkForUpdate(): Promise<void> {
  const mine = current();
  if (!mine || checking || notified || !navigator.onLine) return;
  checking = true;
  try {
    const res = await fetch(`/?v=${Date.now()}`, { cache: 'no-store' });
    const latest = res.ok ? bundleOf(await res.text()) : null;
    if (!latest || latest === mine) return;
    // Never reload in the middle of a sale
    if (!window.location.pathname.startsWith('/pos')) {
      window.location.reload();
      return;
    }
    notified = true;
    const fr = localStorage.getItem('kabrak_lang') !== 'en';
    toast((tst) => (
      <span className="flex items-center gap-3">
        <span>{fr ? 'Nouvelle version disponible' : 'New version available'}</span>
        <button
          className="px-3 py-1 rounded-lg bg-blue-600 text-white text-sm font-semibold"
          onClick={() => { toast.dismiss(tst.id); window.location.reload(); }}
        >
          {fr ? 'Mettre à jour' : 'Update'}
        </button>
      </span>
    ), { duration: Infinity, id: 'app-update' });
  } catch {
    /* offline or server unreachable: try again later */
  } finally {
    checking = false;
  }
}

export function installAppUpdateCheck(): void {
  if (import.meta.env.DEV) return;
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void checkForUpdate();
  });
  window.addEventListener('pageshow', (e) => { if (e.persisted) void checkForUpdate(); });
  setInterval(() => { void checkForUpdate(); }, 15 * 60 * 1000);
}
