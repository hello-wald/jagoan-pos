'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  Category,
  CategoryWithUsage,
  CreateCategoryInput,
  UpdateCategoryInput,
} from '@jagoan-pos/contracts';
import { bffFetch } from './bff-client';
import { productKeys } from './products.shared';
import {
  buildCategoryQuery,
  categoryKeys,
  type CategoryListParams,
} from './categories.shared';

export { categoryKeys, buildCategoryQuery } from './categories.shared';
export type { CategoryListParams } from './categories.shared';

export function useCategoryList(params: CategoryListParams = {}) {
  return useQuery({
    queryKey: categoryKeys.list(params),
    queryFn: () =>
      bffFetch<CategoryWithUsage[]>(`/admin/categories${buildCategoryQuery(params)}`),
    // The taxonomy changes far less often than the products filed under it.
    staleTime: 60_000,
  });
}

export function useCreateCategory() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateCategoryInput) =>
      bffFetch<Category>('/admin/categories', { method: 'POST', body: JSON.stringify(dto) }),
    onSuccess: () => invalidateCatalog(client),
  });
}

export function useUpdateCategory() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateCategoryInput }) =>
      bffFetch<Category>(`/admin/categories/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(dto),
      }),
    onSuccess: () => invalidateCatalog(client),
  });
}

export function useSetCategoryActive() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      bffFetch<Category>(`/admin/categories/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive }),
      }),
    onSuccess: () => invalidateCatalog(client),
  });
}

/**
 * Product rows carry their category's name inline, so a category write leaves
 * every cached product list stale as well.
 */
function invalidateCatalog(client: ReturnType<typeof useQueryClient>): void {
  void client.invalidateQueries({ queryKey: categoryKeys.all });
  void client.invalidateQueries({ queryKey: productKeys.all });
}
