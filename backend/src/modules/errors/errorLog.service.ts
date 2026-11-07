import { notifyAdmin } from '../../services/telegram';
import crypto from 'crypto';
import { AsyncLocalStorage } from 'async_hooks';
import { prisma } from '../../config/prisma';

export interface ErrorInput {
  source: 'FRONTEND' | 'BACKEND';
  message: string;
  stack?: string | null;
  url?: string | null;
  method?: string | null;
  statusCode?: number | null;
  userAgent?: string | null;
  appVersion?: string | null;
  tenantId?: string | null;
  userId?: string | null;
}

// Per-request store so a 500 response can be linked to the error logged by the controller.
export const requestContext = new AsyncLocalStorage<{ error?: unknown }>();

const normalizePath = (url?: string | null) =>
  (url || '')
    .split('?')[0]
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id')
    .replace(/\/\d+(?=\/|$)/g, '/:n');

export async function recordError(input: ErrorInput): Promise<void> {
  try {
    const message = (input.message || 'Unknown error').slice(0, 1000);
    const url = normalizePath(input.url).slice(0, 300);
    const fingerprint = crypto
      .createHash('sha1')
      .update([input.source, message.slice(0, 200), url, input.tenantId || ''].join('|'))
      .digest('hex');
    const now = new Date();
    const data = {
      stack: input.stack?.slice(0, 6000) ?? null,
      method: input.method ?? null,
      statusCode: input.statusCode ?? null,
      userAgent: input.userAgent?.slice(0, 300) ?? null,
      appVersion: input.appVersion?.slice(0, 40) ?? null,
      userId: input.userId ?? null,
    };
    const existing = await prisma.errorLog.findUnique({ where: { fingerprint }, select: { resolved: true } });
    await prisma.errorLog.upsert({
      where: { fingerprint },
      create: { fingerprint, source: input.source, message, url, tenantId: input.tenantId ?? null, ...data },
      update: { ...data, count: { increment: 1 }, lastSeen: now, resolved: false },
    });
    if (!existing || existing.resolved) {
      const shop = input.tenantId
        ? (await prisma.tenant.findUnique({ where: { id: input.tenantId }, select: { name: true } }))?.name
        : null;
      notifyAdmin(
        `🐞 ${existing ? 'Bug revenu' : 'Nouveau bug'} (${input.source})\n${shop || 'Boutique inconnue'}\n${url || '-'}\n${message.slice(0, 300)}\nhttps://admin.kabrakeng.com/kabrak/bugs`,
      );
    }
  } catch (e) {
    process.stderr.write(`[error-log] failed to record: ${(e as Error).message}\n`);
  }
}

const originalConsoleError = console.error.bind(console);
let consolePatched = false;

// Controllers log with console.error(...) and then answer 500; keep the Error so its stack is stored.
export function patchConsoleError(): void {
  if (consolePatched) return;
  consolePatched = true;
  console.error = (...args: unknown[]) => {
    const store = requestContext.getStore();
    if (store && !store.error) store.error = args.find((a) => a instanceof Error) ?? args.map(String).join(' ');
    originalConsoleError(...args);
  };
}
