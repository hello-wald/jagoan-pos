"use client";

import React, { use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Edit2,
  Package,
  Calendar,
  Clock,
  Tag,
  Hash,
  Coins,
  ShieldCheck,
  Store,
  Layers,
} from "lucide-react";
import { AdminLayout } from "@/components/layouts/admin-layout";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { formatRupiah, formatDateIndo } from "@/lib/utils";
import { useAdminProductDetail } from "@/hooks/use-admin-product-detail";

export default function AdminProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const { product, isLoading, toggleStatus } = useAdminProductDetail(resolvedParams.id);

  if (isLoading || !product) {
    return (
      <AdminLayout title="Detail Produk" subtitle="Memuat data produk...">
        <div className="max-w-4xl mx-auto py-12 flex flex-col items-center justify-center text-slate-400 gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <span className="text-sm font-medium">Memuat informasi produk...</span>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title={`Detail: ${product.name}`}
      subtitle={`Master data katalog SKU: ${product.sku}`}
      actions={
        <div className="flex items-center gap-3">
          <Link href="/admin/products">
            <button
              type="button"
              className="inline-flex items-center justify-center font-semibold text-sm px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 shadow-xs transition"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Kembali
            </button>
          </Link>
          <Link href={`/admin/products/${product.id}/edit`}>
            <Button variant="primary" size="md" className="font-bold shadow-sm" leftIcon={<Edit2 className="w-4 h-4" />}>
              Edit Produk
            </Button>
          </Link>
        </div>
      }
    >
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Main Product Info Card */}
        <Card className="border border-slate-200/90 shadow-sm bg-white overflow-hidden">
          <div className="bg-gradient-to-r from-slate-50 to-indigo-50/40 p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-center text-primary">
                <Package className="w-6 h-6" />
              </div>
              <div>
                <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-md bg-slate-200/80 text-slate-800">
                  {product.sku}
                </span>
                <h2 className="text-xl font-extrabold text-slate-900 mt-1">
                  {product.name}
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Badge variant={product.isActive ? "success" : "danger"} size="md">
                {product.isActive ? "Status: Aktif" : "Status: Nonaktif"}
              </Badge>
            </div>
          </div>

          <CardContent className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Field 1: SKU */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <Hash className="w-3.5 h-3.5" /> SKU Unik (Read-Only)
                </div>
                <p className="font-mono text-base font-bold text-slate-900 pt-1">
                  {product.sku}
                </p>
              </div>

              {/* Field 2: Harga Global */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <Coins className="w-3.5 h-3.5" /> Harga Acuan Platform
                </div>
                <p className="text-xl font-extrabold text-primary pt-1">
                  {formatRupiah(product.price)}
                </p>
              </div>

              {/* Field 3: Tanggal Dibuat */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <Calendar className="w-3.5 h-3.5" /> Tanggal Didaftarkan
                </div>
                <p className="text-sm font-semibold text-slate-800 pt-1">
                  {formatDateIndo(product.createdAt)}
                </p>
              </div>

              {/* Field 4: Terakhir Diupdate */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <Clock className="w-3.5 h-3.5" /> Terakhir Diperbarui
                </div>
                <p className="text-sm font-semibold text-slate-800 pt-1">
                  {formatDateIndo(product.updatedAt)}
                </p>
              </div>
            </div>

            {/* Quick Status Toggle Box */}
            <div className="mt-6 p-4 rounded-2xl bg-white border border-border flex items-center justify-between shadow-xs">
              <div className="space-y-0.5">
                <h4 className="text-sm font-bold text-slate-900">
                  Status Ketersediaan Global
                </h4>
                <p className="text-xs text-slate-500">
                  {product.isActive
                    ? "Produk aktif dan dapat digunakan di transaksi kasir merchant."
                    : "Produk dinonaktifkan dan disembunyikan dari POS kasir."}
                </p>
              </div>

              <Switch
                checked={product.isActive}
                onCheckedChange={toggleStatus}
              />
            </div>
          </CardContent>

          <CardFooter className="bg-slate-50/80 p-5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" /> Master Data Catalog Terverifikasi
            </span>
            <Link href={`/admin/products/${product.id}/edit`}>
              <button
                type="button"
                className="font-semibold text-primary hover:underline"
              >
                Ubah Informasi Produk &rarr;
              </button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    </AdminLayout>
  );
}
