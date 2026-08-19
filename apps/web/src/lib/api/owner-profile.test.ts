import { describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { type ReactNode } from 'react';
import { useCurrentUser } from './owner-profile';
import * as bffClient from './bff-client';

vi.mock('./bff-client');

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

describe('useCurrentUser hook', () => {
  it('calls bffFetch with /auth/me and returns user data', async () => {
    const mockUser = {
      id: 'usr-1',
      merchantId: 'merch-1',
      merchantName: 'Toko Jagoan',
      fullName: 'Budi Jagoan',
      email: 'budi@jagoan.com',
      role: 'OWNER' as const,
      isActive: true,
    };

    vi.spyOn(bffClient, 'bffFetch').mockResolvedValueOnce(mockUser);

    const { result } = renderHook(() => useCurrentUser(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(bffClient.bffFetch).toHaveBeenCalledWith('/auth/me');
    expect(result.current.data).toEqual(mockUser);
  });
});
