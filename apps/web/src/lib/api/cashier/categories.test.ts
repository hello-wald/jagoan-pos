import { describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { type ReactNode } from 'react';
import { useCashierCategoryList } from './categories';
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

describe('useCashierCategoryList', () => {
  it('fetches active categories through the cashier catalog route', async () => {
    const categories = [{ id: 'cat-1', name: 'Minuman', isActive: true, productCount: 3 }];
    vi.spyOn(bffClient, 'bffFetch').mockResolvedValueOnce(categories);

    const { result } = renderHook(() => useCashierCategoryList(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(bffClient.bffFetch).toHaveBeenCalledWith('/categories');
    expect(result.current.data).toEqual(categories);
  });
});
