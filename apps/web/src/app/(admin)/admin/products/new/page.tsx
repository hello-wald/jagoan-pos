"use client";

import React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Package,
  PlusCircle,
  Tag,
  Hash,
  Coins,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { AdminLayout } from "@/components/layouts/admin-layout";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatRupiah } from "@/lib/utils";
import { useAdminCreateProduct } from "@/hooks/use-admin-create-product";

export default function AdminNewProductPage() {
  const {
    formData,
    errors,
    serverError,
    isLoading,
    handleChange,
    handleSubmit,
  } = useAdminCreateProduct();

  return (
    <AdminLayout
      title="Tambah Produk Baru"
      subtitle="Daftarkan master produk baru dan harga acuan ke katalog global platform"
      actions={
        <Link href="/admin/products">
          <Button variant="outline" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />}>
            Kembali ke Katalog
          </Button>
        </Link>
      }
    >
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Form Input */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border border-slate-200/90 shadow-sm bg-white">
              <CardHeader className="border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <PlusCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-bold text-slate-900">
                      Informasi Produk
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500">
                      Lengkapi data SKU, nama, dan harga produk berikut
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-6">
                {serverError && (
                  <div className="mb-5 p-3.5 rounded-xl bg-danger-light border border-danger/20 flex items-start gap-3 text-sm text-danger-dark">
                    <AlertCircle className="w-5 h-5 flex-shrink-0 text-danger mt-0.5" />
                    <span className="font-medium">{serverError}</span>
                  </div>
                )}

                <form id="create-product-form" onSubmit={handleSubmit} className="space-y-5">
                  {/* SKU Input */}
                  <Input
                    label="SKU Produk (Stock Keeping Unit)"
                    type="text"
                    placeholder="Contoh: KOP-001 / MNM-002"
                    value={formData.sku}
                    onChange={(e) => handleChange("sku", e.target.value)}
                    error={errors.sku}
                    helperText="Kode unik produk (hanya huruf besar, angka, dan strip)"
                    leftIcon={<Hash className="w-4 h-4" />}
                    required
                  />

                  {/* Name Input */}
                  <Input
                    label="Nama Produk"
                    type="text"
                    placeholder="Contoh: Kopi Arabika Gayo 250g"
                    value={formData.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    error={errors.name}
                    helperText="Nama jelas produk yang akan ditampilkan di kasir dan laporan"
                    leftIcon={<Tag className="w-4 h-4" />}
                    required
                  />

                  {/* Price Input */}
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-slate-700">
                      Harga Global Acuan (Rp)
                    </label>
                    <div className="relative rounded-lg shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 font-bold text-xs">
                        Rp
                      </div>
                      <input
                        type="number"
                        min="100"
                        step="500"
                        placeholder="Contoh: 65000"
                        value={formData.price || ""}
                        onChange={(e) => handleChange("price", e.target.value)}
                        className={`w-full rounded-lg border bg-white pl-11 pr-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition focus:outline-none focus:ring-2 ${
                          errors.price
                            ? "border-danger focus:border-danger focus:ring-danger/20"
                            : "border-slate-300 focus:border-primary focus:ring-primary/20"
                        }`}
                        required
                      />
                    </div>
                    {errors.price ? (
                      <p className="text-xs text-danger font-medium">{errors.price}</p>
                    ) : (
                      <p className="text-xs text-slate-500">
                        Harga standar: {formatRupiah(formData.price || 0)}
                      </p>
                    )}
                  </div>
                </form>
              </CardContent>

              <CardFooter className="flex items-center justify-between bg-slate-50/90 p-5 rounded-b-2xl border-t border-slate-200/80 gap-3">
                <Link href="/admin/products">
                  <button
                    type="button"
                    className="inline-flex items-center justify-center font-semibold text-sm px-5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 shadow-xs transition duration-150 active:scale-95"
                  >
                    Batal
                  </button>
                </Link>

                <Button
                  type="submit"
                  form="create-product-form"
                  variant="primary"
                  size="md"
                  className="font-bold px-6 py-2.5 rounded-xl shadow-md shadow-primary/25"
                  isLoading={isLoading}
                  leftIcon={<PlusCircle className="w-4 h-4" />}
                >
                  Simpan Produk Baru
                </Button>
              </CardFooter>
            </Card>
          </div>

          {/* Right Column: Live Preview Card */}
          <div className="space-y-6">
            <Card className="border border-indigo-100 bg-gradient-to-b from-indigo-50/40 to-white shadow-sm">
              <div className="flex items-center gap-2 mb-4 text-xs font-bold uppercase tracking-wider text-primary">
                <Sparkles className="w-4 h-4" /> Live Catalog Preview
              </div>

              <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                    {formData.sku || "SKU-XXX"}
                  </span>
                  <Badge variant="success" size="sm">
                    Aktif
                  </Badge>
                </div>

                <div>
                  <h4 className="font-bold text-slate-900 text-base leading-snug">
                    {formData.name || "Nama Produk Anda"}
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">Katalog Global App K</p>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-baseline justify-between">
                  <span className="text-xs text-slate-500 font-medium">Harga Acuan:</span>
                  <span className="text-lg font-extrabold text-primary">
                    {formatRupiah(formData.price || 0)}
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-indigo-100/80 space-y-2 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>Otomatis tersedia di inventori seluruh merchant</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>Stok awal merchant dimulai dari 0 sampai disesuaikan</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
