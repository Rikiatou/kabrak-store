import { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '../config/prisma';

type Db = PrismaClient | Prisma.TransactionClient;

// FAC-YYMMDD-XXXX for French shops, INV-YYMMDD-XXXX for English ones.
export async function generateInvoiceNumber(tenantId: string, db: Db = prisma): Promise<string> {
  const tenant = await db.tenant.findUnique({ where: { id: tenantId }, select: { language: true } });
  const prefix = tenant?.language === 'en' ? 'INV' : 'FAC';
  const date = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${date}-${rand}`;
}
