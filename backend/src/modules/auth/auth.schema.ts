import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(6, 'Mot de passe: 6 caractères minimum'),
  firstName: z.string().min(1, 'Prénom requis'),
  lastName: z.string().min(1, 'Nom requis'),
  phone: z.string().optional(),
  storeName: z.string().min(1, 'Nom du magasin requis'),
  plan: z.enum(['STORE', 'SHOP', 'BUSINESS']).default('STORE'),
  businessCategories: z.array(z.enum([
    'CLOTHING', 'SHOES', 'PERFUMES', 'COSMETICS', 'HIJABS_ABAYAS',
    'JEWELRY', 'BAGS', 'FOOD', 'CAKES', 'KITCHEN_PRODUCTS', 'OTHER',
  ])).min(1, 'Sélectionnez au moins une catégorie'),
  language: z.enum(['fr', 'en']).default('fr'),
});

export const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
