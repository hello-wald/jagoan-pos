import { Coins, Package, Receipt, ShoppingBag } from '@phosphor-icons/react';
import { formatIdr } from '@/lib/format/currency';
import { MetricCard } from '../metric-card';

export type DashboardMetricsProps = {
  totalRevenue: number;
  totalTransactions: number;
  averageBasket: number;
  totalUnits: number;
  revenueGrowthText?: string;
  revenueGrowthTone?: 'default' | 'success' | 'danger';
  isToday?: boolean;
};

export function DashboardMetrics({
  totalRevenue,
  totalTransactions,
  averageBasket,
  totalUnits,
  revenueGrowthText,
  revenueGrowthTone = 'default',
  isToday = false,
}: DashboardMetricsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <MetricCard
        label="Total Pendapatan"
        value={formatIdr(totalRevenue)}
        description={
          revenueGrowthText ?? (isToday ? 'Hari ini' : `${totalTransactions} transaksi`)
        }
        tone={revenueGrowthTone}
        icon={Coins}
      />

      <MetricCard
        label="Total Transaksi"
        value={`${totalTransactions} transaksi`}
        description={isToday ? 'Hari ini' : 'Pada periode terpilih'}
        icon={Receipt}
      />

      <MetricCard
        label="Rata-rata Keranjang"
        value={formatIdr(averageBasket)}
        description="Omzet per transaksi"
        icon={ShoppingBag}
      />

      <MetricCard
        label="Unit Terjual"
        value={`${totalUnits} produk`}
        description="Total item keluar"
        icon={Package}
      />
    </div>
  );
}
