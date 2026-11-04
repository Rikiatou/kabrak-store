import { PlanType } from '@prisma/client';

// Active users (owner included) allowed per plan.
export const PLAN_USER_LIMITS: Record<PlanType, number> = {
  STORE: 1,
  SHOP: 3,
  BUSINESS: 10,
};
