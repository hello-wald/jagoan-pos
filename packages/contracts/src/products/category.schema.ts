import { z } from "zod";

const categoryNameSchema = z.string().trim().min(1).max(80);

export const createCategorySchema = z.object({
  name: categoryNameSchema,
});

export const updateCategorySchema = z.object({
  name: categoryNameSchema,
});

export const setCategoryActiveSchema = z.object({ isActive: z.boolean() });

export const categoryListQuerySchema = z.object({
  activeOnly: z.union([z.boolean(), z.stringbool()]).optional(),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type SetCategoryActiveInput = z.infer<typeof setCategoryActiveSchema>;
export type CategoryListQuery = z.infer<typeof categoryListQuerySchema>;

export type Category = {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

/** The shape embedded in a Product. Deliberately without timestamps. */
export type CategorySummary = {
  id: string;
  name: string;
  isActive: boolean;
};

/**
 * A category plus how many products point at it. The admin list needs this to
 * show the cost of deactivating a category, so it is worth the extra count.
 */
export type CategoryWithUsage = Category & { productCount: number };
