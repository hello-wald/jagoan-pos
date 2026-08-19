'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CashierListResult,
  CreateCashierInput,
  SetCashierActiveInput,
  UserSummary,
} from '@jagoan-pos/contracts';
import { bffFetch } from './bff-client';
import { ownerStaffKeys } from './owner.shared';

export { ownerStaffKeys } from './owner.shared';

export function useCashiers() {
  return useQuery({
    queryKey: ownerStaffKeys.cashiers,
    queryFn: () => bffFetch<CashierListResult>('/staff/cashiers'),
  });
}

export function useCreateCashier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateCashierInput) =>
      bffFetch<UserSummary>('/staff/cashiers', {
        method: 'POST',
        body: JSON.stringify(dto),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ownerStaffKeys.all }),
  });
}

export function useSetCashierActive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ cashierId, ...dto }: { cashierId: string } & SetCashierActiveInput) =>
      bffFetch<UserSummary>(`/staff/cashiers/${cashierId}/status`, {
        method: 'PATCH',
        body: JSON.stringify(dto),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ownerStaffKeys.all }),
  });
}
