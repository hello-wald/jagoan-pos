'use client';

import { useState } from 'react';
import type { RevenuePoint } from '@jagoan-pos/contracts';
import { formatIdr } from '@/lib/format/currency';

export type SalesTrendChartProps = {
  points: RevenuePoint[];
  comparisonPoints?: RevenuePoint[] | null;
  height?: number;
};

export function SalesTrendChart({
  points,
  comparisonPoints,
  height = 200,
}: SalesTrendChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!points || points.length === 0) {
    return (
      <div
        style={{ height }}
        className="flex items-center justify-center rounded-panel border border-dashed border-line text-xs text-ink-2"
      >
        Belum ada data penjualan pada periode ini
      </div>
    );
  }

  // Calculate scaling
  const allValues = [
    ...points.map((p) => p.revenue),
    ...(comparisonPoints?.map((p) => p.revenue) ?? []),
  ];
  const maxValue = Math.max(...allValues, 1000);

  // SVG dimensions
  const svgWidth = 600;
  const svgHeight = height;
  const paddingX = 24;
  const paddingTop = 20;
  const paddingBottom = 28;
  const chartWidth = svgWidth - paddingX * 2;
  const chartHeight = svgHeight - paddingTop - paddingBottom;

  const getX = (index: number, total: number) => {
    if (total <= 1) return paddingX + chartWidth / 2;
    return paddingX + (index / (total - 1)) * chartWidth;
  };

  const getY = (value: number) => {
    const ratio = value / maxValue;
    return paddingTop + chartHeight - ratio * chartHeight;
  };

  // Build path for main series
  const mainPointsCoords = points.map((p, i) => ({
    x: getX(i, points.length),
    y: getY(p.revenue),
    data: p,
  }));

  const mainPathD = mainPointsCoords.reduce(
    (acc, curr, i) => (i === 0 ? `M ${curr.x} ${curr.y}` : `${acc} L ${curr.x} ${curr.y}`),
    '',
  );

  const areaPathD =
    points.length > 1
      ? `${mainPathD} L ${mainPointsCoords[mainPointsCoords.length - 1].x} ${
          paddingTop + chartHeight
        } L ${mainPointsCoords[0].x} ${paddingTop + chartHeight} Z`
      : '';

  // Build path for comparison series
  let comparisonPathD = '';
  if (comparisonPoints && comparisonPoints.length > 0) {
    const compCoords = comparisonPoints.map((p, i) => ({
      x: getX(i, comparisonPoints.length),
      y: getY(p.revenue),
    }));
    comparisonPathD = compCoords.reduce(
      (acc, curr, i) => (i === 0 ? `M ${curr.x} ${curr.y}` : `${acc} L ${curr.x} ${curr.y}`),
      '',
    );
  }

  const activePoint = hoveredIndex !== null ? points[hoveredIndex] : null;

  return (
    <div className="flex flex-col gap-3">
      {/* Tooltip / Active Info */}
      <div className="flex min-h-6 items-center justify-between text-xs">
        {activePoint ? (
          <div className="flex items-center gap-2">
            <span className="font-medium text-ink">{activePoint.day}:</span>
            <span className="font-semibold text-accent">{formatIdr(activePoint.revenue)}</span>
            <span className="text-ink-2">({activePoint.transactions} transaksi)</span>
          </div>
        ) : (
          <span className="text-ink-2">Arahkan kursor ke grafik untuk detail harian</span>
        )}

        {comparisonPoints ? (
          <div className="flex items-center gap-3 text-[11px] text-ink-2">
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-accent" /> Periode Ini
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-ink-2/40" /> Periode Lalu
            </span>
          </div>
        ) : null}
      </div>

      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full overflow-visible"
          style={{ height }}
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="revenue-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-accent, #E8AF25)" stopOpacity="0.25" />
              <stop offset="100%" stopColor="var(--color-accent, #E8AF25)" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line
            x1={paddingX}
            y1={paddingTop + chartHeight}
            x2={svgWidth - paddingX}
            y2={paddingTop + chartHeight}
            stroke="var(--color-line, #E7E7E4)"
            strokeWidth="1"
          />
          <line
            x1={paddingX}
            y1={paddingTop + chartHeight / 2}
            x2={svgWidth - paddingX}
            y2={paddingTop + chartHeight / 2}
            stroke="var(--color-line, #E7E7E4)"
            strokeWidth="1"
            strokeDasharray="4 4"
          />

          {/* Comparison Area / Line */}
          {comparisonPathD ? (
            <path
              d={comparisonPathD}
              fill="none"
              stroke="var(--color-ink-2, #55555E)"
              strokeWidth="2"
              strokeDasharray="4 4"
              opacity="0.5"
            />
          ) : null}

          {/* Main Area */}
          {areaPathD ? <path d={areaPathD} fill="url(#revenue-gradient)" /> : null}

          {/* Main Line */}
          <path
            d={mainPathD}
            fill="none"
            stroke="var(--color-accent-deep, #A06207)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Interactive dots */}
          {mainPointsCoords.map((coord, i) => (
            <g key={i}>
              <circle
                cx={coord.x}
                cy={coord.y}
                r={hoveredIndex === i ? 5 : 3.5}
                className="cursor-pointer transition-all"
                fill="var(--color-surface, #FFFFFF)"
                stroke="var(--color-accent-deep, #A06207)"
                strokeWidth={hoveredIndex === i ? 2.5 : 2}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              />
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}
