import { describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { type ReactNode } from 'react';
import {
  buildCashierTransactionsQuery,
  useCashierCheckout,
  useCashierTransaction,
  useCashierTransactions,
} from './transactions';
import * as bffClient from '../bff-client';

vi.mock('../bff-client');

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('Cashier Transactions API', () => {
  it('builds cashier transactions query correctly', () => {
    expect(
      buildCashierTransactionsQuery({
        page: 1,
        limit: 10,
        search: 'TRX-001',
        startDate: '2026-08-20',
      }),
    ).toBe('?page=1&limit=10&search=TRX-001&startDate=2026-08-20');
  });

  it('maps checkout input to the active backend contract', async () => {
    const mockSale = {
      id: 'sale-1',
      merchantId: 'merch-1',
      merchantName: 'Toko Kopi',
      cashierId: 'cashier-1',
      cashierName: 'Budi Kasir',
      transactionNumber: 'TRX-20260820-001',
      status: 'COMPLETED' as const,
      totalQuantity: 2,
      totalAmount: 36000,
      cashReceived: 50000,
      changeAmount: 14000,
      createdAt: '2026-08-20T08:00:00.000Z',
      items: [],
    };

    vi.spyOn(bffClient, 'bffFetch').mockResolvedValueOnce(mockSale);

    const { result } = renderHook(() => useCashierCheckout(), { wrapper: createWrapper() });

    const checkoutPayload = {
      idempotencyKey: 'idem-123',
      cashReceived: 50000,
      items: [{ productId: 'prod-1', quantity: 2 }],
    };

    await result.current.mutateAsync(checkoutPayload);

    expect(bffClient.bffFetch).toHaveBeenCalledWith('/transactions/checkout', {
      method: 'POST',
      body: JSON.stringify(checkoutPayload),
    });
  });

  it('fetches cashier transaction history via bffFetch', async () => {
    const mockPaginated = {
      data: [],
      meta: { total: 0, page: 1, limit: 10, totalPages: 1 },
    };

    vi.spyOn(bffClient, 'bffFetch').mockResolvedValueOnce(mockPaginated);

    const { result } = renderHook(() => useCashierTransactions({ page: 1, limit: 10 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(bffClient.bffFetch).toHaveBeenCalledWith('/transactions?page=1&limit=10');
    expect(result.current.data).toEqual(mockPaginated);
  });

  it('fetches single transaction detail for receipt modal', async () => {
    const mockSale = {
      id: 'sale-1',
      transactionNumber: 'TRX-001',
    };

    vi.spyOn(bffClient, 'bffFetch').mockResolvedValueOnce(mockSale);

    const { result } = renderHook(() => useCashierTransaction('sale-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(bffClient.bffFetch).toHaveBeenCalledWith('/transactions/sale-1');
  });
});
