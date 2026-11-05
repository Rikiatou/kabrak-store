import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';

export const requireSuperAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  if (!req.user?.id) {
    res.status(401).json({ success: false, message: 'Non authentifié' });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { isSuperAdmin: true },
  });

  if (!user?.isSuperAdmin) {
    res.status(403).json({ success: false, message: 'Accès réservé aux super administrateurs' });
    return;
  }

  next();
};

export const safeEqual = (a: string, b: string): boolean => {
  const ha = crypto.createHash('sha256').update(a).digest();
  const hb = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
};

const failedTokens = new Map<string, { count: number; until: number }>();

export const requireAdminToken = (req: Request, res: Response, next: NextFunction): void => {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) {
    res.status(503).json({ success: false, message: 'ADMIN_SECRET non configuré' });
    return;
  }

  // Lock an IP out for 15 min after 20 wrong tokens (guessing the password through the API)
  const ip = req.ip || 'unknown';
  const now = Date.now();
  const entry = failedTokens.get(ip);
  if (entry && entry.until > now && entry.count >= 20) {
    res.status(429).json({ success: false, message: 'Trop de tentatives, réessayez plus tard' });
    return;
  }

  const token = req.headers['x-admin-token'];
  if (typeof token !== 'string' || !safeEqual(token, secret)) {
    const e = entry && entry.until > now ? entry : { count: 0, until: now + 15 * 60 * 1000 };
    e.count += 1;
    failedTokens.set(ip, e);
    res.status(403).json({ success: false, message: 'Accès refusé' });
    return;
  }

  next();
};
