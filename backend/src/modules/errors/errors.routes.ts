import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { config } from '../../config';
import { prisma } from '../../config/prisma';
import { recordError } from './errorLog.service';

const router = Router();

const reportSchema = z.object({
  message: z.string().trim().min(1).max(1000),
  stack: z.string().max(8000).optional(),
  url: z.string().max(500).optional(),
  method: z.string().max(10).optional(),
  statusCode: z.number().int().optional(),
  appVersion: z.string().max(40).optional(),
});

// Public: the app reports its own crashes. Auth is optional (crashes can happen before login).
router.post('/', async (req: Request, res: Response) => {
  const parsed = reportSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false });
    return;
  }
  let tenantId: string | null = null;
  let userId: string | null = null;
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token) {
    try {
      const decoded = jwt.verify(token, config.jwtSecret) as { userId: string };
      const user = await prisma.user.findUnique({ where: { id: decoded.userId }, select: { id: true, tenantId: true } });
      if (user) {
        userId = user.id;
        tenantId = user.tenantId;
      }
    } catch {
      /* expired token: still record the error anonymously */
    }
  }
  await recordError({
    source: 'FRONTEND',
    ...parsed.data,
    userAgent: req.headers['user-agent'] || null,
    tenantId,
    userId,
  });
  res.status(202).json({ success: true });
});

export default router;
