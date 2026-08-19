'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import { Sparkle } from '@phosphor-icons/react';
import { useOwnerDashboardData, type OwnerDatePreset } from '@/lib/api/owner-reports';
import { useTransactions } from '@/lib/api/owner-transactions';
import { formatDateTimeWib } from '@/lib/format/date';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { OwnerPageHeader } from './owner-page-header';
import {
  DashboardMetrics,
  HourlyPatternCard,
  RecentTransactionsCard,
  SalesTrendCard,
  TopProductsCard,
} from './dashboard';

const PRESETS: { value: OwnerDatePreset; label: string }[] = [
  { value: 'TODAY', label: 'Hari Ini' },
  { value: '7D', label: '7 Hari' },
  { value: '30D', label: '30 Hari' },
  { value: 'MONTH_COMPARISON', label: 'Bandingkan Bulan' },
];

export function DashboardView() {
  const [preset, setPreset] = useState<OwnerDatePreset>('TODAY');

  const {
    dashboard,
    revenue,
    previousRevenue,
    topProducts,
    hourly,
    activeRange,
    comparisonRanges,
    asOf,
    isPending,
    isError,
    refetch,
  } = useOwnerDashboardData(preset);

  // Finding 4: Single source of truth for date range passed to transactions
  const {
    data: recentTransactions,
    isPending: isTxPending,
    isPlaceholderData: isTxPlaceholder,
    isError: isTxError,
    refetch: refetchTx,
  } = useTransactions({
    limit: 5,
    startDate: activeRange?.from,
    endDate: activeRange?.to,
  });

  // Compute metrics depending on preset
  const isToday = preset === 'TODAY';
  const isComparison = preset === 'MONTH_COMPARISON';

  const totalRevenue = isToday ? (dashboard?.revenue ?? 0) : (revenue?.totalRevenue ?? 0);
  const totalTransactions = isToday
    ? (dashboard?.transactions ?? 0)
    : (revenue?.totalTransactions ?? 0);
  const averageBasket = isToday ? (dashboard?.averageBasket ?? 0) : (revenue?.averageBasket ?? 0);
  const totalUnits = isToday
    ? (dashboard?.units ?? 0)
    : (revenue?.days.reduce((sum, d) => sum + d.units, 0) ?? 0);

  // Growth calculation for month comparison
  let revenueGrowthText: string | undefined;
  let revenueGrowthTone: 'default' | 'success' | 'danger' = 'default';
  if (isComparison && previousRevenue && previousRevenue.totalRevenue > 0) {
    const growth =
      ((totalRevenue - previousRevenue.totalRevenue) / previousRevenue.totalRevenue) * 100;
    const isPositive = growth >= 0;
    revenueGrowthText = `${isPositive ? '+' : ''}${growth.toFixed(1)}% vs bulan lalu`;
    revenueGrowthTone = isPositive ? 'success' : 'danger';
  }

  const formattedAsOf = formatDateTimeWib(asOf);
  const currentPresetLabel = PRESETS.find((p) => p.value === preset)?.label;

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <OwnerPageHeader
        title="Dashboard & Laporan"
        subtitle="Ringkasan performa penjualan, metrik bisnis, dan analitik toko Anda."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap items-center gap-1.5 rounded-control border border-line bg-surface p-1 shadow-xs">
              {PRESETS.map((item) => (
                <Button
                  key={item.value}
                  variant={preset === item.value ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setPreset(item.value)}
                >
                  {item.label}
                </Button>
              ))}
            </div>
            <Link
              href={'/insights' as Route}
              className="inline-flex h-9 items-center gap-1.5 rounded-control border border-line bg-surface px-3 text-[13px] font-medium text-ink-2 transition-colors hover:bg-paper hover:text-ink"
            >
              <Sparkle size={15} weight="duotone" aria-hidden="true" />
              AI Insight
            </Link>
          </div>
        }
      />

      {/* asOf lag status banner / badge */}
      {formattedAsOf ? (
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-line bg-surface/90 px-3.5 py-1 text-xs text-ink-2 shadow-2xs">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
          </span>
          <span>
            <strong className="font-semibold text-ink">Data analitik & grafik</strong> diperbarui otomatis secara berkala
          </span>
        </div>
      ) : null}

      {/* Error state */}
      {isError ? (
        <div className="flex flex-col items-start gap-3">
          <Banner tone="danger">Laporan dashboard gagal dimuat.</Banner>
          <Button variant="secondary" size="sm" onClick={() => void refetch()}>
            Coba lagi
          </Button>
        </div>
      ) : null}

      {/* Loading state */}
      {isPending && !isError ? (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <div
                key={i}
                className="flex flex-col gap-3 rounded-panel border border-line bg-surface p-5"
              >
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-8 w-40" />
                <Skeleton className="h-3 w-20" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="h-72 rounded-panel border border-line bg-surface p-5 lg:col-span-2">
              <Skeleton className="h-full w-full" />
            </div>
            <div className="h-72 rounded-panel border border-line bg-surface p-5">
              <Skeleton className="h-full w-full" />
            </div>
          </div>
        </div>
      ) : null}

      {/* Populated Content */}
      {!isPending && !isError ? (
        <>
          {/* Row 1: KPI Metrics (4 Columns) */}
          <DashboardMetrics
            totalRevenue={totalRevenue}
            totalTransactions={totalTransactions}
            averageBasket={averageBasket}
            totalUnits={totalUnits}
            revenueGrowthText={revenueGrowthText}
            revenueGrowthTone={revenueGrowthTone}
            isToday={isToday}
          />

          {/* Row 2: Sales Trend (Left 2-cols) + Top 5 Products (Right 1-col) */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <SalesTrendCard
              className="lg:col-span-2"
              preset={preset}
              from={revenue?.from}
              to={revenue?.to}
              comparisonFrom={comparisonRanges?.previous.from}
              comparisonTo={comparisonRanges?.previous.to}
              points={revenue?.days ?? []}
              comparisonPoints={previousRevenue?.days ?? null}
              hourlyPoints={hourly?.hours ?? null}
            />

            <TopProductsCard
              className="lg:col-span-1"
              topProducts={topProducts}
              isPending={isPending}
            />
          </div>

          {/* Row 3: Recent Transactions (Left 2-cols) + Hourly Pattern (Right 1-col) */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <RecentTransactionsCard
              className="lg:col-span-2"
              transactions={recentTransactions?.data}
              isPending={isTxPending || isTxPlaceholder}
              isError={isTxError}
              onRetry={() => void refetchTx()}
              presetLabel={currentPresetLabel}
            />

            <HourlyPatternCard className="lg:col-span-1" hourly={hourly} />
          </div>
        </>
      ) : null}
    </div>
  );
}
