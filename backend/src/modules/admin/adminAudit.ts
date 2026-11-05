import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';

const RULES: Array<{ re: RegExp; action: string; type: string }> = [
  { re: /^\/tenants\/([^/]+)\/suspend$/, action: 'TENANT_SUSPEND', type: 'tenant' },
  { re: /^\/tenants\/([^/]+)\/reactivate$/, action: 'TENANT_REACTIVATE', type: 'tenant' },
  { re: /^\/tenants\/([^/]+)\/extend$/, action: 'SUBSCRIPTION_EXTEND', type: 'tenant' },
  { re: /^\/tenants\/([^/]+)\/set-end-date$/, action: 'SUBSCRIPTION_SET_END', type: 'tenant' },
  { re: /^\/tenants\/([^/]+)\/change-plan$/, action: 'PLAN_CHANGE', type: 'tenant' },
  { re: /^\/tenants\/([^/]+)$/, action: 'TENANT_DELETE', type: 'tenant' },
  { re: /^\/users\/([^/]+)\/reset-password$/, action: 'PASSWORD_RESET', type: 'user' },
  { re: /^\/payments\/([^/]+)\/approve$/, action: 'PAYMENT_APPROVE', type: 'payment' },
  { re: /^\/payments\/([^/]+)\/reject$/, action: 'PAYMENT_REJECT', type: 'payment' },
];

async function resolveTenant(type: string, id: string) {
  if (type === 'tenant') {
    const t = await prisma.tenant.findUnique({ where: { id }, select: { id: true, name: true, subscription: { select: { endDate: true, plan: true } } } });
    return t ? { id: t.id, name: t.name, previousEndDate: t.subscription?.endDate, previousPlan: t.subscription?.plan } : null;
  }
  if (type === 'user') {
    const u = await prisma.user.findUnique({ where: { id }, select: { email: true, tenant: { select: { id: true, name: true } } } });
    return u ? { ...u.tenant, email: u.email } : null;
  }
  const p = await prisma.billingPayment.findUnique({
    where: { id },
    select: { amountXAF: true, plan: true, months: true, omOrderId: true, tenant: { select: { id: true, name: true } } },
  });
  return p ? { ...p.tenant, amountXAF: p.amountXAF, plan: p.plan, months: p.months, reference: p.omOrderId } : null;
}

// Logs every successful admin write (who did what to which shop). Target is looked up before the
// handler runs so deleted shops keep their name in the history.
export async function auditAdminAction(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (req.method === 'GET') return next();
  const rule = RULES.find((r) => r.re.test(req.path) && (r.action !== 'TENANT_DELETE' || req.method === 'DELETE'));
  if (!rule) return next();
  const targetId = req.path.match(rule.re)![1];
  let target: Awaited<ReturnType<typeof resolveTenant>> = null;
  try {
    target = await resolveTenant(rule.type, targetId);
  } catch {
    /* ignore */
  }
  res.on('finish', () => {
    if (res.statusCode >= 400) return;
    const { password: _password, ...body } = (req.body || {}) as Record<string, unknown>;
    const { id: tenantId, name: tenantName, ...extra } = (target || {}) as Record<string, unknown>;
    prisma.adminAuditLog
      .create({
        data: {
          action: rule.action,
          targetType: rule.type,
          targetId,
          tenantId: (tenantId as string) || null,
          tenantName: (tenantName as string) || null,
          details: { ...extra, ...body } as Prisma.InputJsonValue,
          ip: req.ip || null,
        },
      })
      .catch((e: Error) => process.stderr.write(`[audit] ${e.message}\n`));
  });
  next();
}
