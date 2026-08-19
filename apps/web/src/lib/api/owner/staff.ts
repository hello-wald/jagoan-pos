'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CashierListResult,
  CreateCashierInput,
  SetCashierActiveInput,
  UserSummary,
} from '@jagoan-pos/contracts';
import { bffFetch } from '../bff-client';
import { ownerStaffKeys } from './shared';

export { ownerStaffKeys } from './shared';

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
    onMutate: async ({ cashierId, isActive }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ownerStaffKeys.cashiers });

      // Snapshot previous data for rollback
      const previousData = queryClient.getQueryData<CashierListResult>(ownerStaffKeys.cashiers);

      // Optimistically update cashier in cache
      if (previousData) {
        const targetUser = previousData.data.find((u) => u.id === cashierId);
        const wasActive = targetUser?.isActive ?? !isActive;

        queryClient.setQueryData<CashierListResult>(ownerStaffKeys.cashiers, {
          ...previousData,
          data: previousData.data.map((user) =>
            user.id === cashierId ? { ...user, isActive } : user,
          ),
          summary: {
            ...previousData.summary,
            active: Math.max(0, previousData.summary.active + (isActive ? 1 : wasActive ? -1 : 0)),
            inactive: Math.max(
              0,
              previousData.summary.inactive + (!isActive ? 1 : !wasActive ? -1 : 0),
            ),
          },
        });
      }

      return { previousData };
    },
    onError: (_err, _variables, context) => {
      // Rollback to snapshot on failure
      if (context?.previousData) {
        queryClient.setQueryData(ownerStaffKeys.cashiers, context.previousData);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ownerStaffKeys.all });
    },
  });
}
