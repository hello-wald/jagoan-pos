'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CreateProductInput,
  PaginatedProducts,
  Product,
  UpdateProductInput,
} from '@jagoan-pos/contracts';
import { bffFetch } from './bff-client';
import { buildListQuery, productKeys, type ProductListParams } from './products.shared';

export { productKeys, buildListQuery, totalPages } from './products.shared';
export type { ProductListParams } from './products.shared';

export function useProductList(params: ProductListParams) {
  return useQuery({
    queryKey: productKeys.list(params),
    queryFn: () => bffFetch<PaginatedProducts>(`/admin/products${buildListQuery(params)}`),
    // Keeps the table on screen between pages instead of collapsing to skeletons.
    placeholderData: keepPreviousData,
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: productKeys.detail(id),
    queryFn: () => bffFetch<Product>(`/admin/products/${id}`),
  });
}

export function useCreateProduct() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateProductInput) =>
      bffFetch<Product>('/admin/products', { method: 'POST', body: JSON.stringify(dto) }),
    onSuccess: () => client.invalidateQueries({ queryKey: productKeys.all }),
  });
}

export function useUpdateProduct(id: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (dto: UpdateProductInput) =>
      bffFetch<Product>(`/admin/products/${id}`, { method: 'PATCH', body: JSON.stringify(dto) }),
    onSuccess: () => client.invalidateQueries({ queryKey: productKeys.all }),
  });
}

export function useSetProductActive(params: ProductListParams) {
  const client = useQueryClient();
  const key = productKeys.list(params);

  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      bffFetch<Product>(`/admin/products/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive }),
      }),

    onMutate: async ({ id, isActive }) => {
      await client.cancelQueries({ queryKey: key });
      const previous = client.getQueryData<PaginatedProducts>(key);
      if (previous) {
        client.setQueryData<PaginatedProducts>(key, {
          ...previous,
          data: previous.data.map((p) => (p.id === id ? { ...p, isActive } : p)),
        });
      }
      return { previous };
    },

    onError: (_error, _vars, context) => {
      if (context?.previous) client.setQueryData(key, context.previous);
    },

    onSettled: () => client.invalidateQueries({ queryKey: productKeys.all }),
  });
}
