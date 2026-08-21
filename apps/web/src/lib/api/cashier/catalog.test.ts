import { describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { type ReactNode } from 'react';
import { buildCashierCatalogQuery, useCashierCatalog } from './catalog';
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

describe('Cashier Catalog API', () => {
  it('builds a cashier catalog query with activeOnly=true and server-side search', () => {
    expect(buildCashierCatalogQuery({ page: 2, limit: 40, search: 'kopi' })).toBe(
      '?page=2&limit=40&search=kopi&activeOnly=true',
    );
  });

  it('serializes categoryId while keeping the cashier active-only constraint', () => {
    expect(
      buildCashierCatalogQuery({ page: 2, limit: 12, search: 'kopi', categoryId: 'cat-1' }),
    ).toBe('?page=2&limit=12&search=kopi&categoryId=cat-1&activeOnly=true');
  });

  it('calls bffFetch with activeOnly=true forced in query params', async () => {
    const mockStock = {
      data: [
        {
          productId: 'prod-1',
          sku: 'KOP-001',
          name: 'Kopi Susu',
          imageUrl: 'https://cdn.example/kopi.png',
          currentPrice: 18000,
          stockQuantity: 20,
          isActive: true,
          updatedAt: '2026-08-20T00:00:00.000Z',
        },
      ],
      meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
    };

    vi.spyOn(bffClient, 'bffFetch').mockResolvedValueOnce(mockStock);

    const { result } = renderHook(() => useCashierCatalog({ page: 1, limit: 10, search: 'kopi' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(bffClient.bffFetch).toHaveBeenCalledWith(
      '/inventory?page=1&limit=10&search=kopi&activeOnly=true',
    );
    expect(result.current.data).toEqual(mockStock);
  });
});
