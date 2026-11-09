import { PaymentMethod } from '@prisma/client';
import { z } from 'zod';

export const createOrderSchema = z.object({
  clientId: z.string().uuid().optional().nullable(),
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().min(1),
    unitPrice: z.number().min(0),
    variant: z.string().optional(),
    pack: z.boolean().optional(),
  })).min(1, 'Au moins un article requis'),
  discount: z.number().min(0).default(0),
  // Initial payment for invoice (optional)
  paymentMethod: z.enum(['CASH', 'MOBILE_MONEY', 'ORANGE_MONEY', 'MTN_MOMO', 'BANK_TRANSFER', 'OTHER']).default('CASH'),
  amountPaid: z.number().min(0).default(0),
  paymentReference: z.string().optional(),
  paymentNotes: z.string().optional(),
  notes: z.string().optional(),
  sellerId: z.string().uuid().optional().nullable(),
  offlineId: z.string().uuid().optional(),
  dueDate: z.string().datetime().optional().nullable(),
  createdAt: z.string().datetime().optional(),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'DELIVERING', 'DELIVERED', 'CANCELLED']),
});

export const returnItemsSchema = z.object({
  items: z.array(z.object({ itemId: z.string().uuid(), quantity: z.number().int().min(1) })).min(1).max(50),
  method: z.nativeEnum(PaymentMethod).default('CASH'),
  note: z.string().trim().max(200).optional(),
});

export type ReturnItemsInput = z.infer<typeof returnItemsSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
