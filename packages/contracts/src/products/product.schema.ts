import { z } from 'zod';

const skuSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(
    /^[A-Za-z0-9][A-Za-z0-9._-]*$/,
    'SKU may contain only letters, numbers, dots, underscores, and hyphens',
  );

const priceSchema = z.coerce.number().int().positive().max(2_147_483_647);

export const createProductSchema = z.object({
  name: z.string().trim().min(1).max(150),
  sku: skuSchema,
  category: z.string().trim().min(1).max(80).optional(),
  price: priceSchema,
});

export const updateProductSchema = createProductSchema
  .partial()
  .refine((value) => Object.values(value).some((entry) => entry !== undefined), {
    message: 'At least one product field must be provided',
  });

export const setProductActiveSchema = z.object({ isActive: z.boolean() });

export const productListQuerySchema = z.object({
  query: z.string().trim().min(1).max(150).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  activeOnly: z.union([z.boolean(), z.stringbool()]).optional(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type SetProductActiveInput = z.infer<typeof setProductActiveSchema>;
export type ProductListQuery = z.infer<typeof productListQuerySchema>;

export type Product = {
  id: string;
  name: string;
  sku: string;
  category: string | null;
  price: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type PaginatedProducts = {
  data: Product[];
  meta: { page: number; pageSize: number; total: number };
};
