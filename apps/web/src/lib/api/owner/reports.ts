'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type {
  DashboardTotals,
  HourlySales,
  RevenueRange,
  TopProducts,
} from '@jagoan-pos/contracts';
import { bffFetch } from '../bff-client';
import {
  getMonthComparisonRanges,
  getPresetDateRange,
  ownerReportKeys,
  type OwnerDatePreset,
} from './shared';

export { ownerReportKeys, getPresetDateRange, getMonthComparisonRanges } from './shared';
export type { OwnerDatePreset } from './shared';

export function useOwnerDashboardData(preset: OwnerDatePreset = 'TODAY') {
  // Midnight rollover tracking in Asia/Jakarta (WIB)
  const [dateAnchor, setDateAnchor] = useState<Date>(() => new Date());

  useEffect(() => {
    // Check every 30 seconds if the local WIB calendar day has changed
    const interval = setInterval(() => {
      const now = new Date();
      const currentToday = getPresetDateRange('TODAY', now).from;
      const anchoredToday = getPresetDateRange('TODAY', dateAnchor).from;
      if (currentToday !== anchoredToday) {
        setDateAnchor(now);
      }
    }, 30_000);

    return () => clearInterval(interval);
  }, [dateAnchor]);

  const isComparison = preset === 'MONTH_COMPARISON';
  const comparisonRanges = isComparison ? getMonthComparisonRanges(dateAnchor) : null;
  const standardRange = !isComparison
    ? getPresetDateRange(preset, dateAnchor)
    : comparisonRanges!.current;
  const { from, to } = standardRange;

  // 1. Daily snapshot (only for TODAY)
  const dashboardQuery = useQuery({
    queryKey: ownerReportKeys.dashboard(from),
    queryFn: () => bffFetch<DashboardTotals>('/reports/dashboard'),
    enabled: preset === 'TODAY',
  });

  // 2. Revenue range for selected period
  const revenueQuery = useQuery({
    queryKey: ownerReportKeys.revenue(from, to),
    queryFn: () => bffFetch<RevenueRange>(`/reports/revenue?from=${from}&to=${to}`),
  });

  // 3. Previous revenue range (only for MONTH_COMPARISON)
  const prevFrom = comparisonRanges?.previous.from;
  const prevTo = comparisonRanges?.previous.to;
  const previousRevenueQuery = useQuery({
    queryKey: ownerReportKeys.revenue(prevFrom ?? '', prevTo ?? ''),
    queryFn: () => bffFetch<RevenueRange>(`/reports/revenue?from=${prevFrom}&to=${prevTo}`),
    enabled: isComparison && !!prevFrom && !!prevTo,
  });

  // 4. Top products
  const topProductsQuery = useQuery({
    queryKey: ownerReportKeys.topProducts({ from, to, limit: 5, direction: 'best' }),
    queryFn: () =>
      bffFetch<TopProducts>(`/reports/top-products?from=${from}&to=${to}&limit=5&direction=best`),
  });

  // 5. Hourly pattern
  const hourlyQuery = useQuery({
    queryKey: ownerReportKeys.hourly(from, to),
    queryFn: () => bffFetch<HourlySales>(`/reports/hourly?from=${from}&to=${to}`),
  });

  const isPending =
    (preset === 'TODAY' && dashboardQuery.isPending) ||
    revenueQuery.isPending ||
    (isComparison && previousRevenueQuery.isPending) ||
    topProductsQuery.isPending ||
    hourlyQuery.isPending;

  const isError =
    (preset === 'TODAY' && dashboardQuery.isError) ||
    revenueQuery.isError ||
    (isComparison && previousRevenueQuery.isError) ||
    topProductsQuery.isError ||
    hourlyQuery.isError;

  const refetch = async () => {
    await Promise.all([
      preset === 'TODAY' ? dashboardQuery.refetch() : Promise.resolve(),
      revenueQuery.refetch(),
      isComparison ? previousRevenueQuery.refetch() : Promise.resolve(),
      topProductsQuery.refetch(),
      hourlyQuery.refetch(),
    ]);
  };

  // Safe conservative asOf calculation: if any active query is missing asOf, global asOf is undefined
  const activeReports = [
    preset === 'TODAY' ? dashboardQuery.data : { asOf: 'present' },
    revenueQuery.data,
    isComparison ? previousRevenueQuery.data : { asOf: 'present' },
    topProductsQuery.data,
    hourlyQuery.data,
  ];

  let asOf: string | undefined;
  const allActiveHaveAsOf = activeReports.every((r) => r && typeof r.asOf === 'string' && r.asOf.length > 0);

  if (allActiveHaveAsOf) {
    const rawAsOfs = [
      preset === 'TODAY' ? dashboardQuery.data?.asOf : undefined,
      revenueQuery.data?.asOf,
      isComparison ? previousRevenueQuery.data?.asOf : undefined,
      topProductsQuery.data?.asOf,
      hourlyQuery.data?.asOf,
    ].filter(Boolean) as string[];

    asOf = rawAsOfs.length > 0 ? rawAsOfs.sort()[0] : undefined;
  }

  return {
    dashboard: dashboardQuery.data ?? null,
    revenue: revenueQuery.data ?? null,
    previousRevenue: previousRevenueQuery.data ?? null,
    topProducts: topProductsQuery.data ?? null,
    hourly: hourlyQuery.data ?? null,
    activeRange: standardRange,
    comparisonRanges,
    asOf,
    isPending,
    isError,
    refetch,
  };
}
