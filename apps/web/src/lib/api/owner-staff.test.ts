import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useCashiers, useCreateCashier, useSetCashierActive, ownerStaffKeys } from './owner-staff';
import * as bffClient from './bff-client';
import { AppErrorCode, type CashierListResult, type UserSummary } from '@jagoan-pos/contracts';

vi.mock('./bff-client');

const initialCashiers: CashierListResult = {
  data: [
    {
      id: 'cashier-1',
      merchantId: 'merch-1',
      merchantName: 'Toko Kopi Senja',
      fullName: 'Budi Kasir',
      email: 'budi@tokokopi.com',
      role: 'CASHIER',
      isActive: true,
      createdAt: '2026-08-19T08:00:00.000Z',
      updatedAt: '2026-08-19T08:00:00.000Z',
    },
  ],
  summary: {
    total: 1,
    active: 1,
    inactive: 0,
  },
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return {
    queryClient,
    wrapper: ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children),
  };
}

describe('owner-staff API hooks', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('useCashiers fetches staff list from BFF', async () => {
    vi.spyOn(bffClient, 'bffFetch').mockResolvedValueOnce(initialCashiers);
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useCashiers(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(initialCashiers);
    expect(bffClient.bffFetch).toHaveBeenCalledWith('/staff/cashiers');
  });

  it('useCreateCashier sends POST and invalidates staff queries', async () => {
    const newCashier: UserSummary = {
      id: 'cashier-2',
      merchantId: 'merch-1',
      merchantName: 'Toko Kopi Senja',
      fullName: 'Siti Baru',
      email: 'siti@tokokopi.com',
      role: 'CASHIER',
      isActive: true,
      createdAt: '2026-08-19T09:00:00.000Z',
      updatedAt: '2026-08-19T09:00:00.000Z',
    };

    vi.spyOn(bffClient, 'bffFetch').mockResolvedValueOnce(newCashier);
    const { queryClient, wrapper } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useCreateCashier(), { wrapper });

    await result.current.mutateAsync({
      fullName: 'Siti Baru',
      email: 'siti@tokokopi.com',
      password: 'password123',
    });

    expect(bffClient.bffFetch).toHaveBeenCalledWith('/staff/cashiers', {
      method: 'POST',
      body: JSON.stringify({
        fullName: 'Siti Baru',
        email: 'siti@tokokopi.com',
        password: 'password123',
      }),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ownerStaffKeys.all });
  });

  it('useSetCashierActive performs optimistic update and rolls back on failure', async () => {
    const { queryClient, wrapper } = createWrapper();

    // Prime the cache
    queryClient.setQueryData(ownerStaffKeys.cashiers, initialCashiers);

    // Create a deferred promise to control when the mutation fails
    let rejectPromise!: (reason?: unknown) => void;
    const pendingPromise = new Promise((_, reject) => {
      rejectPromise = reject;
    });

    vi.spyOn(bffClient, 'bffFetch').mockReturnValueOnce(pendingPromise as Promise<UserSummary>);

    const { result } = renderHook(() => useSetCashierActive(), { wrapper });

    // Trigger mutation to deactivate cashier-1
    const mutatePromise = result.current.mutateAsync({
      cashierId: 'cashier-1',
      isActive: false,
    });

    // 1. Verify optimistic update happened
    await waitFor(() => {
      const optimisticData = queryClient.getQueryData<CashierListResult>(ownerStaffKeys.cashiers);
      expect(optimisticData?.data[0].isActive).toBe(false);
      expect(optimisticData?.summary.active).toBe(0);
      expect(optimisticData?.summary.inactive).toBe(1);
    });

    // 2. Reject the pending promise with plain AppError
    const appError = {
      code: AppErrorCode.INTERNAL_ERROR,
      status: 500,
      message: 'Koneksi database bermasalah',
    };
    rejectPromise(appError);

    // 3. Catch mutation error
    await expect(mutatePromise).rejects.toEqual(appError);

    // 4. Verify cache has been rolled back to initial state
    const rolledBackData = queryClient.getQueryData<CashierListResult>(ownerStaffKeys.cashiers);
    expect(rolledBackData?.data[0].isActive).toBe(true);
    expect(rolledBackData?.summary.active).toBe(1);
    expect(rolledBackData?.summary.inactive).toBe(0);
  });
});
