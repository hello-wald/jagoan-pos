"use client";

import React, { useState } from "react";
import { formatRupiah } from "@/lib/utils";
import { type DailySalesData } from "@/hooks/use-owner-dashboard";

interface SalesTrendChartProps {
  data: DailySalesData[];
  maxRevenue: number;
  isComparison?: boolean;
}

export function SalesTrendChart({
  data,
  maxRevenue,
  isComparison = false,
}: SalesTrendChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!data || data.length === 0) return null;

  const width = 700;
  const height = 240;
  const paddingLeft = 65;
  const paddingRight = 30;
  const paddingTop = 25;
  const paddingBottom = 35;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  // Grid steps (4 horizontal lines)
  const gridSteps = [1, 0.75, 0.5, 0.25, 0];

  // Helper to map data index to X coordinate
  const getX = (idx: number) => {
    if (data.length <= 1) return paddingLeft + chartWidth / 2;
    return paddingLeft + (idx / (data.length - 1)) * chartWidth;
  };

  // Helper to map revenue value to Y coordinate
  const getY = (val: number) => {
    const clamped = Math.max(0, Math.min(val, maxRevenue));
    return paddingTop + chartHeight - (clamped / (maxRevenue || 1)) * chartHeight;
  };

  // Build SVG Path for Current Revenue
  const points = data.map((d, i) => ({ x: getX(i), y: getY(d.revenue) }));
  const pathD = points.reduce((acc, p, i, arr) => {
    if (i === 0) return `M ${p.x} ${p.y}`;
    const prev = arr[i - 1];
    const cp1x = prev.x + (p.x - prev.x) / 2;
    const cp1y = prev.y;
    const cp2x = prev.x + (p.x - prev.x) / 2;
    const cp2y = p.y;
    return `${acc} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p.x} ${p.y}`;
  }, "");

  // Area under current revenue curve
  const areaD = `${pathD} L ${points[points.length - 1].x} ${
    paddingTop + chartHeight
  } L ${points[0].x} ${paddingTop + chartHeight} Z`;

  // Build SVG Path for Previous Revenue (Comparison Mode)
  let prevPathD = "";
  if (isComparison) {
    const prevPoints = data.map((d, i) => ({
      x: getX(i),
      y: getY(d.previousRevenue || 0),
    }));
    prevPathD = prevPoints.reduce((acc, p, i, arr) => {
      if (i === 0) return `M ${p.x} ${p.y}`;
      const prev = arr[i - 1];
      const cp1x = prev.x + (p.x - prev.x) / 2;
      const cp1y = prev.y;
      const cp2x = prev.x + (p.x - prev.x) / 2;
      const cp2y = p.y;
      return `${acc} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p.x} ${p.y}`;
    }, "");
  }

  return (
    <div className="w-full relative select-none">
      {/* Legend */}
      <div className="flex items-center justify-end gap-5 text-xs font-semibold mb-2">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-emerald-600 shadow-xs" />
          <span className="text-slate-700">
            {isComparison ? "Bulan Ini" : "Omzet Penjualan"}
          </span>
        </div>
        {isComparison && (
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-slate-400 border border-slate-300" />
            <span className="text-slate-500">Bulan Lalu</span>
          </div>
        )}
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto overflow-visible"
      >
        <defs>
          <linearGradient id="emeraldGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10B981" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
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
                stroke="#E2E8F0"
                strokeDasharray="4 4"
                strokeWidth="1"
              />
              <text
                x={paddingLeft - 10}
                y={y + 4}
                textAnchor="end"
                className="text-[10px] fill-slate-400 font-medium font-mono"
              >
                {labelValue >= 1000000
                  ? `${(labelValue / 1000000).toFixed(1)}Jt`
                  : labelValue >= 1000
                  ? `${Math.round(labelValue / 1000)}k`
                  : labelValue}
              </text>
            </g>
          );
        })}

        {/* Comparison Line (Bulan Lalu) */}
        {isComparison && prevPathD && (
          <path
            d={prevPathD}
            fill="none"
            stroke="#94A3B8"
            strokeWidth="2.5"
            strokeDasharray="6 6"
            className="transition-all duration-300"
          />
        )}

        {/* Area Fill for Current Revenue */}
        <path d={areaD} fill="url(#emeraldGradient)" />

        {/* Main Smooth Line for Current Revenue */}
        <path
          d={pathD}
          fill="none"
          stroke="#059669"
          strokeWidth="3"
          strokeLinecap="round"
          className="transition-all duration-300"
        />

        {/* Interactive Data Points */}
        {points.map((p, idx) => {
          const item = data[idx];
          const isHovered = hoveredIdx === idx;
          return (
            <g
              key={idx}
              className="cursor-pointer"
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              {/* Vertical Guide Line on Hover */}
              {isHovered && (
                <line
                  x1={p.x}
                  y1={paddingTop}
                  x2={p.x}
                  y2={paddingTop + chartHeight}
                  stroke="#10B981"
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                />
              )}

              {/* Point Circle */}
              <circle
                cx={p.x}
                cy={p.y}
                r={isHovered ? 6 : 4}
                className={`transition-all duration-150 ${
                  isHovered
                    ? "fill-emerald-600 stroke-white stroke-2 shadow"
                    : "fill-white stroke-emerald-600 stroke-2"
                }`}
              />

              {/* X-Axis Label */}
              <text
                x={p.x}
                y={height - 8}
                textAnchor="middle"
                className={`text-[11px] font-semibold transition-colors ${
                  isHovered ? "fill-emerald-700 font-bold" : "fill-slate-500"
                }`}
              >
                {item.dayLabel}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Floating Tooltip Card on Hover */}
      {hoveredIdx !== null && data[hoveredIdx] && (
        <div
          style={{
            left: `${(hoveredIdx / (data.length - 1)) * 80 + 10}%`,
          }}
          className="absolute top-2 -translate-x-1/2 p-3 bg-slate-900 text-white rounded-xl shadow-xl text-xs space-y-1 pointer-events-none z-20 transition-all border border-slate-700"
        >
          <p className="font-semibold text-slate-300 text-[11px]">
            {data[hoveredIdx].dayLabel} ({data[hoveredIdx].date})
          </p>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="font-bold text-emerald-400 text-sm">
              {formatRupiah(data[hoveredIdx].revenue)}
            </span>
          </div>
          {isComparison && data[hoveredIdx].previousRevenue && (
            <div className="flex items-center gap-2 text-slate-300 text-[11px]">
              <span className="w-2 h-2 rounded-full bg-slate-400" />
              <span>
                Bulan lalu: {formatRupiah(data[hoveredIdx].previousRevenue || 0)}
              </span>
            </div>
          )}
          <p className="text-[10px] text-slate-400 pt-0.5 border-t border-slate-800">
            {data[hoveredIdx].transactions} Transaksi Tercatat
          </p>
        </div>
      )}
    </div>
  );
}
