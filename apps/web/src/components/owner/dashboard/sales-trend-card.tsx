import { TrendUp } from '@phosphor-icons/react';
import type { HourlyPoint, RevenuePoint } from '@jagoan-pos/contracts';
import type { OwnerDatePreset } from '@/lib/api/owner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SalesTrendChart } from './sales-trend-chart';

export type SalesTrendCardProps = {
  preset: OwnerDatePreset;
  from?: string;
  to?: string;
  comparisonFrom?: string;
  comparisonTo?: string;
  points: RevenuePoint[];
  comparisonPoints?: RevenuePoint[] | null;
  hourlyPoints?: HourlyPoint[] | null;
  className?: string;
};

export function SalesTrendCard({
  preset,
  from,
  to,
  comparisonFrom,
  comparisonTo,
  points,
  comparisonPoints,
  hourlyPoints,
  className = '',
}: SalesTrendCardProps) {
  const isComparison = preset === 'MONTH_COMPARISON';

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendUp size={18} weight="bold" className="text-accent-deep" />
              Tren Pendapatan
            </CardTitle>
            <CardDescription>
              {preset === 'TODAY'
                ? 'Distribusi pendapatan per jam hari ini (24 jam)'
                : isComparison
                  ? 'Perbandingan pendapatan harian bulan ini vs bulan lalu'
                  : `Pergerakan omzet harian periode ${preset === '7D' ? '7 hari terakhir' : '30 hari terakhir'}`}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <SalesTrendChart
          preset={preset}
          from={from}
          to={to}
          comparisonFrom={comparisonFrom}
          comparisonTo={comparisonTo}
          points={points}
          comparisonPoints={comparisonPoints}
          hourlyPoints={hourlyPoints}
        />
      </CardContent>
    </Card>
  );
}
