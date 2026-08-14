import React from "react";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export interface StatCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: {
    value: number; // e.g. 12.5 for +12.5%
    label?: string; // e.g. "vs 7 hari lalu"
  };
  description?: string;
  iconBg?: string;
  className?: string;
}

export function StatCard({
  title,
  value,
  icon,
  trend,
  description,
  iconBg = "bg-primary/10 text-primary",
  className,
}: StatCardProps) {
  const isPositive = trend && trend.value > 0;
  const isNegative = trend && trend.value < 0;
  const isNeutral = trend && trend.value === 0;

  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-white p-6 shadow-card hover:shadow-elevated transition duration-200 flex flex-col justify-between",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {title}
          </p>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1 tracking-tight">
            {value}
          </h3>
        </div>
        {icon && (
          <div
            className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center shadow-xs flex-shrink-0",
              iconBg
            )}
          >
            {icon}
          </div>
        )}
      </div>

      {(trend || description) && (
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
          {trend ? (
            <div className="flex items-center gap-1.5 font-medium">
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full font-bold text-[11px]",
                  isPositive && "bg-emerald-50 text-emerald-700",
                  isNegative && "bg-rose-50 text-rose-700",
                  isNeutral && "bg-slate-100 text-slate-600"
                )}
              >
                {isPositive && <TrendingUp className="w-3 h-3" />}
                {isNegative && <TrendingDown className="w-3 h-3" />}
                {isNeutral && <Minus className="w-3 h-3" />}
                {trend.value > 0 ? `+${trend.value}%` : `${trend.value}%`}
              </span>
              <span className="text-slate-400">
                {trend.label || "vs periode sebelumnya"}
              </span>
            </div>
          ) : (
            <span className="text-slate-400">{description}</span>
          )}
        </div>
      )}
    </div>
  );
}
