import { z } from 'zod';

const BUSINESS_CATEGORIES = [
  'CLOTHING', 'SHOES', 'PERFUMES', 'COSMETICS', 'HIJABS_ABAYAS',
  'JEWELRY', 'BAGS', 'ELECTRONICS', 'HOUSE_PRODUCTS', 'KITCHEN_PRODUCTS',
  'DECORATION', 'MINI_MARKET', 'WHOLESALE', 'MIXED_SHOP',
  'CAKES', 'FOOD_BUSINESS', 'FOOD_DELIVERY', 'HOME_COOKING',
  'WHATSAPP_SELLER', 'MADE_TO_ORDER',
  'DIGITAL_MARKETING', 'FREELANCER', 'AGENCY', 'CONSULTANT',
  'DESIGNER', 'DEVELOPER', 'SOCIAL_MEDIA', 'PRINTING', 'BUSINESS_SERVICES',
  'OTHER',
] as const;

export const createProductSchema = z.object({
  name: z.string().min(1, 'Nom du produit requis'),
  description: z.string().optional(),
  image: z.string().optional(),
  categoryId: z.string().uuid().optional().nullable(),
  businessType: z.enum(BUSINESS_CATEGORIES),
  costPrice: z.number().min(0).default(0),
  sellingPrice: z.number().min(0).default(0),
  totalStock: z.number().int().min(0).default(0),
  lowStockAlert: z.number().int().min(0).default(5),
  barcode: z.string().optional().nullable(),
  sku: z.string().optional().nullable(),
  adaptiveFields: z.any().optional(),
  isService: z.boolean().default(false),
  duration: z.string().optional().nullable(),
  recurringType: z.string().optional().nullable(),
  recurringPrice: z.number().min(0).optional().nullable(),
});

export const updateProductSchema = createProductSchema.partial();

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
