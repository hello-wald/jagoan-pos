"use client";

import React from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  Package,
  Edit2,
  Eye,
  Filter,
  RefreshCw,
  Tag,
} from "lucide-react";
import { AdminLayout } from "@/components/layouts/admin-layout";
import { DataTable, type ColumnDef } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatRupiah, formatDateIndo } from "@/lib/utils";
import { useAdminProducts } from "@/hooks/use-admin-products";
import { type Product } from "@/types/product";

export default function AdminProductsPage() {
  const {
    products,
    totalCount,
    isLoading,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    toggleProductStatus,
    refresh,
  } = useAdminProducts();

  const columns: ColumnDef<Product>[] = [
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
          <p className="font-bold text-slate-900 text-sm">{row.name}</p>
          <p className="text-[11px] text-slate-400">
            Ditambahkan: {formatDateIndo(row.createdAt)}
          </p>
        </div>
      ),
    },
    {
      header: "Harga Global",
      cell: (row) => (
        <span className="font-bold text-slate-900 text-sm">
          {formatRupiah(row.price)}
        </span>
      ),
    },
    {
      header: "Status",
      cell: (row) => (
        <Badge variant={row.isActive ? "success" : "danger"} size="sm">
          {row.isActive ? "Aktif" : "Nonaktif"}
        </Badge>
      ),
    },
    {
      header: "Aksi & Kontrol",
      className: "text-right",
      headerClassName: "text-right",
      cell: (row) => (
        <div className="flex items-center justify-end gap-2">
          {/* Quick Toggle */}
          <button
            type="button"
            onClick={() => toggleProductStatus(row.id, row.isActive)}
            className="text-xs px-2 py-1 rounded border border-slate-200 hover:bg-slate-100 text-slate-600 transition"
            title={row.isActive ? "Nonaktifkan produk" : "Aktifkan produk"}
          >
            {row.isActive ? "Nonaktifkan" : "Aktifkan"}
          </button>

          {/* Detail Link */}
          <Link href={`/admin/products/${row.id}`}>
            <Button variant="ghost" size="sm" className="p-1.5" title="Lihat Detail">
              <Eye className="w-4 h-4 text-slate-500" />
            </Button>
          </Link>

          {/* Edit Link */}
          <Link href={`/admin/products/${row.id}/edit`}>
            <Button variant="outline" size="sm" className="p-1.5 text-primary border-primary/30 hover:bg-primary/5" title="Edit Produk">
              <Edit2 className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      ),
    },
  ];

  return (
    <AdminLayout
      title="Katalog Produk Global"
      subtitle="Kelola master data produk, harga acuan, dan status ketersediaan di seluruh platform"
      actions={
        <Link href="/admin/products/new">
          <Button variant="primary" size="md" className="font-semibold shadow-sm" leftIcon={<Plus className="w-4 h-4" />}>
            Tambah Produk Baru
          </Button>
        </Link>
      }
    >
      <div className="space-y-6">
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
                onClick={() => setStatusFilter("ALL")}
                className={`px-3 py-1.5 rounded-lg transition ${
                  statusFilter === "ALL"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Semua ({totalCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("ACTIVE")}
                className={`px-3 py-1.5 rounded-lg transition ${
                  statusFilter === "ACTIVE"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-emerald-700"
                }`}
              >
                Aktif
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("INACTIVE")}
                className={`px-3 py-1.5 rounded-lg transition ${
                  statusFilter === "INACTIVE"
                    ? "bg-rose-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-rose-700"
                }`}
              >
                Nonaktif
              </button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={refresh}
              isLoading={isLoading}
              className="p-2 aspect-square"
              title="Refresh Data"
            >
              <RefreshCw className="w-4 h-4 text-slate-500" />
            </Button>
          </div>
        </div>

        {/* Data Table */}
        <DataTable
          columns={columns}
          data={products}
          isLoading={isLoading}
          keyExtractor={(row) => row.id}
          emptyMessage={
            searchQuery
              ? `Tidak ada produk yang cocok dengan pencarian "${searchQuery}".`
              : "Belum ada produk terdaftar dalam katalog global."
          }
          emptyIcon={<Package className="w-10 h-10 text-slate-300 mb-2" />}
        />

        {/* Footer Summary */}
        <div className="flex items-center justify-between text-xs text-slate-500 px-2">
          <span>
            Menampilkan <strong>{products.length}</strong> dari total <strong>{totalCount}</strong> produk
          </span>
          <span className="flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-primary" /> Master Harga Acuan Platform
          </span>
        </div>
      </div>
    </AdminLayout>
  );
}
