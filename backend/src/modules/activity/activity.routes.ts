import { Router, Request, Response } from 'express';
import { prisma } from '../../config/prisma';
import { authorize } from '../../middleware/auth';

const router = Router();
router.use(authorize('OWNER', 'MANAGER'));

const parseDay = (s: unknown, end = false) => {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return undefined;
  const d = new Date(`${s}T00:00:00`);
  if (end) d.setDate(d.getDate() + 1);
  return d;
};

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.user!.tenantId;
    const from = parseDay(req.query.from);
    const to = parseDay(req.query.to, true);
    const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
    const limit = 50;
    const where = {
      tenantId,
      ...(typeof req.query.userId === 'string' && req.query.userId && { userId: req.query.userId }),
      ...(typeof req.query.action === 'string' && req.query.action && { action: { startsWith: req.query.action } }),
      ...((from || to) && { createdAt: { ...(from && { gte: from }), ...(to && { lt: to }) } }),
    };
    const [logs, total, people] = await Promise.all([
      prisma.activityLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      prisma.activityLog.count({ where }),
      prisma.activityLog.findMany({ where: { tenantId }, distinct: ['userId'], select: { userId: true, userName: true }, orderBy: { userName: 'asc' } }),
    ]);
    res.json({ success: true, data: logs, users: people, pagination: { total, page, pages: Math.ceil(total / limit) } });
  } catch (error) {
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Failed to fetch activity' });
  }
});

export default router;
