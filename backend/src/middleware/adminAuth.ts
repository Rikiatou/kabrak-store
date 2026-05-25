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

export const requireAdminToken = (req: Request, res: Response, next: NextFunction): void => {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) {
    res.status(503).json({ success: false, message: 'ADMIN_SECRET non configuré' });
    return;
  }

  const token = req.headers['x-admin-token'];
  if (!token || token !== secret) {
    res.status(403).json({ success: false, message: 'Accès refusé' });
    return;
  }

  next();
};
