import { Prisma } from '@prisma/client';
import { Request } from 'express';
import { prisma } from '../config/prisma';

/** Records who did an important action in the shop. Never fails the request it belongs to. */
export function logActivity(
  req: Request,
  action: string,
  summary: string,
  target?: { type: string; id?: string | null },
  details?: Prisma.InputJsonValue,
): void {
  const u = req.user;
  if (!u) return;
  void (async () => {
    try {
      const who = await prisma.user.findUnique({ where: { id: u.id }, select: { firstName: true, lastName: true } });
      await prisma.activityLog.create({
        data: {
          tenantId: u.tenantId,
          userId: u.id,
          userName: `${who?.firstName ?? ''} ${who?.lastName ?? ''}`.trim() || u.email,
          userRole: u.role,
          action,
          summary: summary.slice(0, 500),
          targetType: target?.type ?? null,
          targetId: target?.id ?? null,
          details,
        },
      });
    } catch (e) {
      console.error('[activity]', e);
    }
  })();
}
