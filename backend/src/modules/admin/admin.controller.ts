import { Request, Response } from 'express';
import { prisma } from '../../config/prisma';
import { PLAN_PRICES } from '../../config/pricing';
import { syncIncludedBranches } from '../../utils/branches';

type SubLike = { status: string; endDate: Date; trialEndsAt: Date | null } | null | undefined;

// The stored status is only updated when the merchant hits the API, so derive it from the dates.
export function effectiveStatus(sub: SubLike): string {
  if (!sub) return 'NONE';
  if (sub.status === 'CANCELLED') return 'CANCELLED';
  const end = sub.status === 'TRIAL' ? sub.trialEndsAt ?? sub.endDate : sub.endDate;
  return end < new Date() ? 'EXPIRED' : sub.status;
}

function subscriptionEnd(sub: SubLike): Date | null {
  if (!sub) return null;
  return sub.status === 'TRIAL' ? sub.trialEndsAt ?? sub.endDate : sub.endDate;
}

const DAY = 24 * 60 * 60 * 1000;
const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

function lastMonths(n: number): string[] {
  const now = new Date();
  return Array.from({ length: n }, (_, i) => monthKey(new Date(now.getFullYear(), now.getMonth() - (n - 1 - i), 1)));
}

function withReference<T extends { omOrderId: string | null }>(p: T) {
  return { ...p, reference: p.omOrderId };
}

export const getDashboard = async (_req: Request, res: Response): Promise<void> => {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const [tenants, totalUsers, pendingPayments, succeeded] = await Promise.all([
      prisma.tenant.findMany({
        select: {
          id: true, name: true, phone: true, email: true, createdAt: true,
          subscription: true,
          users: { where: { role: 'OWNER' }, select: { email: true, phone: true }, take: 1 },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count(),
      prisma.billingPayment.count({ where: { status: 'PENDING' } }),
      prisma.billingPayment.findMany({
        where: { status: 'SUCCEEDED' },
        select: { amountXAF: true, confirmedAt: true, createdAt: true, plan: true },
      }),
    ]);
    const openErrors = await prisma.errorLog.count({ where: { resolved: false } });

    const counts = { ACTIVE: 0, TRIAL: 0, EXPIRED: 0, CANCELLED: 0, NONE: 0 } as Record<string, number>;
    const payingByPlan: Record<string, number> = { STORE: 0, SHOP: 0, BUSINESS: 0 };
    let mrr = 0;
    const expiringSoon: Array<Record<string, unknown>> = [];
    for (const t of tenants) {
      const status = effectiveStatus(t.subscription);
      counts[status] = (counts[status] || 0) + 1;
      if (status === 'ACTIVE' && t.subscription) {
        mrr += PLAN_PRICES[t.subscription.plan] || t.subscription.priceMonthly;
        payingByPlan[t.subscription.plan] = (payingByPlan[t.subscription.plan] || 0) + 1;
      }
      const end = subscriptionEnd(t.subscription);
      if ((status === 'ACTIVE' || status === 'TRIAL') && end && end.getTime() - now.getTime() <= 3 * DAY) {
        expiringSoon.push({
          id: t.id, name: t.name, plan: t.subscription?.plan, status, endDate: end,
          phone: t.phone || t.users[0]?.phone || null, email: t.email || t.users[0]?.email || null,
        });
      }
    }

    const months = lastMonths(6);
    const revenue = Object.fromEntries(months.map((m) => [m, 0]));
    const signups = Object.fromEntries(months.map((m) => [m, 0]));
    let totalRevenue = 0;
    let revenueThisMonth = 0;
    for (const p of succeeded) {
      const d = p.confirmedAt ?? p.createdAt;
      totalRevenue += p.amountXAF;
      if (d >= monthStart) revenueThisMonth += p.amountXAF;
      const k = monthKey(d);
      if (k in revenue) revenue[k] += p.amountXAF;
    }
    for (const t of tenants) {
      const k = monthKey(t.createdAt);
      if (k in signups) signups[k] += 1;
    }

    res.json({
      success: true,
      data: {
        totalTenants: tenants.length,
        totalUsers,
        activeSubs: counts.ACTIVE,
        trialSubs: counts.TRIAL,
        expiredSubs: counts.EXPIRED,
        cancelledSubs: counts.CANCELLED,
        pendingPayments,
        openErrors,
        totalRevenue,
        revenueThisMonth,
        mrr,
        payingByPlan,
        newThisWeek: tenants.filter((t) => now.getTime() - t.createdAt.getTime() <= 7 * DAY).length,
        newThisMonth: tenants.filter((t) => t.createdAt >= monthStart).length,
        expiringSoon: expiringSoon.sort((a, b) => (a.endDate as Date).getTime() - (b.endDate as Date).getTime()),
        recentSignups: tenants.slice(0, 5).map((t) => ({
          id: t.id, name: t.name, createdAt: t.createdAt,
          plan: t.subscription?.plan, status: effectiveStatus(t.subscription),
        })),
        monthly: months.map((m) => ({ month: m, revenue: revenue[m], signups: signups[m] })),
      },
    });
  } catch (error) {
    console.error('[ADMIN] dashboard error:', error);
    res.status(500).json({ success: false, message: 'Erreur dashboard admin' });
  }
};

export const getAllTenants = async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, status, mode, plan } = req.query;
    const where: Record<string, unknown> = {};

    if (search) {
      const q = search as string;
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { slug: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q } },
        { users: { some: { email: { contains: q, mode: 'insensitive' } } } },
      ];
    }
    if (mode) where.businessMode = mode;
    if (plan) where.plan = plan;

    const tenants = await prisma.tenant.findMany({
      where,
      include: {
        subscription: true,
        users: { where: { role: 'OWNER' }, select: { id: true, firstName: true, lastName: true, email: true, phone: true }, take: 1 },
        billingPayments: { where: { status: 'PENDING' }, select: { id: true, status: true, amountXAF: true, plan: true, months: true, createdAt: true } },
        _count: { select: { users: true, products: true, orders: true, clients: true, projects: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    const data = tenants.map((t) => ({ ...t, effectiveStatus: effectiveStatus(t.subscription), subscriptionEnd: subscriptionEnd(t.subscription) }));
    const filtered = status ? data.filter((t) => t.effectiveStatus === status) : data;

    res.json({ success: true, data: filtered });
  } catch (error) {
    console.error('[ADMIN] tenants error:', error);
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
        users: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, role: true, isActive: true, createdAt: true } },
        billingPayments: { orderBy: { createdAt: 'desc' }, take: 50 },
        _count: { select: { products: true, orders: true, clients: true, invoices: true, projects: true, expenses: true, cashSessions: true } },
      },
    });

    if (!tenant) {
      res.status(404).json({ success: false, message: 'Tenant introuvable' });
      return;
    }

    const since30 = new Date(Date.now() - 30 * DAY);
    const notCancelled = { tenantId, status: { not: 'CANCELLED' as const } };
    const [allTime, last30, lastOrder] = await Promise.all([
      prisma.order.aggregate({ where: notCancelled, _sum: { finalAmount: true }, _count: { id: true } }),
      prisma.order.aggregate({ where: { ...notCancelled, createdAt: { gte: since30 } }, _sum: { finalAmount: true }, _count: { id: true } }),
      prisma.order.findFirst({ where: { tenantId }, orderBy: { createdAt: 'desc' }, select: { createdAt: true } }),
    ]);
    const [errorLogs, auditLogs] = await Promise.all([
      prisma.errorLog.findMany({ where: { tenantId }, orderBy: { lastSeen: 'desc' }, take: 20 }),
      prisma.adminAuditLog.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' }, take: 30 }),
    ]);

    res.json({
      success: true,
      data: {
        ...tenant,
        billingPayments: tenant.billingPayments.map(withReference),
        effectiveStatus: effectiveStatus(tenant.subscription),
        subscriptionEnd: subscriptionEnd(tenant.subscription),
        errorLogs,
        auditLogs,
        activity: {
          salesCount: allTime._count.id,
          salesTotal: allTime._sum.finalAmount || 0,
          salesCount30d: last30._count.id,
          salesTotal30d: last30._sum.finalAmount || 0,
          lastSaleAt: lastOrder?.createdAt || null,
        },
      },
    });
  } catch (error) {
    console.error('[ADMIN] tenant detail error:', error);
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
    const { months = 0, days = 0 } = req.body;
    if (!months && !days) {
      res.status(400).json({ success: false, message: 'Précisez months ou days' });
      return;
    }
    const sub = await prisma.subscription.findUnique({ where: { tenantId } });
    if (!sub) {
      res.status(404).json({ success: false, message: 'Abonnement introuvable' });
      return;
    }

    const now = new Date();
    const base = sub.endDate > now ? sub.endDate : now;
    const newEnd = new Date(base);
    if (months) newEnd.setMonth(newEnd.getMonth() + (months as number));
    if (days) newEnd.setDate(newEnd.getDate() + (days as number));

    await prisma.subscription.update({
      where: { tenantId },
      data: { endDate: newEnd, trialEndsAt: newEnd, status: 'ACTIVE' },
    });

    const label = months ? `${months} mois` : `${days} jours`;
    res.json({ success: true, message: `Abonnement prolongé de ${label}`, newEndDate: newEnd });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur extension' });
  }
};

// Sets an exact end date (shorten or lengthen a running subscription/trial).
export const setSubscriptionEnd = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.params.id as string;
    const endDate = new Date(String(req.body?.endDate || ''));
    if (Number.isNaN(endDate.getTime())) {
      res.status(400).json({ success: false, message: 'Date invalide' });
      return;
    }
    endDate.setHours(23, 59, 59, 999);
    const sub = await prisma.subscription.findUnique({ where: { tenantId } });
    if (!sub) {
      res.status(404).json({ success: false, message: 'Abonnement introuvable' });
      return;
    }
    const future = endDate > new Date();
    await prisma.subscription.update({
      where: { tenantId },
      data: {
        endDate,
        ...(sub.status === 'TRIAL' ? { trialEndsAt: endDate } : {}),
        ...(future && sub.status === 'EXPIRED' ? { status: 'ACTIVE' as const } : {}),
      },
    });
    res.json({ success: true, message: `Fin d'abonnement fixée au ${endDate.toLocaleDateString('fr-FR')}`, newEndDate: endDate });
  } catch (error) {
    console.error('[ADMIN] set end date:', error);
    res.status(500).json({ success: false, message: 'Erreur modification de la date' });
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
    await syncIncludedBranches(tenantId, plan as 'STORE' | 'SHOP' | 'BUSINESS');

    res.json({ success: true, message: `Plan changé vers ${plan}` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur changement plan' });
  }
};

const SERVICE_CATEGORIES = new Set([
  'DIGITAL_MARKETING', 'FREELANCER', 'AGENCY', 'CONSULTANT', 'DESIGNER',
  'DEVELOPER', 'SOCIAL_MEDIA', 'PRINTING', 'BUSINESS_SERVICES',
]);

// Fixes a shop that picked the wrong mode at signup. Data is kept; only the menu/modules change.
export const changeTenantMode = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.params.id as string;
    const { mode } = req.body;
    if (mode !== 'PRODUCT' && mode !== 'SERVICE') {
      res.status(400).json({ success: false, message: 'Mode invalide' });
      return;
    }
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { businessCategories: true } });
    if (!tenant) {
      res.status(404).json({ success: false, message: 'Tenant introuvable' });
      return;
    }
    const kept = tenant.businessCategories.filter((c) =>
      c === 'OTHER' || (mode === 'SERVICE') === SERVICE_CATEGORIES.has(c));

    await prisma.tenant.update({
      where: { id: tenantId },
      data: { businessMode: mode, businessCategories: kept.length ? kept : ['OTHER'] },
    });

    res.json({ success: true, message: mode === 'SERVICE' ? 'Passé en mode services' : 'Passé en mode produits' });
  } catch (error) {
    console.error('[ADMIN] change mode:', error);
    res.status(500).json({ success: false, message: 'Erreur changement de mode' });
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
    res.json({ success: true, data: payments.map(withReference) });
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
        tenant: { select: { id: true, name: true, phone: true, email: true, plan: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 300,
    });
    res.json({ success: true, data: payments.map(withReference) });
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
    // Atomic claim: a double click or a second admin tab cannot extend the subscription twice.
    const outcome = await prisma.$transaction(async (tx) => {
      const claimed = await tx.billingPayment.updateMany({
        where: { id: billing.id, status: { not: 'SUCCEEDED' } },
        data: { status: 'SUCCEEDED', confirmedAt: new Date() },
      });
      if (claimed.count === 0) return null;

      // Same shop, same offer, sent within 24h of this one and still pending = duplicate clicks.
      const day = 24 * 60 * 60 * 1000;
      const duplicates = await tx.billingPayment.updateMany({
        where: {
          id: { not: billing.id },
          tenantId: billing.tenantId,
          plan: billing.plan,
          months: billing.months,
          amountXAF: billing.amountXAF,
          status: 'PENDING',
          createdAt: { gte: new Date(billing.createdAt.getTime() - day), lte: new Date(billing.createdAt.getTime() + day) },
        },
        data: { status: 'CANCELLED' },
      });

      const sub = await tx.subscription.findUnique({ where: { tenantId: billing.tenantId } });
      if (sub) {
        const now = new Date();
        const base = sub.endDate > now ? sub.endDate : now;
        const newEnd = new Date(base);
        newEnd.setMonth(newEnd.getMonth() + billing.months);
        await tx.subscription.update({
          where: { tenantId: billing.tenantId },
          data: {
            plan: billing.plan as 'STORE' | 'SHOP' | 'BUSINESS',
            status: 'ACTIVE',
            priceMonthly: PLAN_PRICES[billing.plan] || 4900,
            startDate: base,
            endDate: newEnd,
          },
        });
        await tx.tenant.update({
          where: { id: billing.tenantId },
          data: { plan: billing.plan as 'STORE' | 'SHOP' | 'BUSINESS' },
        });
        await syncIncludedBranches(billing.tenantId, billing.plan as 'STORE' | 'SHOP' | 'BUSINESS', tx);
      }
      const updated = await tx.billingPayment.findUnique({ where: { id: billing.id } });
      return { updated, duplicates: duplicates.count };
    });

    if (!outcome) {
      res.json({ success: true, message: 'Déjà approuvé' });
      return;
    }
    const { updated, duplicates } = outcome;
    const message = duplicates
      ? `Paiement approuvé, abonnement activé (${duplicates} doublon(s) annulé(s))`
      : 'Paiement approuvé, abonnement activé';
    res.json({ success: true, message, data: updated });
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

export const resetUserPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.params.userId as string;
    const { password } = req.body;
    if (!password || password.length < 6) {
      res.status(400).json({ success: false, message: 'Mot de passe trop court (min 6 caractères)' });
      return;
    }
    const bcrypt = await import('bcryptjs');
    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.update({
      where: { id: userId },
      data: { password: hashed },
      select: { id: true, email: true, firstName: true, lastName: true },
    });
    res.json({ success: true, message: `Mot de passe réinitialisé pour ${user.email}`, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur reset mot de passe' });
  }
};

export const deleteTenant = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.params.id as string;
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      res.status(404).json({ success: false, message: 'Tenant introuvable' });
      return;
    }

    // Delete all tenant data in dependency order
    await prisma.$transaction([
      prisma.billingPayment.deleteMany({ where: { tenantId } }),
      prisma.cashSession.deleteMany({ where: { tenantId } }),
      prisma.notification.deleteMany({ where: { tenantId } }),
      prisma.loyaltyReward.deleteMany({ where: { tenantId } }),
      prisma.orderItem.deleteMany({ where: { order: { tenantId } } }),
      prisma.delivery.deleteMany({ where: { tenantId } }),
      prisma.order.deleteMany({ where: { tenantId } }),
      prisma.invoiceLineItem.deleteMany({ where: { invoice: { tenantId } } }),
      prisma.invoice.deleteMany({ where: { tenantId } }),
      prisma.product.deleteMany({ where: { tenantId } }),
      prisma.category.deleteMany({ where: { tenantId } }),
      prisma.supplier.deleteMany({ where: { tenantId } }),
      prisma.client.deleteMany({ where: { tenantId } }),
      prisma.expense.deleteMany({ where: { tenantId } }),
      prisma.projectMilestone.deleteMany({ where: { project: { tenantId } } }),
      prisma.project.deleteMany({ where: { tenantId } }),
      prisma.recurringBilling.deleteMany({ where: { tenantId } }),
      prisma.store.deleteMany({ where: { tenantId } }),
      prisma.subscription.deleteMany({ where: { tenantId } }),
      prisma.user.deleteMany({ where: { tenantId } }),
      prisma.tenant.delete({ where: { id: tenantId } }),
    ]);

    res.json({ success: true, message: `Business "${tenant.name}" supprimé définitivement` });
  } catch (error) {
    console.error('[ADMIN] Delete tenant error:', error);
    res.status(500).json({ success: false, message: 'Erreur suppression' });
  }
};

export const getAnalytics = async (_req: Request, res: Response): Promise<void> => {
  try {
    const [byPlan, byMode, tenants, succeeded] = await Promise.all([
      prisma.tenant.groupBy({ by: ['plan'], _count: { id: true } }),
      prisma.tenant.groupBy({ by: ['businessMode'], _count: { id: true } }),
      prisma.tenant.findMany({ select: { businessCategories: true } }),
      prisma.billingPayment.findMany({ where: { status: 'SUCCEEDED' }, select: { amountXAF: true, confirmedAt: true, createdAt: true } }),
    ]);

    const months = lastMonths(12);
    const revenue = Object.fromEntries(months.map((m) => [m, 0]));
    for (const p of succeeded) {
      const k = monthKey(p.confirmedAt ?? p.createdAt);
      if (k in revenue) revenue[k] += p.amountXAF;
    }
    const byCategory: Record<string, number> = {};
    for (const t of tenants) for (const c of t.businessCategories) byCategory[c] = (byCategory[c] || 0) + 1;

    res.json({
      success: true,
      data: {
        byPlan,
        byMode,
        byCategory: Object.entries(byCategory).map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count),
        revenueByMonth: months.map((m) => ({ month: m, revenue: revenue[m] })),
      },
    });
  } catch (error) {
    console.error('[ADMIN] analytics error:', error);
    res.status(500).json({ success: false, message: 'Erreur analytics' });
  }
};

export const getErrorLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const { resolved, source, tenantId } = req.query;
    const where: Record<string, unknown> = { resolved: resolved === 'true' };
    if (source) where.source = source;
    if (tenantId) where.tenantId = tenantId;
    const [logs, openCount] = await Promise.all([
      prisma.errorLog.findMany({ where, orderBy: { lastSeen: 'desc' }, take: 200 }),
      prisma.errorLog.count({ where: { resolved: false } }),
    ]);
    const tenantIds = [...new Set(logs.map((l) => l.tenantId).filter((x): x is string => Boolean(x)))];
    const tenants = await prisma.tenant.findMany({ where: { id: { in: tenantIds } }, select: { id: true, name: true, phone: true } });
    const byId = Object.fromEntries(tenants.map((t) => [t.id, t]));
    res.json({ success: true, data: logs.map((l) => ({ ...l, tenant: l.tenantId ? byId[l.tenantId] || null : null })), openCount });
  } catch (error) {
    console.error('[ADMIN] error logs:', error);
    res.status(500).json({ success: false, message: 'Erreur chargement des bugs' });
  }
};

export const resolveErrorLog = async (req: Request, res: Response): Promise<void> => {
  try {
    await prisma.errorLog.update({ where: { id: req.params.id as string }, data: { resolved: req.body?.resolved !== false } });
    res.json({ success: true, message: 'Bug mis à jour' });
  } catch (error) {
    res.status(404).json({ success: false, message: 'Bug introuvable' });
  }
};

export const resolveAllErrorLogs = async (_req: Request, res: Response): Promise<void> => {
  const { count } = await prisma.errorLog.updateMany({ where: { resolved: false }, data: { resolved: true } });
  res.json({ success: true, message: `${count} bug(s) marqué(s) corrigé(s)` });
};

export const getAuditLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const { tenantId } = req.query;
    const logs = await prisma.adminAuditLog.findMany({
      where: tenantId ? { tenantId: tenantId as string } : {},
      orderBy: { createdAt: 'desc' },
      take: 300,
    });
    res.json({ success: true, data: logs });
  } catch (error) {
    console.error('[ADMIN] audit logs:', error);
    res.status(500).json({ success: false, message: 'Erreur historique' });
  }
};
