'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CheckoutRequestInput,
  ListSalesQueryInput,
  PaginatedSales,
  Sale,
} from '@jagoan-pos/contracts';
import { bffFetch } from '../bff-client';
import {
  buildCashierTransactionsQuery,
  cashierCatalogKeys,
  cashierTransactionKeys,
} from './shared';

export { cashierTransactionKeys, buildCashierTransactionsQuery } from './shared';

export function useCashierCheckout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CheckoutRequestInput) =>
      bffFetch<Sale>('/transactions/checkout', {
        method: 'POST',
        body: JSON.stringify(dto),
      }),
    onSuccess: () => {
      // Invalidate both catalog (stock changed) and transactions history
      void queryClient.invalidateQueries({ queryKey: cashierCatalogKeys.all });
      void queryClient.invalidateQueries({ queryKey: cashierTransactionKeys.all });
    },
  });
}

export function useCashierTransactions(params: Partial<ListSalesQueryInput> = {}) {
  return useQuery({
    queryKey: cashierTransactionKeys.list(params),
    queryFn: () =>
      bffFetch<PaginatedSales>(`/transactions${buildCashierTransactionsQuery(params)}`),
    placeholderData: keepPreviousData,
  });
}

export function useCashierTransaction(id: string) {
  return useQuery({
    queryKey: cashierTransactionKeys.detail(id),
    queryFn: () => bffFetch<Sale>(`/transactions/${id}`),
    enabled: Boolean(id),
  });
}
