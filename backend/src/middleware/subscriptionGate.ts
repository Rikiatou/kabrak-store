import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';

export const requireActiveSubscription = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Authentication required' });
    return;
  }

  const subscription = await prisma.subscription.findUnique({
    where: { tenantId: req.user.tenantId },
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

  if (subscription.status === 'TRIAL' && subscription.trialEndsAt && subscription.trialEndsAt < now) {
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
