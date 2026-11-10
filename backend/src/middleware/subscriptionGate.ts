import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { billingTenantId } from '../utils/branches';

export const requireActiveSubscription = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Authentication required' });
    return;
  }

  const subTenantId = await billingTenantId(req.user.tenantId);
  if (subTenantId !== req.user.tenantId) {
    const parent = await prisma.tenant.findUnique({ where: { id: subTenantId }, select: { plan: true } });
    if (parent?.plan !== 'BUSINESS') {
      res.status(403).json({
        success: false,
        message: 'La 2e boutique est incluse avec BUSINESS. Repassez la boutique principale en BUSINESS.',
        code: 'SUBSCRIPTION_EXPIRED',
      });
      return;
    }
  }

  const subscription = await prisma.subscription.findUnique({
    where: { tenantId: subTenantId },
  });

  if (!subscription) {
    res.status(403).json({
      success: false,
      message: 'No subscription found',
      code: 'NO_SUBSCRIPTION',
    });
    return;
  }

  const now = new Date();

  if (subscription.status === 'TRIAL') {
    // If trial has no end date, treat as expired (fail-closed) to prevent indefinite trial
    if (!subscription.trialEndsAt) {
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: { status: 'EXPIRED' },
      });

      res.status(403).json({
        success: false,
        message: 'Your trial has expired. Please subscribe to continue.',
        code: 'TRIAL_EXPIRED',
      });
      return;
    }

    if (subscription.trialEndsAt < now) {
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: { status: 'EXPIRED' },
      });

      res.status(403).json({
        success: false,
        message: 'Your trial has expired. Please subscribe to continue.',
        code: 'TRIAL_EXPIRED',
      });
      return;
    }
  }

  if (subscription.status === 'EXPIRED' || subscription.endDate < now) {
    if (subscription.status !== 'EXPIRED') {
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: { status: 'EXPIRED' },
      });
    }

    res.status(403).json({
      success: false,
      message: 'Your subscription has expired. Please renew to continue.',
      code: 'SUBSCRIPTION_EXPIRED',
    });
    return;
  }

  if (subscription.status === 'CANCELLED') {
    res.status(403).json({
      success: false,
      message: 'Your subscription was cancelled.',
      code: 'SUBSCRIPTION_CANCELLED',
    });
    return;
  }

  next();
};
