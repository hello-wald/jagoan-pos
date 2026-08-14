"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { apiClient } from "@/lib/api";

export type DateRangePreset = "TODAY" | "7D" | "30D" | "MONTH_COMPARISON";

export interface DashboardMetrics {
  totalRevenue: number;
  totalTransactions: number;
  averageBasketSize: number;
  totalItemsSold: number;
  revenueGrowth: number;
  transactionGrowth: number;
}

export interface DailySalesData {
  date: string;
  dayLabel: string;
  revenue: number;
  transactions: number;
  previousRevenue?: number; // for comparison
}

export interface HourlyPeakData {
  hour: string; // e.g. "08:00", "09:00"
  transactions: number;
  revenue: number;
  isPeak?: boolean;
}

export interface TopProductData {
  id: string;
  sku: string;
  name: string;
  soldQty: number;
  totalRevenue: number;
}

export interface CashierPerformanceData {
  id: string;
  name: string;
  email: string;
  transactionsCount: number;
  totalRevenue: number;
  averagePerTransaction: number;
}

const MOCK_DAILY_SALES: Record<DateRangePreset, DailySalesData[]> = {
  TODAY: [
    { date: "2026-08-11", dayLabel: "08:00 - 12:00", revenue: 1850000, transactions: 16 },
    { date: "2026-08-11", dayLabel: "12:00 - 16:00", revenue: 2900000, transactions: 24 },
    { date: "2026-08-11", dayLabel: "16:00 - 20:00", revenue: 3800000, transactions: 32 },
    { date: "2026-08-11", dayLabel: "20:00 - 22:00", revenue: 1200000, transactions: 10 },
  ],
  "7D": [
    { date: "2026-08-05", dayLabel: "Rab", revenue: 3200000, transactions: 28 },
    { date: "2026-08-06", dayLabel: "Kam", revenue: 4100000, transactions: 35 },
    { date: "2026-08-07", dayLabel: "Jum", revenue: 5600000, transactions: 49 },
    { date: "2026-08-08", dayLabel: "Sab", revenue: 8400000, transactions: 72 },
    { date: "2026-08-09", dayLabel: "Min", revenue: 9200000, transactions: 80 },
    { date: "2026-08-10", dayLabel: "Sen", revenue: 3800000, transactions: 32 },
    { date: "2026-08-11", dayLabel: "Sel", revenue: 4850000, transactions: 42 },
  ],
  "30D": [
    { date: "Minggu 1", dayLabel: "Minggu 1", revenue: 26500000, transactions: 240 },
    { date: "Minggu 2", dayLabel: "Minggu 2", revenue: 31200000, transactions: 290 },
    { date: "Minggu 3", dayLabel: "Minggu 3", revenue: 34800000, transactions: 315 },
    { date: "Minggu 4", dayLabel: "Minggu 4", revenue: 39150000, transactions: 348 },
  ],
  MONTH_COMPARISON: [
    { date: "Minggu 1", dayLabel: "Minggu 1", revenue: 28500000, previousRevenue: 24000000, transactions: 260 },
    { date: "Minggu 2", dayLabel: "Minggu 2", revenue: 33400000, previousRevenue: 29500000, transactions: 310 },
    { date: "Minggu 3", dayLabel: "Minggu 3", revenue: 36800000, previousRevenue: 32000000, transactions: 330 },
    { date: "Minggu 4", dayLabel: "Minggu 4", revenue: 42500000, previousRevenue: 35000000, transactions: 380 },
  ],
};

const MOCK_HOURLY_PEAKS: HourlyPeakData[] = [
  { hour: "08:00", transactions: 6, revenue: 350000 },
  { hour: "09:00", transactions: 12, revenue: 780000 },
  { hour: "10:00", transactions: 18, revenue: 1250000 },
  { hour: "11:00", transactions: 28, revenue: 2100000 },
  { hour: "12:00", transactions: 45, revenue: 4300000, isPeak: true },
  { hour: "13:00", transactions: 38, revenue: 3600000, isPeak: true },
  { hour: "14:00", transactions: 22, revenue: 1850000 },
  { hour: "15:00", transactions: 20, revenue: 1600000 },
  { hour: "16:00", transactions: 25, revenue: 2050000 },
  { hour: "17:00", transactions: 34, revenue: 2900000 },
  { hour: "18:00", transactions: 42, revenue: 3950000, isPeak: true },
  { hour: "19:00", transactions: 49, revenue: 4750000, isPeak: true },
  { hour: "20:00", transactions: 31, revenue: 2700000 },
  { hour: "21:00", transactions: 15, revenue: 1100000 },
];

const MOCK_TOP_PRODUCTS: TopProductData[] = [
  { id: "1", sku: "KOP-001", name: "Kopi Arabika Gayo 250g", soldQty: 148, totalRevenue: 9620000 },
  { id: "2", sku: "KOP-002", name: "Kopi Robusta Lampung 250g", soldQty: 112, totalRevenue: 5040000 },
  { id: "3", sku: "SNK-001", name: "Keripik Singkong Balado 150g", soldQty: 95, totalRevenue: 1710000 },
  { id: "4", sku: "MNM-001", name: "Susu UHT Full Cream 1L", soldQty: 84, totalRevenue: 1848000 },
  { id: "5", sku: "SNK-002", name: "Kue Nastar Premium Toples", soldQty: 42, totalRevenue: 3570000 },
];

const MOCK_CASHIERS: CashierPerformanceData[] = [
  { id: "c1", name: "Rina Wijaya", email: "rina@tokoberkah.com", transactionsCount: 184, totalRevenue: 16800000, averagePerTransaction: 91304 },
  { id: "c2", name: "Deni Saputra", email: "deni@tokoberkah.com", transactionsCount: 154, totalRevenue: 13950000, averagePerTransaction: 90584 },
  { id: "c3", name: "Siti Rahma", email: "siti@tokoberkah.com", transactionsCount: 120, totalRevenue: 8400000, averagePerTransaction: 70000 },
];

export function useOwnerDashboard() {
  const [dateRange, setDateRange] = useState<DateRangePreset>("7D");
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      await apiClient(`/analytics/dashboard?range=${dateRange}`).catch(() => null);
    } catch {
      // Fallback
    } finally {
      setIsLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const dailySales = useMemo(() => {
    return MOCK_DAILY_SALES[dateRange] || MOCK_DAILY_SALES["7D"];
  }, [dateRange]);

  const metrics: DashboardMetrics = useMemo(() => {
    const totalRev = dailySales.reduce((acc, curr) => acc + curr.revenue, 0);
    const totalTx = dailySales.reduce((acc, curr) => acc + curr.transactions, 0);
    const avgBasket = totalTx > 0 ? Math.round(totalRev / totalTx) : 0;
    const itemsSold = Math.round(totalTx * 2.4);

    return {
      totalRevenue: totalRev,
      totalTransactions: totalTx,
      averageBasketSize: avgBasket,
      totalItemsSold: itemsSold,
      revenueGrowth: 18.6,
      transactionGrowth: 11.4,
    };
  }, [dailySales]);

  const maxDailyRevenue = useMemo(() => {
    return Math.max(...dailySales.map((d) => Math.max(d.revenue, d.previousRevenue || 0)), 1);
  }, [dailySales]);

  const maxHourlyTransactions = useMemo(() => {
    return Math.max(...MOCK_HOURLY_PEAKS.map((h) => h.transactions), 1);
  }, []);

  return {
    dateRange,
    setDateRange,
    isLoading,
    metrics,
    dailySales,
    maxDailyRevenue,
    hourlyPeaks: MOCK_HOURLY_PEAKS,
    maxHourlyTransactions,
    topProducts: MOCK_TOP_PRODUCTS,
    cashiers: MOCK_CASHIERS,
    refresh: fetchDashboardData,
  };
}
