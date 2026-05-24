import { z } from 'zod';

export const createProductSchema = z.object({
  name: z.string().min(1, 'Nom du produit requis'),
  description: z.string().optional(),
  image: z.string().optional(),
  categoryId: z.string().uuid().optional().nullable(),
  businessType: z.enum([
    'CLOTHING', 'SHOES', 'PERFUMES', 'COSMETICS', 'HIJABS_ABAYAS',
    'JEWELRY', 'BAGS', 'FOOD', 'CAKES', 'KITCHEN_PRODUCTS', 'OTHER',
  ]),
  costPrice: z.number().min(0).default(0),
  sellingPrice: z.number().min(0).default(0),
  totalStock: z.number().int().min(0).default(0),
  lowStockAlert: z.number().int().min(0).default(5),
  barcode: z.string().optional().nullable(),
  sku: z.string().optional().nullable(),
  adaptiveFields: z.any().optional(),
});

export const updateProductSchema = createProductSchema.partial();

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
