import { Request, Response } from 'express';
import { prisma } from '../../config/prisma';

const PLAN_PRICES: Record<string, number> = {
  STORE: 4900,
  SHOP: 7900,
  BUSINESS: 12900,
};

export const getDashboard = async (req: Request, res: Response): Promise<void> => {
  try {
    const [
      totalTenants,
      activeSubs,
      expiredSubs,
      trialSubs,
      pendingPayments,
      totalRevenue,
    ] = await Promise.all([
      prisma.tenant.count(),
      prisma.subscription.count({ where: { status: 'ACTIVE' } }),
      prisma.subscription.count({ where: { status: 'EXPIRED' } }),
      prisma.subscription.count({ where: { status: 'TRIAL' } }),
      prisma.billingPayment.count({ where: { status: 'PENDING' } }),
      prisma.billingPayment.aggregate({
        where: { status: 'SUCCEEDED' },
        _sum: { amountXAF: true },
      }),
    ]);

    res.json({
      success: true,
      data: {
        totalTenants,
        activeSubs,
        expiredSubs,
        trialSubs,
        pendingPayments,
        totalRevenue: totalRevenue._sum.amountXAF || 0,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur dashboard admin' });
  }
};

export const getAllTenants = async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, status, mode } = req.query;
    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } },
      ];
    }
    if (mode) where.businessMode = mode;

    const tenants = await prisma.tenant.findMany({
      where,
      include: {
        subscription: true,
        _count: { select: { users: true, products: true, orders: true, clients: true, projects: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const filtered = status
      ? tenants.filter((t) => t.subscription?.status === status)
      : tenants;

    res.json({ success: true, data: filtered });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur listing tenants' });
  }
};

export const getTenantDetail = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.params.id as string;
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        subscription: true,
        users: { select: { id: true, firstName: true, lastName: true, email: true, role: true, isActive: true } },
        _count: { select: { products: true, orders: true, clients: true, invoices: true, projects: true } },
      },
    });

    if (!tenant) {
      res.status(404).json({ success: false, message: 'Tenant introuvable' });
      return;
    }

    res.json({ success: true, data: tenant });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur détail tenant' });
  }
};

export const suspendTenant = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.params.id as string;
    await prisma.subscription.update({
      where: { tenantId },
      data: { status: 'CANCELLED' },
    });
    res.json({ success: true, message: 'Business suspendu' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur suspension' });
  }
};

export const reactivateTenant = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.params.id as string;
    await prisma.subscription.update({
      where: { tenantId },
      data: { status: 'ACTIVE' },
    });
    res.json({ success: true, message: 'Business réactivé' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur réactivation' });
  }
};

export const extendSubscription = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.params.id as string;
    const { months = 1 } = req.body;
    const sub = await prisma.subscription.findUnique({
      where: { tenantId },
    });
    if (!sub) {
      res.status(404).json({ success: false, message: 'Abonnement introuvable' });
      return;
    }

    const now = new Date();
    const base = sub.endDate > now ? sub.endDate : now;
    const newEnd = new Date(base);
    newEnd.setMonth(newEnd.getMonth() + (months as number));

    await prisma.subscription.update({
      where: { tenantId },
      data: { endDate: newEnd, status: 'ACTIVE' },
    });

    res.json({ success: true, message: `Abonnement prolongé de ${months} mois` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur extension' });
  }
};

export const changeTenantPlan = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.params.id as string;
    const { plan } = req.body;
    if (!PLAN_PRICES[plan as string]) {
      res.status(400).json({ success: false, message: 'Plan invalide' });
      return;
    }

    await prisma.$transaction([
      prisma.subscription.update({
        where: { tenantId },
        data: { plan: plan as 'STORE' | 'SHOP' | 'BUSINESS', priceMonthly: PLAN_PRICES[plan as string] },
      }),
      prisma.tenant.update({
        where: { id: tenantId },
        data: { plan: plan as 'STORE' | 'SHOP' | 'BUSINESS' },
      }),
    ]);

    res.json({ success: true, message: `Plan changé vers ${plan}` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur changement plan' });
  }
};

// Orange Money admin endpoints
export const getPendingPayments = async (_req: Request, res: Response): Promise<void> => {
  try {
    const payments = await prisma.billingPayment.findMany({
      where: { status: 'PENDING' },
      include: {
        tenant: { select: { id: true, name: true, phone: true, email: true, plan: true, businessMode: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: payments });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur listing paiements' });
  }
};

export const getAllPayments = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status } = req.query;
    const where = status ? { status: status as 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED' } : {};

    const payments = await prisma.billingPayment.findMany({
      where,
      include: {
        tenant: { select: { id: true, name: true, phone: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json({ success: true, data: payments });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur listing paiements' });
  }
};

export const approvePayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const paymentId = req.params.paymentId as string;
    const billing = await prisma.billingPayment.findUnique({
      where: { id: paymentId },
    });
    if (!billing) {
      res.status(404).json({ success: false, message: 'Paiement introuvable' });
      return;
    }
    if (billing.status === 'SUCCEEDED') {
      res.json({ success: true, message: 'Déjà approuvé' });
      return;
    }

    // Update payment status
    const updated = await prisma.billingPayment.update({
      where: { id: billing.id },
      data: { status: 'SUCCEEDED', confirmedAt: new Date() },
    });

    // Activate subscription
    const sub = await prisma.subscription.findUnique({
      where: { tenantId: billing.tenantId },
    });
    if (sub) {
      const now = new Date();
      const base = sub.endDate > now ? sub.endDate : now;
      const newEnd = new Date(base);
      newEnd.setMonth(newEnd.getMonth() + billing.months);

      await prisma.subscription.update({
        where: { tenantId: billing.tenantId },
        data: {
          plan: billing.plan as 'STORE' | 'SHOP' | 'BUSINESS',
          status: 'ACTIVE',
          priceMonthly: PLAN_PRICES[billing.plan] || 4900,
          startDate: base,
          endDate: newEnd,
        },
      });

      await prisma.tenant.update({
        where: { id: billing.tenantId },
        data: { plan: billing.plan as 'STORE' | 'SHOP' | 'BUSINESS' },
      });
    }

    res.json({ success: true, message: 'Paiement approuvé, abonnement activé', data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur approbation' });
  }
};

export const rejectPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const paymentId = req.params.paymentId as string;
    const billing = await prisma.billingPayment.findUnique({
      where: { id: paymentId },
    });
    if (!billing) {
      res.status(404).json({ success: false, message: 'Paiement introuvable' });
      return;
    }

    const updated = await prisma.billingPayment.update({
      where: { id: billing.id },
      data: { status: 'FAILED' },
    });

    res.json({ success: true, message: 'Paiement rejeté', data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur rejet' });
  }
};

export const getAnalytics = async (_req: Request, res: Response): Promise<void> => {
  try {
    const [byPlan, byMode, revenueByMonth] = await Promise.all([
      prisma.tenant.groupBy({ by: ['plan'], _count: { id: true } }),
      prisma.tenant.groupBy({ by: ['businessMode'], _count: { id: true } }),
      prisma.billingPayment.groupBy({
        by: ['createdAt'],
        where: { status: 'SUCCEEDED' },
        _sum: { amountXAF: true },
      }),
    ]);

    res.json({
      success: true,
      data: { byPlan, byMode, revenueByMonth },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur analytics' });
  }
};
