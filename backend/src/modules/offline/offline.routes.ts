import { Prisma } from '@prisma/client';
import { Router, Request, Response } from 'express';
import { prisma } from '../../config/prisma';
import { authorize } from '../../middleware/auth';
import { logActivity } from '../../utils/activity';

const router = Router();

interface QueuedSale { offlineId: string; createdAt: string; total: number; error?: string }

const toSales = (v: unknown): QueuedSale[] =>
  (Array.isArray(v) ? v : []).slice(0, 200).flatMap((x) => {
    if (!x || typeof x !== 'object') return [];
    const o = x as Record<string, unknown>;
    const total = Number(o.total);
    if (typeof o.offlineId !== 'string' || typeof o.createdAt !== 'string' || !Number.isFinite(total)) return [];
    return [{ offlineId: o.offlineId.slice(0, 64), createdAt: o.createdAt.slice(0, 40), total, ...(typeof o.error === 'string' && { error: o.error.slice(0, 200) }) }];
  });

const sum = (l: QueuedSale[]) => l.reduce((s, x) => s + x.total, 0);
const fcfa = (n: number) => `${Math.round(n).toLocaleString('fr-FR')} F`;

/** The app tells the server what is still stuck on this device: waiting to be sent, or refused. */
router.post('/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const pending = toSales(req.body.pending);
    const failed = toSales(req.body.failed);
    const discarded = toSales(req.body.discarded);
    const queue = pending.length || failed.length ? { pending, failed } : null;
    await prisma.user.update({
      where: { id: req.user!.id },
      data: { offlineQueue: queue === null ? Prisma.DbNull : (queue as unknown as Prisma.InputJsonValue), offlineReportedAt: new Date() },
    });
    if (discarded.length) {
      logActivity(req, 'OFFLINE_DISCARD', `${discarded.length} vente(s) hors ligne refusée(s) effacée(s) du téléphone (${fcfa(sum(discarded))})${discarded[0].error ? ` · ${discarded[0].error}` : ''}`, { type: 'offline' }, { sales: discarded as unknown as Prisma.InputJsonValue });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Failed to save offline status' });
  }
});

/** Owner/manager: who still has sales on their device. */
router.get('/', authorize('OWNER', 'MANAGER'), async (req: Request, res: Response): Promise<void> => {
  try {
    const users = await prisma.user.findMany({
      where: { tenantId: req.user!.tenantId },
      select: { id: true, firstName: true, lastName: true, role: true, offlineQueue: true, offlineReportedAt: true },
    });
    const data = users.flatMap((u) => {
      const q = u.offlineQueue as { pending?: QueuedSale[]; failed?: QueuedSale[] } | null;
      if (!q) return [];
      const pending = q.pending ?? [];
      const failed = q.failed ?? [];
      if (!pending.length && !failed.length) return [];
      return [{
        userId: u.id,
        name: `${u.firstName} ${u.lastName}`.trim(),
        role: u.role,
        pending: pending.length,
        pendingTotal: sum(pending),
        oldest: pending.map((s) => s.createdAt).sort()[0] ?? null,
        failed: failed.length,
        failedTotal: sum(failed),
        failedReason: failed.find((s) => s.error)?.error ?? null,
        reportedAt: u.offlineReportedAt,
      }];
    });
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Failed to fetch offline status' });
  }
});

export default router;
