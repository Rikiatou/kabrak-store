import cron from 'node-cron';
import { prisma } from '../config/prisma';
import { generateInvoiceNumber } from '../utils/invoiceNumber';


function getNextBillingDate(current: Date, frequency: string): Date {
  const next = new Date(current);
  switch (frequency) {
    case 'weekly':
      next.setDate(next.getDate() + 7);
      break;
    case 'quarterly':
      next.setMonth(next.getMonth() + 3);
      break;
    case 'yearly':
      next.setFullYear(next.getFullYear() + 1);
      break;
    case 'monthly':
    default:
      next.setMonth(next.getMonth() + 1);
      break;
  }
  return next;
}

async function processRecurringBillings(): Promise<void> {
  const now = new Date();

  const dueItems = await prisma.recurringBilling.findMany({
    where: {
      isActive: true,
      nextBillingDate: { lte: now },
    },
    include: {
      client: { select: { id: true, name: true } },
      product: { select: { id: true, name: true, sellingPrice: true } },
      tenant: { select: { id: true, name: true } },
    },
  });

  for (const item of dueItems) {
    try {
      const ownerUser = await prisma.user.findFirst({
        where: { tenantId: item.tenantId, role: 'OWNER' },
        select: { id: true },
      });

      if (!ownerUser) continue;

      const invoice = await prisma.invoice.create({
        data: {
          invoiceNumber: await generateInvoiceNumber(item.tenantId),
          totalAmount: item.amount,
          amountPaid: 0,
          amountDue: item.amount,
          paymentStatus: 'PENDING',
          notes: `Auto-generated recurring invoice — ${item.product?.name || 'Service'}`,
          tenantId: item.tenantId,
          clientId: item.clientId,
          createdById: ownerUser.id,
          lineItems: {
            create: [{
              description: item.product?.name || 'Recurring service',
              quantity: 1,
              unitPrice: item.amount,
              totalPrice: item.amount,
              productId: item.productId || undefined,
            }],
          },
        },
      });

      await prisma.recurringBilling.update({
        where: { id: item.id },
        data: {
          nextBillingDate: getNextBillingDate(item.nextBillingDate, item.frequency),
          lastInvoiceId: invoice.id,
        },
      });

      console.log(`[CRON] Invoice ${invoice.invoiceNumber} created for ${item.client?.name} (${item.tenant.name})`);
    } catch (error) {
      console.error(`[CRON] Failed to process recurring billing ${item.id}:`, error);
    }
  }

  if (dueItems.length > 0) {
    console.log(`[CRON] Processed ${dueItems.length} recurring billing(s)`);
  }
}

export function startRecurringBillingCron(): void {
  // Run every day at 8:00 AM
  cron.schedule('0 8 * * *', () => {
    console.log('[CRON] Running recurring billing check...');
    processRecurringBillings().catch(console.error);
  });

  console.log('[CRON] Recurring billing cron scheduled (daily at 8:00 AM)');
}
