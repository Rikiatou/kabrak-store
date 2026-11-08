declare const __APP_VERSION__: string;

const API_BASE = import.meta.env.VITE_API_URL || '/api';
const IGNORED = [/ResizeObserver loop/i, /^Script error\.?$/i, /Non-Error promise rejection/i];
const BOT_UA = /bot|crawl|spider|slurp|Google-Read-Aloud|Lighthouse|HeadlessChrome|facebookexternalhit|WhatsApp\//i;
const sent = new Set<string>();
let sentCount = 0;

interface Extra {
  stack?: string;
  url?: string;
  method?: string;
  statusCode?: number;
}

// Sends app crashes to the backend (admin "Bugs" page). Fire-and-forget, max 20 distinct errors per page load.
export function reportError(message: string, extra: Extra = {}): void {
  if (!message || IGNORED.some((re) => re.test(message)) || BOT_UA.test(navigator.userAgent)) return;
  const key = `${message}|${extra.url || ''}`;
  if (sent.has(key) || sentCount >= 20) return;
  sent.add(key);
  sentCount += 1;
  const token = localStorage.getItem('kabrak_token');
  try {
    void fetch(`${API_BASE}/errors`, {
      method: 'POST',
      keepalive: true,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({
        message: message.slice(0, 1000),
        stack: extra.stack?.slice(0, 8000),
        url: (extra.url || window.location.pathname).slice(0, 500),
        method: extra.method,
        statusCode: extra.statusCode,
        appVersion: typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : undefined,
      }),
    }).catch(() => undefined);
  } catch {
    /* never let reporting break the app */
  }
}

export function installErrorReporter(): void {
  window.addEventListener('error', (e) => reportError(e.message, { stack: e.error?.stack }));
  window.addEventListener('unhandledrejection', (e) => {
    const r = e.reason as { message?: string; stack?: string; isAxiosError?: boolean } | undefined;
    if (r?.isAxiosError) return; // API errors are recorded by the server itself
    reportError(r?.message || String(r), { stack: r?.stack });
  });
}
