import { Request, Response, NextFunction } from 'express';
import { BusinessMode } from '@prisma/client';
import { prisma } from '../config/prisma';

export const requireMode = (...modes: BusinessMode[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: req.user.tenantId },
      select: { businessMode: true },
    });

    if (!tenant) {
      res.status(404).json({ success: false, message: 'Tenant not found' });
      return;
    }

    if (!modes.includes(tenant.businessMode)) {
      res.status(403).json({
        success: false,
        message: `This feature is only available for ${modes.join(' / ')} businesses`,
      });
      return;
    }

    next();
  };
};
