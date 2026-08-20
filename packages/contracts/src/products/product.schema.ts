import { z } from "zod";

import type { CategorySummary } from "./category.schema";

/**
 * Sentinel for the category filter, matching products that have no category at
 * all. A plain absent `categoryId` means "any category", so the two cases need
 * to be distinguishable on the wire.
 */
export const UNCATEGORIZED = "none";

const skuSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(
    /^[A-Za-z0-9][A-Za-z0-9._-]*$/,
    "SKU may contain only letters, numbers, dots, underscores, and hyphens",
  );

const priceSchema = z.coerce.number().int().positive().max(2_147_483_647);

export const createProductSchema = z.object({
  name: z.string().trim().min(1).max(150),
  sku: skuSchema,
  // Null clears the category on update; absent leaves it untouched.
  categoryId: z.uuid().nullable().optional(),
  price: priceSchema,
});

export const updateProductSchema = createProductSchema
  .partial()
  .refine((value) => Object.values(value).some((entry) => entry !== undefined), {
    message: "At least one product field must be provided",
  });

export const setProductActiveSchema = z.object({ isActive: z.boolean() });

export const createProductImageUploadSchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  sizeBytes: z.coerce
    .number()
    .int()
    .positive()
    .max(5 * 1024 * 1024),
});

export const productListQuerySchema = z.object({
  query: z.string().trim().min(1).max(150).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  activeOnly: z.union([z.boolean(), z.stringbool()]).optional(),
  categoryId: z.union([z.uuid(), z.literal(UNCATEGORIZED)]).optional(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type SetProductActiveInput = z.infer<typeof setProductActiveSchema>;
export type CreateProductImageUploadInput = z.infer<typeof createProductImageUploadSchema>;
export type ProductListQuery = z.infer<typeof productListQuerySchema>;

export type Product = {
  id: string;
  name: string;
  sku: string;
  categoryId: string | null;
  category: CategorySummary | null;
  price: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  images: ProductImage[];
};

export type ProductImage = {
  id: string;
  url: string;
  contentType: string;
  sizeBytes: number;
  sortOrder: number;
  createdAt: string;
};

export type ProductImageUpload = {
  imageId: string;
  uploadUrl: string;
  uploadToken: string;
  path: string;
};

export type PaginatedProducts = {
  data: Product[];
  meta: { page: number; pageSize: number; total: number };
};
