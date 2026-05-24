import { z } from 'zod';

export const createOrderSchema = z.object({
  clientId: z.string().uuid().optional().nullable(),
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().min(1),
    unitPrice: z.number().min(0),
    variant: z.string().optional(),
  })).min(1, 'Au moins un article requis'),
  discount: z.number().min(0).default(0),
  paymentMethod: z.enum(['CASH', 'MOBILE_MONEY', 'BANK_TRANSFER', 'OTHER']).default('CASH'),
  amountPaid: z.number().min(0).default(0),
  notes: z.string().optional(),
  sellerId: z.string().uuid().optional().nullable(),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'DELIVERING', 'DELIVERED', 'CANCELLED']),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
