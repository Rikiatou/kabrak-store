import { z } from 'zod';

export const BUSINESS_CATEGORIES = [
  // Product mode — Retail
  'CLOTHING', 'SHOES', 'PERFUMES', 'COSMETICS', 'HIJABS_ABAYAS', 'FABRICS',
  'JEWELRY', 'BAGS', 'ELECTRONICS', 'HOUSE_PRODUCTS', 'KITCHEN_PRODUCTS',
  'DECORATION', 'MINI_MARKET', 'WHOLESALE', 'MIXED_SHOP',
  // Product mode — Order-based
  'CAKES', 'FOOD_BUSINESS',
  // Service mode
  'DIGITAL_MARKETING', 'FREELANCER', 'AGENCY', 'CONSULTANT',
  'DESIGNER', 'DEVELOPER', 'SOCIAL_MEDIA', 'PRINTING', 'BUSINESS_SERVICES',
  // Catch-all
  'OTHER',
] as const;

export const registerSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(6, 'Mot de passe: 6 caractères minimum'),
  firstName: z.string().min(1, 'Prénom requis'),
  lastName: z.string().min(1, 'Nom requis'),
  phone: z.string().optional(),
  storeName: z.string().min(1, 'Nom requis'),
  plan: z.enum(['STORE', 'SHOP', 'BUSINESS']).default('STORE'),
  businessMode: z.enum(['PRODUCT', 'SERVICE']).default('PRODUCT'),
  businessCategories: z.array(z.enum(BUSINESS_CATEGORIES)).min(1, 'Sélectionnez au moins une catégorie'),
  language: z.enum(['fr', 'en']).default('fr'),
});

export const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

export const updateTenantSchema = z.object({
  name: z.string().trim().min(1, 'Nom requis').optional(),
  phone: z.string().trim().optional().nullable(),
  email: z.union([z.string().trim().email(), z.literal('')]).optional().nullable(),
  address: z.string().trim().optional().nullable(),
  invoiceHeader: z.string().trim().max(300).optional().nullable(),
  invoiceColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  businessCategories: z.array(z.enum(BUSINESS_CATEGORIES)).min(1, 'Sélectionnez au moins une catégorie').optional(),
});

export type UpdateTenantInput = z.infer<typeof updateTenantSchema>;
