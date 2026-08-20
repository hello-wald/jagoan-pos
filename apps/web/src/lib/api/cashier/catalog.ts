'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { PaginatedMerchantStock } from '@jagoan-pos/contracts';
import { bffFetch } from '../bff-client';
import {
  buildCashierCatalogQuery,
  cashierCatalogKeys,
  type CashierCatalogQueryParams,
} from './shared';

export { cashierCatalogKeys, buildCashierCatalogQuery } from './shared';
export type { CashierCatalogQueryParams } from './shared';

export function useCashierCatalog(params: CashierCatalogQueryParams) {
  return useQuery({
    queryKey: cashierCatalogKeys.list(params),
    queryFn: () =>
      bffFetch<PaginatedMerchantStock>(`/inventory${buildCashierCatalogQuery(params)}`),
    placeholderData: keepPreviousData,
  });
}
