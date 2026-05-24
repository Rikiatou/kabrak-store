import { Request, Response } from 'express';
import { prisma } from '../../config/prisma';

export const getSubscription = async (req: Request, res: Response): Promise<void> => {
  try {
    const subscription = await prisma.subscription.findUnique({
      where: { tenantId: req.user!.tenantId },
      include: { tenant: { select: { name: true, plan: true } } },
    });

    if (!subscription) {
      res.status(404).json({ success: false, message: 'Aucun abonnement trouvé' });
      return;
    }

    const isExpired = new Date() > subscription.endDate;
    const daysRemaining = Math.max(0, Math.ceil((subscription.endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

    res.json({
      success: true,
      data: {
        ...subscription,
        isExpired,
        daysRemaining,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch subscription';
    res.status(500).json({ success: false, message });
  }
};

export const changePlan = async (req: Request, res: Response): Promise<void> => {
  try {
    const { plan } = req.body;

    const priceMap: Record<string, number> = {
      STORE: 4900,
      SHOP: 7900,
      BUSINESS: 12900,
    };

    const price = priceMap[plan];
    if (!price) {
      res.status(400).json({ success: false, message: 'Plan invalide' });
      return;
    }

    await prisma.$transaction([
      prisma.subscription.update({
        where: { tenantId: req.user!.tenantId },
        data: { plan, priceMonthly: price },
      }),
      prisma.tenant.update({
        where: { id: req.user!.tenantId },
        data: { plan },
      }),
    ]);

    res.json({ success: true, message: 'Plan mis à jour' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to change plan';
    res.status(500).json({ success: false, message });
  }
};

// Placeholder for mobile money payment initiation
export const initiatePayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { method, phone } = req.body;

    // In production, integrate with:
    // - MTN MoMo API: https://momodeveloper.mtn.com/
    // - Orange Money API
    // For now, return a placeholder response

    const subscription = await prisma.subscription.findUnique({
      where: { tenantId: req.user!.tenantId },
    });

    if (!subscription) {
      res.status(404).json({ success: false, message: 'Aucun abonnement trouvé' });
      return;
    }

    res.json({
      success: true,
      data: {
        message: `Paiement ${method} initié. Veuillez confirmer sur votre téléphone ${phone}.`,
        amount: subscription.priceMonthly,
        currency: 'XAF',
        method,
        phone,
        status: 'PENDING',
        reference: `PAY-${Date.now().toString(36).toUpperCase()}`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to initiate payment';
    res.status(500).json({ success: false, message });
  }
};

// Simulate payment confirmation (for development)
export const confirmPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);

    const subscription = await prisma.subscription.update({
      where: { tenantId: req.user!.tenantId },
      data: {
        status: 'ACTIVE',
        startDate: new Date(),
        endDate,
      },
    });

    res.json({
      success: true,
      message: 'Paiement confirmé. Abonnement renouvelé.',
      data: subscription,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to confirm payment';
    res.status(500).json({ success: false, message });
  }
};
