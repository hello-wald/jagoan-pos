import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useOwnerDashboardData } from './owner-reports';
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
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useOwnerDashboardData midnight rollover', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(bffClient, 'bffFetch').mockImplementation(async (url: string) => {
      if (url.includes('/reports/dashboard')) {
        return {
          day: '2026-08-19',
          revenue: 1000000,
          transactions: 10,
          units: 20,
          averageBasket: 100000,
          asOf: '2026-08-19T10:00:00.000Z',
        };
      }
      if (url.includes('/reports/revenue')) {
        return {
          from: '2026-08-19',
          to: '2026-08-19',
          totalRevenue: 1000000,
          totalTransactions: 10,
          averageBasket: 100000,
          days: [],
          asOf: '2026-08-19T10:00:00.000Z',
        };
      }
      if (url.includes('/reports/top-products')) {
        return {
          from: '2026-08-19',
          to: '2026-08-19',
          direction: 'best',
          products: [],
          asOf: '2026-08-19T10:00:00.000Z',
        };
      }
      if (url.includes('/reports/hourly')) {
        return {
          from: '2026-08-19',
          to: '2026-08-19',
          hours: [],
          asOf: '2026-08-19T10:00:00.000Z',
        };
      }
      return {};
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('automatically rolls over activeRange and triggers new query key when midnight passes in WIB', async () => {
    // Set time to 23:59:50 WIB on Aug 19 (UTC: 16:59:50)
    vi.setSystemTime(new Date('2026-08-19T16:59:50.000Z'));

    const { result } = renderHook(() => useOwnerDashboardData('TODAY'), {
      wrapper: createWrapper(),
    });

    expect(result.current.activeRange).toEqual({
      from: '2026-08-19',
      to: '2026-08-19',
    });

    // Advance system time past midnight to 00:00:20 WIB on Aug 20 (UTC: 17:00:20)
    vi.setSystemTime(new Date('2026-08-19T17:00:20.000Z'));

    // Advance fake timer by 30 seconds to trigger interval
    await act(async () => {
      vi.advanceTimersByTime(30_000);
    });

    // The activeRange must roll over to Aug 20
    expect(result.current.activeRange).toEqual({
      from: '2026-08-20',
      to: '2026-08-20',
    });
  });
});
