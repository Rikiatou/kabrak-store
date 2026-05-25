import { Request, Response, NextFunction } from 'express';
import { PlanType } from '@prisma/client';
import { prisma } from '../config/prisma';

const PLAN_LEVELS: Record<PlanType, number> = {
  STORE: 1,
  SHOP: 2,
  BUSINESS: 3,
};

export const requirePlan = (...minimumPlans: PlanType[]) => {
  const minLevel = Math.min(...minimumPlans.map((p) => PLAN_LEVELS[p]));

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: req.user.tenantId },
      select: { plan: true },
    });

    if (!tenant) {
      res.status(404).json({ success: false, message: 'Tenant not found' });
      return;
    }

    if (PLAN_LEVELS[tenant.plan] < minLevel) {
      res.status(403).json({
        success: false,
        message: `This feature requires a ${minimumPlans.join(' or ')} plan. Upgrade to access it.`,
        code: 'PLAN_UPGRADE_REQUIRED',
      });
      return;
    }

    next();
  };
};
