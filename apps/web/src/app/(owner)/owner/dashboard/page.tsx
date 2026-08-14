"use client";

import React from "react";
import Link from "next/link";
import {
  DollarSign,
  ShoppingCart,
  ShoppingBag,
  Package,
  TrendingUp,
  Clock,
  Award,
  Users,
  Bot,
  Calendar,
  Sparkles,
  RefreshCw,
  ArrowUpRight,
} from "lucide-react";
import { OwnerLayout } from "@/components/layouts/owner-layout";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { DataTable, type ColumnDef } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatRupiah } from "@/lib/utils";
import {
  useOwnerDashboard,
  type DateRangePreset,
  type TopProductData,
  type CashierPerformanceData,
} from "@/hooks/use-owner-dashboard";
import { SalesTrendChart } from "@/components/dashboard/sales-trend-chart";

export default function OwnerDashboardPage() {
  const {
    dateRange,
    setDateRange,
    isLoading,
    metrics,
    dailySales,
    maxDailyRevenue,
    hourlyPeaks,
    maxHourlyTransactions,
    topProducts,
    cashiers,
    refresh,
  } = useOwnerDashboard();

  const topProductColumns: ColumnDef<TopProductData>[] = [
    {
      header: "Peringkat & Produk",
      cell: (row, idx) => (
        <div className="flex items-center gap-3">
          <span
            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
              idx === 0
                ? "bg-amber-100 text-amber-800"
                : idx === 1
                ? "bg-slate-200 text-slate-700"
                : idx === 2
                ? "bg-amber-50 text-amber-700"
                : "bg-slate-100 text-slate-500"
            }`}
          >
            {idx + 1}
          </span>
          <div>
            <p className="font-bold text-slate-900 text-sm">{row.name}</p>
            <p className="font-mono text-[11px] text-slate-400">{row.sku}</p>
          </div>
        </div>
      ),
    },
    {
      header: "Qty Terjual",
      className: "text-right",
      headerClassName: "text-right",
      cell: (row) => (
        <span className="font-bold text-slate-900 text-sm">
          {row.soldQty} pcs
        </span>
      ),
    },
    {
      header: "Total Omzet",
      className: "text-right",
      headerClassName: "text-right",
      cell: (row) => (
        <span className="font-bold text-emerald-700 text-sm">
          {formatRupiah(row.totalRevenue)}
        </span>
      ),
    },
  ];

  const cashierColumns: ColumnDef<CashierPerformanceData>[] = [
    {
      header: "Nama Kasir",
      cell: (row) => (
        <div>
          <p className="font-bold text-slate-900 text-sm">{row.name}</p>
          <p className="text-[11px] text-slate-400">{row.email}</p>
        </div>
      ),
    },
    {
      header: "Transaksi",
      className: "text-center",
      headerClassName: "text-center",
      cell: (row) => (
        <Badge variant="info" size="sm">
          {row.transactionsCount} Tx
        </Badge>
      ),
    },
    {
      header: "Total Omzet Diproses",
      className: "text-right",
      headerClassName: "text-right",
      cell: (row) => (
        <span className="font-bold text-slate-900 text-sm">
          {formatRupiah(row.totalRevenue)}
        </span>
      ),
    },
  ];

  return (
    <OwnerLayout
      title="Dashboard Analitik & Laporan"
      subtitle="Pantau pertumbuhan omzet bisnis, tren jam sibuk, dan performa tim kasir"
      actions={
        <div className="flex flex-wrap items-center gap-3">
          {/* Date Presets */}
          <div className="flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200 text-xs font-semibold overflow-x-auto">
            {(
              [
                { label: "Hari Ini", value: "TODAY" },
                { label: "7 Hari Terakhir", value: "7D" },
                { label: "30 Hari", value: "30D" },
                { label: "Bulan Ini vs Lalu", value: "MONTH_COMPARISON" },
              ] as { label: string; value: DateRangePreset }[]
            ).map((preset) => (
              <button
                key={preset.value}
                type="button"
                onClick={() => setDateRange(preset.value)}
                className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
                  dateRange === preset.value
                    ? "bg-white text-emerald-800 shadow-xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Unified Emerald AI Insight CTA Button */}
          <Link href="/owner/ai-insight">
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-md shadow-emerald-600/20 transition duration-150 active:scale-95"
            >
              <Bot className="w-4 h-4" />
              <span>Tanya AI Insight</span>
            </button>
          </Link>
        </div>
      }
    >
      <div className="space-y-8">
        {/* KPI Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <StatCard
            title="Total Omzet Penjualan"
            value={formatRupiah(metrics.totalRevenue)}
            icon={<DollarSign className="w-6 h-6" />}
            iconBg="bg-emerald-50 text-emerald-600"
            trend={{ value: metrics.revenueGrowth, label: "vs periode lalu" }}
          />

          <StatCard
            title="Total Transaksi Selesai"
            value={`${metrics.totalTransactions} Transaksi`}
            icon={<ShoppingCart className="w-6 h-6" />}
            iconBg="bg-emerald-50 text-emerald-600"
            trend={{ value: metrics.transactionGrowth, label: "vs periode lalu" }}
          />

          <StatCard
            title="Rata-rata Transaksi (Basket)"
            value={formatRupiah(metrics.averageBasketSize)}
            icon={<ShoppingBag className="w-6 h-6" />}
            iconBg="bg-amber-50 text-amber-600"
            description="Nilai belanja rata-rata per pelanggan"
          />

          <StatCard
            title="Total Produk Terjual"
            value={`${metrics.totalItemsSold} Pcs`}
            icon={<Package className="w-6 h-6" />}
            iconBg="bg-slate-100 text-slate-700"
            description="Akumulasi item fisik yang keluar"
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart 1: Tren Penjualan Harian (Interactive Line & Area Chart) */}
          <Card className="lg:col-span-2 border border-border shadow-card bg-white p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                  Tren Penjualan Harian
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Grafik analitik omzet penjualan berdasarkan rentang waktu terpilih
                </p>
              </div>
              <Badge variant="success" size="sm">
                ClickHouse OLAP
              </Badge>
            </div>

            {/* SVG Interactive Line Chart */}
            <div className="pt-2">
              <SalesTrendChart
                data={dailySales}
                maxRevenue={maxDailyRevenue}
                isComparison={dateRange === "MONTH_COMPARISON"}
              />
            </div>
          </Card>

          {/* Chart 2: Distribusi Jam Sibuk (Peak Hours) */}
          <Card className="border border-border shadow-card bg-white p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-500" />
                  Jam Sibuk Kasir
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Waktu transaksi paling padat
                </p>
              </div>
            </div>

            <div className="space-y-3 pt-2 max-h-64 overflow-y-auto pr-1">
              {hourlyPeaks
                .filter((_, idx) => idx % 2 === 0 || _?.isPeak)
                .map((hourData, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className="text-slate-700 font-bold flex items-center gap-1.5">
                        {hourData.hour}
                        {hourData.isPeak && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-extrabold bg-amber-100 text-amber-800">
                            PEAK
                          </span>
                        )}
                      </span>
                      <span className="text-slate-500 font-semibold">
                        {hourData.transactions} Tx ({formatRupiah(hourData.revenue)})
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                      <div
                        style={{
                          width: `${(hourData.transactions / maxHourlyTransactions) * 100}%`,
                        }}
                        className={`h-full rounded-full transition-all duration-300 ${
                          hourData.isPeak ? "bg-amber-500" : "bg-emerald-500"
                        }`}
                      />
                    </div>
                  </div>
                ))}
            </div>
          </Card>
        </div>

        {/* Tables Row: Top Products & Cashier Performance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Top 5 Products */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-500" />
                <h3 className="text-lg font-bold text-slate-900">
                  Top 5 Produk Terlaris
                </h3>
              </div>
              <Link href="/owner/inventory">
                <span className="text-xs font-semibold text-emerald-700 hover:underline flex items-center gap-1">
                  Lihat Stok Inventori <ArrowUpRight className="w-3.5 h-3.5" />
                </span>
              </Link>
            </div>

            <DataTable
              columns={topProductColumns}
              data={topProducts}
              isLoading={isLoading}
              keyExtractor={(row) => row.id}
            />
          </div>

          {/* Cashier Performance */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-600" />
                <h3 className="text-lg font-bold text-slate-900">
                  Performa Staf Kasir
                </h3>
              </div>
              <Link href="/owner/staff">
                <span className="text-xs font-semibold text-emerald-700 hover:underline flex items-center gap-1">
                  Kelola Akun Kasir <ArrowUpRight className="w-3.5 h-3.5" />
                </span>
              </Link>
            </div>

            <DataTable
              columns={cashierColumns}
              data={cashiers}
              isLoading={isLoading}
              keyExtractor={(row) => row.id}
            />
          </div>
        </div>
      </div>
    </OwnerLayout>
  );
}
