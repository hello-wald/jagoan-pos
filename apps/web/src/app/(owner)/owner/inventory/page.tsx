"use client";

import React from "react";
import {
  Boxes,
  Search,
  SlidersHorizontal,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Package,
  Plus,
  Minus,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { OwnerLayout } from "@/components/layouts/owner-layout";
import { DataTable, type ColumnDef } from "@/components/ui/data-table";
import { Pagination } from "@/components/ui/pagination";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatRupiah, formatDateIndo } from "@/lib/utils";
import { useOwnerInventory } from "@/hooks/use-owner-inventory";
import { type InventoryItem } from "@/types/inventory";

export default function OwnerInventoryPage() {
  const {
    items,
    summary,
    isLoading,
    searchQuery,
    setSearchQuery,
    stockFilter,
    setStockFilter,
    page,
    setPage,
    limit,
    setLimit,
    totalPages,
    totalCount,
    selectedItem,
    newStockValue,
    setNewStockValue,
    isModalOpen,
    isSaving,
    modalError,
    openAdjustModal,
    closeAdjustModal,
    handleStockDelta,
    handleSaveStock,
    refresh,
  } = useOwnerInventory();

  const columns: ColumnDef<InventoryItem>[] = [
    {
      header: "SKU Produk",
      cell: (row) => (
        <span className="font-mono text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-100 text-slate-800 border border-slate-200">
          {row.sku}
        </span>
      ),
    },
    {
      header: "Nama Produk",
      cell: (row) => (
        <div>
          <p className="font-bold text-slate-900 text-sm">{row.productName}</p>
          <p className="text-xs text-slate-400 font-medium">
            Harga: {formatRupiah(row.price)}
          </p>
        </div>
      ),
    },
    {
      header: "Stok Fisik",
      className: "text-center",
      headerClassName: "text-center",
      cell: (row) => {
        const isOut = row.stockQuantity === 0;
        const isLow = row.stockQuantity > 0 && row.stockQuantity <= 10;
        return (
          <span
            className={`inline-flex items-center justify-center font-bold font-mono px-3 py-1 rounded-full text-xs ${
              isOut
                ? "bg-rose-100 text-rose-800 border border-rose-200"
                : isLow
                ? "bg-amber-100 text-amber-800 border border-amber-200"
                : "bg-emerald-100 text-emerald-800 border border-emerald-200"
            }`}
          >
            {row.stockQuantity} pcs
          </span>
        );
      },
    },
    {
      header: "Status Ketersediaan",
      cell: (row) => {
        if (row.stockQuantity === 0) {
          return <Badge variant="danger" size="sm">Stok Habis</Badge>;
        }
        if (row.stockQuantity <= 10) {
          return <Badge variant="warning" size="sm">Stok Menipis</Badge>;
        }
        return <Badge variant="success" size="sm">Stok Aman</Badge>;
      },
    },
    {
      header: "Terakhir Diupdate",
      cell: (row) => (
        <span className="text-xs text-slate-500">
          {formatDateIndo(row.lastUpdated)}
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
            onClick={() => openAdjustModal(row)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 text-xs font-semibold shadow-xs transition duration-150 active:scale-95"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Sesuaikan Stok</span>
          </button>
        </div>
      ),
    },
  ];

  return (
    <OwnerLayout
      title="Stok & Inventori Toko"
      subtitle="Pantau jumlah fisik barang toko dan sesuaikan ketersediaan stok kasir secara real-time"
      actions={
        <Button
          variant="outline"
          size="sm"
          onClick={refresh}
          isLoading={isLoading}
          className="border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
        >
          Refresh Stok
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Quick Inventory Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-white border border-border shadow-xs">
            <p className="text-xs text-slate-500 font-semibold uppercase">Total SKU</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">{summary.totalProducts} Produk</p>
          </div>
          <div className="p-4 rounded-2xl bg-white border border-border shadow-xs">
            <p className="text-xs text-slate-500 font-semibold uppercase">Total Unit Fisik</p>
            <p className="text-2xl font-extrabold text-emerald-700 mt-1">{summary.totalStockUnits} Pcs</p>
          </div>
          <div className="p-4 rounded-2xl bg-white border border-border shadow-xs">
            <p className="text-xs text-amber-600 font-semibold uppercase">Stok Menipis (&le;10)</p>
            <p className="text-2xl font-extrabold text-amber-700 mt-1">{summary.lowStockCount} SKU</p>
          </div>
          <div className="p-4 rounded-2xl bg-white border border-border shadow-xs">
            <p className="text-xs text-rose-600 font-semibold uppercase">Stok Habis (0)</p>
            <p className="text-2xl font-extrabold text-rose-700 mt-1">{summary.outOfStockCount} SKU</p>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-border shadow-xs">
          <div className="flex-1 max-w-md">
            <Input
              placeholder="Cari berdasarkan SKU atau nama produk..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
              className="bg-slate-50 border-slate-200 text-sm"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto">
            <div className="flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setStockFilter("ALL")}
                className={`px-3 py-1.5 rounded-lg transition ${
                  stockFilter === "ALL"
                    ? "bg-white text-slate-900 shadow-xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Semua
              </button>
              <button
                type="button"
                onClick={() => setStockFilter("SAFE")}
                className={`px-3 py-1.5 rounded-lg transition ${
                  stockFilter === "SAFE"
                    ? "bg-emerald-600 text-white shadow-xs font-bold"
                    : "text-slate-600 hover:text-emerald-700"
                }`}
              >
                Aman (&gt;10)
              </button>
              <button
                type="button"
                onClick={() => setStockFilter("LOW")}
                className={`px-3 py-1.5 rounded-lg transition ${
                  stockFilter === "LOW"
                    ? "bg-amber-500 text-white shadow-xs font-bold"
                    : "text-slate-600 hover:text-amber-700"
                }`}
              >
                Menipis
              </button>
              <button
                type="button"
                onClick={() => setStockFilter("OUT")}
                className={`px-3 py-1.5 rounded-lg transition ${
                  stockFilter === "OUT"
                    ? "bg-rose-600 text-white shadow-xs font-bold"
                    : "text-slate-600 hover:text-rose-700"
                }`}
              >
                Habis
              </button>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="space-y-4">
          <DataTable
            columns={columns}
            data={items}
            isLoading={isLoading}
            keyExtractor={(row) => row.id}
            emptyMessage={
              searchQuery
                ? `Tidak ada produk inventori yang cocok dengan pencarian "${searchQuery}".`
                : "Belum ada produk dalam inventori toko Anda."
            }
            emptyIcon={<Boxes className="w-10 h-10 text-slate-300 mb-2" />}
          />

          {/* Server-side Pagination Component */}
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
            totalItems={totalCount}
            pageSize={limit}
            onPageSizeChange={(newSize) => {
              setLimit(newSize);
              setPage(1);
            }}
            pageSizeOptions={[5, 10, 20, 50]}
          />
        </div>
      </div>

      {/* Modal Penyesuaian Stok */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeAdjustModal}
        title="Penyesuaian Stok Fisik"
        description="Ubah jumlah stok barang fisik yang tersedia di toko Anda"
        maxWidth="md"
      >
        {selectedItem && (
          <form onSubmit={handleSaveStock} className="space-y-5 pt-2">
            {modalError && (
              <div className="p-3 rounded-xl bg-danger-light border border-danger/20 text-xs font-semibold text-danger-dark">
                {modalError}
              </div>
            )}

            {/* Redesigned Selected Product Banner */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50/70 via-slate-50 to-slate-50 border border-emerald-200/70 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 shadow-xs flex-shrink-0">
                    <Package className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-slate-900 text-sm leading-tight">
                      {selectedItem.productName}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-white text-slate-700 border border-slate-200 shadow-2xs">
                        {selectedItem.sku}
                      </span>
                      <span className="text-[11px] text-slate-400 font-medium">
                        &bull;
                      </span>
                      <span className="text-[11px] text-slate-600 font-semibold">
                        {formatRupiah(selectedItem.price)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Stok Saat Ini
                  </span>
                  <span
                    className={`inline-block font-mono text-sm font-extrabold px-2.5 py-0.5 rounded-lg mt-0.5 ${
                      selectedItem.stockQuantity === 0
                        ? "bg-rose-100 text-rose-800 border border-rose-200"
                        : selectedItem.stockQuantity <= 10
                        ? "bg-amber-100 text-amber-800 border border-amber-200"
                        : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                    }`}
                  >
                    {selectedItem.stockQuantity} pcs
                  </span>
                </div>
              </div>
            </div>

            {/* Stock Input & Stepper */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">
                Jumlah Stok Baru (Pcs)
              </label>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleStockDelta(-1)}
                  disabled={newStockValue <= 0}
                  className="w-11 h-11 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 flex items-center justify-center text-slate-700 font-bold disabled:opacity-40 transition shadow-xs"
                >
                  <Minus className="w-4 h-4" />
                </button>

                <input
                  type="number"
                  min="0"
                  step="1"
                  value={newStockValue}
                  onChange={(e) => setNewStockValue(Math.max(0, parseInt(e.target.value) || 0))}
                  className="flex-1 text-center font-mono text-2xl font-extrabold rounded-xl border border-slate-300 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900"
                  required
                />

                <button
                  type="button"
                  onClick={() => handleStockDelta(1)}
                  className="w-11 h-11 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 flex items-center justify-center text-slate-700 font-bold transition shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Quick Delta Buttons */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Tombol Cepat Restock
              </span>
              <div className="grid grid-cols-5 gap-2">
                {[
                  { label: "+5", delta: 5 },
                  { label: "+10", delta: 10 },
                  { label: "+50", delta: 50 },
                  { label: "+100", delta: 100 },
                  { label: "Set 0", delta: -newStockValue },
                ].map((btn, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleStockDelta(btn.delta)}
                    className="py-1.5 px-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 text-xs font-semibold text-slate-700 transition"
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={closeAdjustModal}
                className="px-5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 font-semibold text-sm shadow-xs transition"
              >
                Batal
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-600/25 transition disabled:opacity-50"
              >
                {isSaving ? "Menyimpan..." : "Simpan Stok Baru"}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </OwnerLayout>
  );
}
