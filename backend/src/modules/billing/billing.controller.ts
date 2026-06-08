import { Request, Response } from 'express';
import { prisma } from '../../config/prisma';
import { omService } from '../../services/orangeMoneyService';

const PLAN_PRICES: Record<string, number> = {
  STORE: 4900,
  SHOP: 9900,
  BUSINESS: 14900,
};

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
    const daysRemaining = Math.max(
      0,
      Math.ceil((subscription.endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    );

    res.json({
      success: true,
      data: { ...subscription, isExpired, daysRemaining },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch subscription';
    res.status(500).json({ success: false, message });
  }
};

export const getPricing = (_req: Request, res: Response): void => {
  res.json({ success: true, data: omService.getPricing() });
};

export const changePlan = async (req: Request, res: Response): Promise<void> => {
  try {
    const { plan } = req.body;
    const price = PLAN_PRICES[plan as string];
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

export const initiatePayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { plan, months = 1 } = req.body;
    if (!PLAN_PRICES[plan as string]) {
      res.status(400).json({ success: false, message: 'Plan invalide' });
      return;
    }

    const { total, planName } = omService.calculateTotal(plan as string, months as number);
    const orderId = `KBS-${Date.now()}-${req.user!.tenantId.slice(0, 8)}`;

    const billing = await prisma.billingPayment.create({
      data: {
        tenantId: req.user!.tenantId,
        plan: plan as string,
        months: months as number,
        amountXAF: total,
        omOrderId: orderId,
        status: 'PENDING',
        mode: 'manual',
      },
    });

    if (omService.isConfigured()) {
      try {
        const omRes = await omService.initiatePayment({
          orderId,
          amountXAF: total,
          description: `${planName} - ${months} mois - KABRAK Store`,
        });
        await prisma.billingPayment.update({
          where: { id: billing.id },
          data: { payToken: omRes.pay_token, mode: 'redirect' },
        });
        res.json({
          success: true,
          data: {
            paymentId: billing.id,
            mode: 'redirect',
            paymentUrl: omRes.payment_url,
            amountXAF: total,
          },
        });
        return;
      } catch (omErr) {
        console.error('OM API error, fallback to manual:', (omErr as Error).message);
      }
    }

    res.json({
      success: true,
      data: {
        paymentId: billing.id,
        mode: 'manual',
        amountXAF: total,
        months,
        plan,
        planName,
        instructions: {
          number: process.env.OM_MERCHANT_NUMBER || '+237 655 806 851',
          ussd: process.env.OM_USSD_CODE || '#150*46*1341156#',
          reference: orderId,
          steps: [
            `Composez ${process.env.OM_USSD_CODE || '#150*46*1341156#'} depuis votre téléphone Orange`,
            `Entrez le montant : ${total.toLocaleString()} FCFA`,
            `Mettez la référence : ${orderId}`,
            'Entrez votre code secret Orange Money',
            'Validez et attendez le SMS de confirmation',
            'Envoyez la capture du SMS sur WhatsApp pour confirmation rapide',
          ],
        },
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur lors du paiement';
    res.status(500).json({ success: false, message });
  }
};

export const getPaymentStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const paymentId = req.params.paymentId as string;
    const billing = await prisma.billingPayment.findFirst({
      where: { id: paymentId, tenantId: req.user!.tenantId },
    });
    if (!billing) {
      res.status(404).json({ success: false, message: 'Paiement introuvable' });
      return;
    }

    if (billing.mode === 'redirect' && billing.payToken && billing.status === 'PENDING') {
      try {
        const omStatus = await omService.checkStatus(billing.payToken);
        if (omStatus.status === 'SUCCESS') {
          await confirmBillingPayment(billing.id);
          res.json({ success: true, data: { status: 'SUCCEEDED' } });
          return;
        }
      } catch {
        // silent
      }
    }

    res.json({
      success: true,
      data: { status: billing.status, amountXAF: billing.amountXAF },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur';
    res.status(500).json({ success: false, message });
  }
};

export const confirmManual = async (req: Request, res: Response): Promise<void> => {
  try {
    const paymentId = req.params.paymentId as string;
    const billing = await prisma.billingPayment.findFirst({
      where: { id: paymentId, tenantId: req.user!.tenantId },
    });
    if (!billing) {
      res.status(404).json({ success: false, message: 'Introuvable' });
      return;
    }
    if (billing.status === 'SUCCEEDED') {
      res.json({ success: true, message: 'Déjà confirmé' });
      return;
    }
    await confirmBillingPayment(billing.id);
    res.json({ success: true, message: 'Paiement confirmé, abonnement activé !' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur confirmation';
    res.status(500).json({ success: false, message });
  }
};

export const webhook = async (req: Request, res: Response): Promise<void> => {
  try {
    const sig = req.headers['x-orange-signature'] as string | undefined;
    if (!omService.verifyWebhook(req.body, sig)) {
      res.status(401).json({ success: false, message: 'Signature invalide' });
      return;
    }

    const { order_id, status } = req.body as { order_id?: string; status?: string };

    if (status === 'SUCCESS' && order_id) {
      const billing = await prisma.billingPayment.findFirst({
        where: { omOrderId: order_id },
      });
      if (billing && billing.status === 'PENDING') {
        await confirmBillingPayment(billing.id);
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ success: false, message: 'Erreur webhook' });
  }
};

export const getHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const payments = await prisma.billingPayment.findMany({
      where: { tenantId: req.user!.tenantId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    res.json({ success: true, data: payments });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur' });
  }
};

async function confirmBillingPayment(billingId: string): Promise<void> {
  const billing = await prisma.billingPayment.update({
    where: { id: billingId },
    data: { status: 'SUCCEEDED', confirmedAt: new Date() },
  });

  const sub = await prisma.subscription.findUnique({
    where: { tenantId: billing.tenantId },
  });
  if (!sub) return;

  const now = new Date();
  const start = sub.endDate > now ? sub.endDate : now;
  const end = new Date(start);
  end.setMonth(end.getMonth() + billing.months);

  const planKey = billing.plan as keyof typeof PLAN_PRICES;

  await prisma.subscription.update({
    where: { tenantId: billing.tenantId },
    data: {
      plan: planKey as 'STORE' | 'SHOP' | 'BUSINESS',
      status: 'ACTIVE',
      priceMonthly: PLAN_PRICES[planKey] || 4900,
      startDate: start,
      endDate: end,
    },
  });

  await prisma.tenant.update({
    where: { id: billing.tenantId },
    data: { plan: planKey as 'STORE' | 'SHOP' | 'BUSINESS' },
  });
}
