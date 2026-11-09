import { z } from 'zod';

const BUSINESS_CATEGORIES = [
  'CLOTHING', 'SHOES', 'PERFUMES', 'COSMETICS', 'HIJABS_ABAYAS', 'FABRICS',
  'JEWELRY', 'BAGS', 'ELECTRONICS', 'HOUSE_PRODUCTS', 'KITCHEN_PRODUCTS',
  'DECORATION', 'MINI_MARKET', 'WHOLESALE', 'MIXED_SHOP',
  'CAKES', 'FOOD_BUSINESS',
  'DIGITAL_MARKETING', 'FREELANCER', 'AGENCY', 'CONSULTANT',
  'DESIGNER', 'DEVELOPER', 'SOCIAL_MEDIA', 'PRINTING', 'BUSINESS_SERVICES',
  'OTHER',
] as const;

export const createProductSchema = z.object({
  name: z.string().min(1, 'Nom du produit requis'),
  description: z.string().optional(),
  image: z.string().optional(),
  images: z.array(z.string().url()).max(5).optional(),
  categoryId: z.string().uuid().optional().nullable(),
  businessType: z.enum(BUSINESS_CATEGORIES),
  costPrice: z.number().min(0).default(0),
  sellingPrice: z.number().min(0).default(0),
  totalStock: z.number().int().min(0).default(0),
  lowStockAlert: z.number().int().min(0).default(5),
  barcode: z.string().optional().nullable(),
  sku: z.string().optional().nullable(),
  adaptiveFields: z.any().optional(),
  variants: z.array(z.object({
    name: z.string().trim().min(1).max(40),
    sellingPrice: z.number().min(0),
    costPrice: z.number().min(0).default(0),
    stock: z.number().int().default(0),
    barcode: z.string().trim().max(64).optional().nullable(),
    packPrice: z.number().min(0).optional().nullable(),
  })).max(60).optional().nullable(),
  packSize: z.number().int().min(2).max(10000).optional().nullable(),
  packPrice: z.number().min(0).optional().nullable(),
  packName: z.string().trim().max(30).optional().nullable(),
  isService: z.boolean().default(false),
  duration: z.string().optional().nullable(),
  recurringType: z.string().optional().nullable(),
  recurringPrice: z.number().min(0).optional().nullable(),
});

export const updateProductSchema = createProductSchema.partial();

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
