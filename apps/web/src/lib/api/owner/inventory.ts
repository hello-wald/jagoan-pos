'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AdjustStockInput,
  AdjustStockResult,
  GetMerchantStockQueryInput,
  InventorySummary,
  PaginatedMerchantStock,
} from '@jagoan-pos/contracts';
import { bffFetch } from '../bff-client';
import { buildInventoryQuery, ownerInventoryKeys } from './shared';

export { ownerInventoryKeys, buildInventoryQuery } from './shared';

export function useInventorySummary() {
  return useQuery({
    queryKey: ownerInventoryKeys.summary,
    queryFn: () => bffFetch<InventorySummary>('/inventory/summary'),
  });
}

export function useInventoryList(params: Partial<GetMerchantStockQueryInput>) {
  return useQuery({
    queryKey: ownerInventoryKeys.list(params),
    queryFn: () => bffFetch<PaginatedMerchantStock>(`/inventory${buildInventoryQuery(params)}`),
    placeholderData: keepPreviousData,
  });
}

export function useAdjustStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, ...dto }: { productId: string } & AdjustStockInput) =>
      bffFetch<AdjustStockResult>(`/inventory/${productId}`, {
        method: 'PATCH',
        body: JSON.stringify(dto),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ownerInventoryKeys.all }),
  });
}
