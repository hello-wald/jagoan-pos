'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { ListSalesQueryInput, PaginatedSales, Sale } from '@jagoan-pos/contracts';
import { bffFetch } from '../bff-client';
import { buildTransactionsQuery, ownerTransactionKeys } from './shared';

export { ownerTransactionKeys, buildTransactionsQuery } from './shared';

export function useTransactions(params: Partial<ListSalesQueryInput> = {}) {
  return useQuery({
    queryKey: ownerTransactionKeys.list(params),
    queryFn: () => bffFetch<PaginatedSales>(`/transactions${buildTransactionsQuery(params)}`),
    placeholderData: keepPreviousData,
  });
}

export function useTransaction(id: string) {
  return useQuery({
    queryKey: ownerTransactionKeys.detail(id),
    queryFn: () => bffFetch<Sale>(`/transactions/${id}`),
    enabled: Boolean(id),
  });
}
