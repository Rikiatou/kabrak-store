import { z } from 'zod';

export const createProjectSchema = z.object({
  name: z.string().min(1, 'Nom du projet requis'),
  description: z.string().optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED']).default('ACTIVE'),
  totalBudget: z.number().min(0).default(0),
  startDate: z.string().optional(),
  deadline: z.string().optional(),
  clientId: z.string().optional(),
  assignedToId: z.string().optional(),
});

export const updateProjectSchema = createProjectSchema.partial();

export const createMilestoneSchema = z.object({
  title: z.string().min(1, 'Titre requis'),
  description: z.string().optional(),
  dueDate: z.string().optional(),
  amount: z.number().min(0).default(0),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type CreateMilestoneInput = z.infer<typeof createMilestoneSchema>;
