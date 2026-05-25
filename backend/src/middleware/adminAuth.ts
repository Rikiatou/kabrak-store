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
