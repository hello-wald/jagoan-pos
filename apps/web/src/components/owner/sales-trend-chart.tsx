'use client';

import { useMemo, useState } from 'react';
import type { HourlyPoint, RevenuePoint } from '@jagoan-pos/contracts';
import { formatIdr } from '@/lib/format/currency';
import type { OwnerDatePreset } from '@/lib/api/owner.shared';

export type ChartDataPoint = {
  key: string;
  dayLabel: string;
  fullDateLabel: string;
  revenue: number;
  transactions: number;
  units: number;
  previousRevenue?: number;
};

export type SalesTrendChartProps = {
  points: RevenuePoint[];
  comparisonPoints?: RevenuePoint[] | null;
  hourlyPoints?: HourlyPoint[] | null;
  from?: string;
  to?: string;
  comparisonFrom?: string;
  comparisonTo?: string;
  preset?: OwnerDatePreset;
};

function formatCompactIdr(val: number): string {
  if (val >= 1_000_000_000) return `${(val / 1_000_000_000).toFixed(1)}M`;
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}Jt`;
  if (val >= 1_000) return `${Math.round(val / 1_000)}rb`;
  return String(val);
}

function formatDayLabel(ymd: string): { short: string; full: string } {
  const [year, month, day] = ymd.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const short = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(date);
  const full = new Intl.DateTimeFormat('id-ID', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
  return { short, full };
}

function generateDateRange(fromYmd: string, toYmd: string): string[] {
  const [fy, fm, fd] = fromYmd.split('-').map(Number);
  const [ty, tm, td] = toYmd.split('-').map(Number);
  const current = new Date(Date.UTC(fy, fm - 1, fd));
  const end = new Date(Date.UTC(ty, tm - 1, td));
  const dates: string[] = [];

  while (current <= end) {
    const y = current.getUTCFullYear();
    const m = String(current.getUTCMonth() + 1).padStart(2, '0');
    const d = String(current.getUTCDate()).padStart(2, '0');
    dates.push(`${y}-${m}-${d}`);
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return dates;
}

export function SalesTrendChart({
  points,
  comparisonPoints,
  hourlyPoints,
  from,
  to,
  comparisonFrom,
  comparisonTo,
  preset,
}: SalesTrendChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Build zero-filled unified dataset with accurate day-of-month alignment
  const chartData: ChartDataPoint[] = useMemo(() => {
    // 1. If TODAY preset with hourly data available: use 24 hours
    if (preset === 'TODAY' && hourlyPoints && hourlyPoints.length > 0) {
      return hourlyPoints.map((h) => {
        const hourStr = `${String(h.hour).padStart(2, '0')}:00`;
        return {
          key: hourStr,
          dayLabel: hourStr,
          fullDateLabel: `Pukul ${hourStr} WIB`,
          revenue: h.revenue,
          transactions: h.transactions,
          units: h.units,
        };
      });
    }

    if (points.length === 0 && (!comparisonPoints || comparisonPoints.length === 0)) return [];

    // 2. Date Range Mode (7D, 30D, MONTH_COMPARISON)
    const effectiveFrom = from || (points.length > 0 ? points[0].day : '');
    const effectiveTo = to || (points.length > 0 ? points[points.length - 1].day : '');

    if (!effectiveFrom || !effectiveTo) {
      return points.map((p) => {
        const { short, full } = formatDayLabel(p.day);
        return {
          key: p.day,
          dayLabel: short,
          fullDateLabel: full,
          revenue: p.revenue,
          transactions: p.transactions,
          units: p.units,
        };
      });
    }

    const currentDates = generateDateRange(effectiveFrom, effectiveTo);
    const pointMap = new Map(points.map((p) => [p.day, p]));

    // Build comparison lookup by date or by matching day index (zero-filled)
    const isComparisonMode = preset === 'MONTH_COMPARISON' || Boolean(comparisonPoints);
    let comparisonDates: string[] = [];
    if (isComparisonMode && comparisonFrom && comparisonTo) {
      comparisonDates = generateDateRange(comparisonFrom, comparisonTo);
    }
    const compPointMap = new Map((comparisonPoints ?? []).map((p) => [p.day, p]));

    return currentDates.map((dateStr, idx) => {
      const existing = pointMap.get(dateStr);
      const { short, full } = formatDayLabel(dateStr);

      let previousRevenue: number | undefined;
      if (isComparisonMode) {
        if (comparisonDates.length > idx) {
          const compDateStr = comparisonDates[idx];
          const matchedPrev = compPointMap.get(compDateStr);
          previousRevenue = matchedPrev?.revenue ?? 0;
        } else if (comparisonPoints && comparisonPoints.length > 0) {
          const matchedByDay = comparisonPoints.find((cp) => {
            const currentDayNum = dateStr.split('-')[2];
            const cpDayNum = cp.day.split('-')[2];
            return currentDayNum === cpDayNum;
          });
          previousRevenue = matchedByDay?.revenue ?? 0;
        } else {
          previousRevenue = 0;
        }
      }

      return {
        key: dateStr,
        dayLabel: short,
        fullDateLabel: full,
        revenue: existing?.revenue ?? 0,
        transactions: existing?.transactions ?? 0,
        units: existing?.units ?? 0,
        previousRevenue,
      };
    });
  }, [points, comparisonPoints, hourlyPoints, from, to, comparisonFrom, comparisonTo, preset]);

  if (chartData.length === 0) {
    return (
      <div className="flex h-44 items-center justify-center rounded-panel border border-dashed border-line text-xs text-ink-2">
        Belum ada data penjualan pada periode ini
      </div>
    );
  }

  // Calculate scaling
  const maxRevenue = Math.max(
    ...chartData.map((d) => d.revenue),
    ...chartData.map((d) => d.previousRevenue ?? 0),
    1000,
  );

  const width = 700;
  const height = 210;
  const paddingLeft = 52;
  const paddingRight = 16;
  const paddingTop = 20;
  const paddingBottom = 30;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const getX = (idx: number) => {
    if (chartData.length <= 1) return paddingLeft + chartWidth / 2;
    return paddingLeft + (idx / (chartData.length - 1)) * chartWidth;
  };

  const getY = (val: number) => {
    const clamped = Math.max(0, Math.min(val, maxRevenue));
    return paddingTop + chartHeight - (clamped / (maxRevenue || 1)) * chartHeight;
  };

  // Build SVG Points
  const mainPoints = chartData.map((d, i) => ({ x: getX(i), y: getY(d.revenue), data: d }));

  // Smooth Bezier Curve generator
  const buildSmoothCurve = (pts: { x: number; y: number }[]) => {
    return pts.reduce((acc, p, i, arr) => {
      if (i === 0) return `M ${p.x} ${p.y}`;
      const prev = arr[i - 1];
      const cp1x = prev.x + (p.x - prev.x) / 2;
      const cp1y = prev.y;
      const cp2x = prev.x + (p.x - prev.x) / 2;
      const cp2y = p.y;
      return `${acc} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p.x} ${p.y}`;
    }, '');
  };

  const mainPathD = buildSmoothCurve(mainPoints);
  const areaD =
    mainPoints.length > 1
      ? `${mainPathD} L ${mainPoints[mainPoints.length - 1].x} ${
          paddingTop + chartHeight
        } L ${mainPoints[0].x} ${paddingTop + chartHeight} Z`
      : '';

  // Comparison path
  const hasComparison = chartData.some((d) => d.previousRevenue !== undefined);
  let prevPathD = '';
  if (hasComparison) {
    const prevPoints = chartData.map((d, i) => ({
      x: getX(i),
      y: getY(d.previousRevenue ?? 0),
    }));
    prevPathD = buildSmoothCurve(prevPoints);
  }

  // 4 Y-axis grid lines (0%, 33%, 66%, 100%)
  const gridSteps = [1, 0.66, 0.33, 0];

  // X-axis label interval
  const totalPoints = chartData.length;
  const labelInterval = totalPoints <= 7 ? 1 : totalPoints <= 14 ? 2 : totalPoints <= 24 ? 3 : 5;

  const activeItem = hoveredIdx !== null ? chartData[hoveredIdx] : null;

  return (
    <div data-testid="sales-trend-chart" className="relative w-full select-none">
      {/* Header Info & Legend */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs mb-1">
        <div className="min-h-5 flex items-center">
          {activeItem ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-ink">{activeItem.fullDateLabel}:</span>
              <span className="font-semibold text-accent-deep text-sm">
                {formatIdr(activeItem.revenue)}
              </span>
              <span className="text-ink-2">({activeItem.transactions} transaksi)</span>
              {activeItem.previousRevenue !== undefined ? (
                <span className="text-ink-2 border-l border-line pl-2 ml-1 text-[11px]">
                  Bulan lalu: <strong>{formatIdr(activeItem.previousRevenue)}</strong>
                </span>
              ) : null}
            </div>
          ) : (
            <span className="text-ink-2">Arahkan kursor ke grafik untuk detail harian</span>
          )}
        </div>

        <div className="flex items-center gap-4 text-[11px] text-ink-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-accent shadow-2xs" />
            <span className="font-medium text-ink">
              {hasComparison ? 'Bulan Ini' : 'Pendapatan'}
            </span>
          </div>
          {hasComparison ? (
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full border border-line bg-ink-2/30" />
              <span>Bulan Lalu</span>
            </div>
          ) : null}
        </div>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto overflow-visible"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="smoothAmberGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Horizontal Gridlines & Y-Axis Labels */}
        {gridSteps.map((step, idx) => {
          const y = paddingTop + (1 - step) * chartHeight;
          const labelValue = Math.round(maxRevenue * step);
          return (
            <g key={idx}>
              <line
                x1={paddingLeft}
                y1={y}
                x2={width - paddingRight}
                y2={y}
                stroke="var(--color-line)"
                strokeDasharray="4 4"
                strokeWidth="1"
              />
              <text
                x={paddingLeft - 8}
                y={y + 3.5}
                textAnchor="end"
                className="text-[10px] fill-ink-2 font-medium font-mono"
              >
                {formatCompactIdr(labelValue)}
              </text>
            </g>
          );
        })}

        {/* Comparison Line (Bulan Lalu) */}
        {hasComparison && prevPathD ? (
          <path
            d={prevPathD}
            fill="none"
            stroke="var(--color-ink-2)"
            strokeWidth="2"
            strokeDasharray="5 5"
            opacity="0.6"
            className="transition-all duration-300"
          />
        ) : null}

        {/* Area Fill for Current Revenue */}
        {areaD ? <path d={areaD} fill="url(#smoothAmberGradient)" /> : null}

        {/* Main Smooth Line for Current Revenue */}
        <path
          d={mainPathD}
          fill="none"
          stroke="var(--color-accent-deep)"
          strokeWidth="2.5"
          strokeLinecap="round"
          className="transition-all duration-300"
        />

        {/* Interactive Data Points */}
        {mainPoints.map((p, idx) => {
          const isHovered = hoveredIdx === idx;
          const hasValue = p.data.revenue > 0;
          const showLabel = idx === 0 || idx === totalPoints - 1 || idx % labelInterval === 0;

          return (
            <g
              key={idx}
              className="cursor-pointer"
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              {/* Invisible Hitbox Column for easy hovering */}
              <rect
                x={p.x - chartWidth / totalPoints / 2}
                y={paddingTop}
                width={chartWidth / totalPoints}
                height={chartHeight + paddingBottom}
                fill="transparent"
              />

              {/* Vertical Guide Line on Hover */}
              {isHovered ? (
                <line
                  x1={p.x}
                  y1={paddingTop}
                  x2={p.x}
                  y2={paddingTop + chartHeight}
                  stroke="var(--color-accent)"
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                />
              ) : null}

              {/* Point Circle (ONLY when has revenue or hovered) */}
              {(hasValue || isHovered) && (
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isHovered ? 5.5 : 3.5}
                  className={`transition-all duration-150 ${
                    isHovered
                      ? 'fill-accent-deep stroke-white stroke-2 shadow-xs'
                      : 'fill-white stroke-accent-deep stroke-2'
                  }`}
                />
              )}

              {/* X-Axis Label */}
              {showLabel ? (
                <text
                  x={p.x}
                  y={height - 6}
                  textAnchor="middle"
                  className={`text-[10px] font-medium transition-colors ${
                    isHovered ? 'fill-ink font-semibold' : 'fill-ink-2'
                  }`}
                >
                  {p.data.dayLabel}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
