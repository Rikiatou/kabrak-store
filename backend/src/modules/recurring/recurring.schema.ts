import { z } from 'zod';

export const createRecurringSchema = z.object({
  amount: z.number().min(0),
  frequency: z.enum(['weekly', 'monthly', 'quarterly', 'yearly']).default('monthly'),
  nextBillingDate: z.string(),
  clientId: z.string().min(1, 'Client requis'),
  productId: z.string().optional(),
});

export const updateRecurringSchema = createRecurringSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export type CreateRecurringInput = z.infer<typeof createRecurringSchema>;
export type UpdateRecurringInput = z.infer<typeof updateRecurringSchema>;
