"use client";

import React from "react";
import {
  Receipt,
  Search,
  RefreshCw,
  Eye,
  Calendar,
  Clock,
  User,
  DollarSign,
  Printer,
  CheckCircle2,
  Store,
  CreditCard,
  Banknote,
} from "lucide-react";
import { OwnerLayout } from "@/components/layouts/owner-layout";
import { DataTable, type ColumnDef } from "@/components/ui/data-table";
import { Pagination } from "@/components/ui/pagination";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatRupiah, formatDateIndo } from "@/lib/utils";
import { useOwnerTransactions } from "@/hooks/use-owner-transactions";
import { type Transaction } from "@/types/transaction";

export default function OwnerTransactionsPage() {
  const {
    transactions,
    totalItems,
    currentPage,
    totalPages,
    pageSize,
    setCurrentPage,
    setPageSize,
    summary,
    isLoading,
    searchQuery,
    setSearchQuery,
    selectedTransaction,
    isReceiptModalOpen,
    openReceiptModal,
    closeReceiptModal,
    refresh,
  } = useOwnerTransactions();

  const columns: ColumnDef<Transaction>[] = [
    {
      header: "No. Transaksi",
      cell: (row) => (
        <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-md bg-slate-100 text-slate-800 border border-slate-200">
          {row.orderNumber}
        </span>
      ),
    },
    {
      header: "Waktu Transaksi",
      cell: (row) => (
        <span className="text-xs text-slate-600 font-medium">
          {formatDateIndo(row.createdAt)}
        </span>
      ),
    },
    {
      header: "Kasir PIC",
      cell: (row) => (
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px] flex items-center justify-center">
            {row.cashierName.charAt(0)}
          </div>
          <span className="font-semibold text-slate-800 text-xs">
            {row.cashierName}
          </span>
        </div>
      ),
    },
    {
      header: "Jumlah Item",
      className: "text-center",
      headerClassName: "text-center",
      cell: (row) => (
        <span className="text-xs font-semibold text-slate-700">
          {row.totalQuantity} Item
        </span>
      ),
    },
    {
      header: "Total Pembayaran",
      className: "text-right",
      headerClassName: "text-right",
      cell: (row) => (
        <span className="font-bold text-emerald-700 text-sm">
          {formatRupiah(row.totalAmount)}
        </span>
      ),
    },
    {
      header: "Metode",
      cell: () => (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
          <Banknote className="w-3 h-3" /> Tunai
        </span>
      ),
    },
    {
      header: "Aksi",
      className: "text-right",
      headerClassName: "text-right",
      cell: (row) => (
        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={() => openReceiptModal(row)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 text-xs font-semibold shadow-xs transition duration-150 active:scale-95"
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Lihat Struk</span>
          </button>
        </div>
      ),
    },
  ];

  return (
    <OwnerLayout
      title="Riwayat Transaksi Toko"
      subtitle="Pantau seluruh transaksi checkout kasir yang telah berhasil diproses secara tunai"
      actions={
        <Button
          variant="outline"
          size="sm"
          onClick={refresh}
          isLoading={isLoading}
          className="border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
        >
          Refresh
        </Button>
      }
    >
      <div className="space-y-6">
        {/* KPI Summary Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-card hover:shadow-elevated transition duration-200 flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Total Transaksi
              </p>
              <p className="text-3xl font-extrabold text-slate-900 tracking-tight">
                {summary.totalCount}
                <span className="text-sm font-semibold text-slate-400 ml-1.5">Tx</span>
              </p>
              <p className="text-xs text-slate-400 font-medium pt-1">
                Semua transaksi kasir tercatat
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-700 shadow-2xs">
              <Receipt className="w-6 h-6" />
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-emerald-200/80 shadow-card hover:shadow-elevated transition duration-200 flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                Total Omzet Tercatat
              </p>
              <p className="text-3xl font-extrabold text-emerald-700 tracking-tight">
                {formatRupiah(summary.totalRevenue)}
              </p>
              <p className="text-xs text-slate-400 font-medium pt-1">
                Akumulasi penerimaan tunai kasir
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-2xs">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-card hover:shadow-elevated transition duration-200 flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Rata-rata Transaksi
              </p>
              <p className="text-3xl font-extrabold text-slate-900 tracking-tight">
                {formatRupiah(summary.avgAmount)}
              </p>
              <p className="text-xs text-slate-400 font-medium pt-1">
                Rata-rata nominal per struk belanja
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-700 shadow-2xs">
              <Banknote className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-border shadow-xs">
          <div className="flex-1 max-w-md">
            <Input
              placeholder="Cari berdasarkan No. Transaksi, Kasir, atau Nama Produk..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
              className="bg-slate-50 border-slate-200 text-sm"
            />
          </div>
        </div>

        {/* Data Table */}
        <DataTable
          columns={columns}
          data={transactions}
          isLoading={isLoading}
          keyExtractor={(row) => row.id}
          emptyMessage={
            searchQuery
              ? `Tidak ada transaksi yang cocok dengan pencarian "${searchQuery}".`
              : "Belum ada riwayat transaksi penjualan di toko Anda."
          }
          emptyIcon={<Receipt className="w-10 h-10 text-slate-300 mb-2" />}
        />

        {/* Reusable Pagination with Rows-Per-Page Selector */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          pageSizeOptions={[4, 8, 15, 30]}
        />
      </div>

      {/* Modal Detail Struk Penjualan */}
      <Modal
        isOpen={isReceiptModalOpen}
        onClose={closeReceiptModal}
        title="Struk Bukti Pembayaran"
        description="Salinan digital struk transaksi penjualan kasir"
        maxWidth="md"
      >
        {selectedTransaction && (
          <div className="space-y-5 pt-2">
            {/* Paper Receipt Look */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 font-sans space-y-4">
              {/* Receipt Header */}
              <div className="text-center pb-3 border-b border-dashed border-slate-300 space-y-1">
                <div className="flex items-center justify-center gap-1.5 text-slate-900 font-extrabold text-base">
                  <Store className="w-4 h-4 text-emerald-600" />
                  <span>{selectedTransaction.merchantName || "Toko Berkah Maju"}</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Struk Pembayaran Sah Kasir POS
                </p>
                <div className="pt-2 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                  <span>{selectedTransaction.orderNumber}</span>
                  <span>{formatDateIndo(selectedTransaction.createdAt)}</span>
                </div>
                <div className="text-left text-[11px] text-slate-500 font-medium">
                  Kasir: <strong>{selectedTransaction.cashierName}</strong>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-2 py-1">
                {selectedTransaction.items.map((item, idx) => (
                  <div key={idx} className="flex items-start justify-between text-xs">
                    <div>
                      <p className="font-bold text-slate-800">{item.name}</p>
                      <p className="text-[11px] text-slate-400 font-mono">
                        {item.quantity} x {formatRupiah(item.price)}
                      </p>
                    </div>
                    <span className="font-mono font-bold text-slate-900">
                      {formatRupiah(item.subtotal)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Total & Payment Details */}
              <div className="pt-3 border-t border-dashed border-slate-300 space-y-1.5 text-xs font-mono">
                <div className="flex items-center justify-between font-bold text-sm text-slate-900">
                  <span>TOTAL TAGIHAN:</span>
                  <span className="text-emerald-700">
                    {formatRupiah(selectedTransaction.totalAmount)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>UANG TUNAI:</span>
                  <span>{formatRupiah(selectedTransaction.cashPaid)}</span>
                </div>
                <div className="flex items-center justify-between font-bold text-slate-900 pt-1 border-t border-slate-200">
                  <span>KEMBALIAN:</span>
                  <span>{formatRupiah(selectedTransaction.cashChange)}</span>
                </div>
              </div>

              {/* Footer Note */}
              <div className="pt-3 text-center text-[10px] text-slate-400 border-t border-dashed border-slate-300">
                Terima kasih atas kunjungan Anda!
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={closeReceiptModal}
                className="px-5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 font-semibold text-sm shadow-xs transition"
              >
                Tutup
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-600/25 transition active:scale-95"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Struk</span>
              </button>
            </div>
          </div>
        )}
      </Modal>
    </OwnerLayout>
  );
}
