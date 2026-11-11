import { PlanType, Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';

type Db = Prisma.TransactionClient | typeof prisma;

/** An owner's boutiques: their own tenant first, then the boutiques linked to it. */
export async function groupTenants(homeTenantId: string) {
  return prisma.tenant.findMany({
    where: { OR: [{ id: homeTenantId }, { parentTenantId: homeTenantId }] },
    orderBy: { createdAt: 'asc' },
  });
}

export async function isInGroup(homeTenantId: string, tenantId: string): Promise<boolean> {
  if (tenantId === homeTenantId) return true;
  const t = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { parentTenantId: true } });
  return t?.parentTenantId === homeTenantId;
}

/** The boutique included in BUSINESS runs on its parent's subscription. */
export async function billingTenantId(tenantId: string, db: Db = prisma): Promise<string> {
  const t = await db.tenant.findUnique({ where: { id: tenantId }, select: { parentTenantId: true, includedInParent: true } });
  return t?.includedInParent && t.parentTenantId ? t.parentTenantId : tenantId;
}

/** Keeps the included boutique on the same plan as its parent. */
export async function syncIncludedBranches(parentTenantId: string, plan: PlanType, db: Db = prisma) {
  await db.tenant.updateMany({ where: { parentTenantId, includedInParent: true }, data: { plan } });
}
