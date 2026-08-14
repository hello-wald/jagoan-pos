"use client";

import React from "react";
import Link from "next/link";
import { Store, User, Mail, Lock, Eye, EyeOff, UserPlus, AlertCircle, ArrowRight, CheckCircle2 } from "lucide-react";
import { PublicLayout } from "@/components/layouts/public-layout";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuthRegister } from "@/hooks/use-auth-register";

export default function RegisterPage() {
  const {
    formData,
    errors,
    serverError,
    isLoading,
    showPassword,
    handleChange,
    togglePasswordVisibility,
    handleSubmit,
  } = useAuthRegister();

  return (
    <PublicLayout>
      <div className="w-full max-w-lg mx-auto my-auto py-6 animate-scale-up">
        <Card className="border border-slate-200/90 shadow-elevated bg-white">
          <CardHeader className="text-center pb-6">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 mb-3 shadow-sm">
              <UserPlus className="w-6 h-6" />
            </div>
            <CardTitle className="text-2xl font-bold text-slate-900">
              Daftar Toko & Merchant Baru
            </CardTitle>
            <CardDescription className="text-slate-500 text-sm mt-1">
              Buat akun toko Anda untuk mulai mencatat transaksi kasir dan analitik penjualan
            </CardDescription>
          </CardHeader>

          <CardContent>
            {serverError && (
              <div className="mb-5 p-3.5 rounded-xl bg-danger-light border border-danger/20 flex items-start gap-3 text-sm text-danger-dark animate-fade-in">
                <AlertCircle className="w-5 h-5 flex-shrink-0 text-danger mt-0.5" />
                <span className="font-medium">{serverError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Nama Toko (Merchant)"
                  type="text"
                  placeholder="Contoh: Toko Kopi Sejahtera"
                  value={formData.merchantName}
                  onChange={(e) => handleChange("merchantName", e.target.value)}
                  error={errors.merchantName}
                  leftIcon={<Store className="w-4 h-4" />}
                  required
                />

                <Input
                  label="Nama Lengkap Pemilik"
                  type="text"
                  placeholder="Contoh: Budi Santoso"
                  value={formData.fullName}
                  onChange={(e) => handleChange("fullName", e.target.value)}
                  error={errors.fullName}
                  leftIcon={<User className="w-4 h-4" />}
                  required
                />
              </div>

              <Input
                label="Email Toko / Akun"
                type="email"
                placeholder="nama@tokomu.com"
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                error={errors.email}
                leftIcon={<Mail className="w-4 h-4" />}
                autoComplete="email"
                required
              />

              <Input
                label="Password Akun"
                type={showPassword ? "text" : "password"}
                placeholder="Minimal 8 karakter (maks 28)"
                value={formData.password}
                onChange={(e) => handleChange("password", e.target.value)}
                error={errors.password}
                helperText="Kombinasikan huruf dan angka untuk keamanan optimal"
                leftIcon={<Lock className="w-4 h-4" />}
                rightIcon={
                  <button
                    type="button"
                    onClick={togglePasswordVisibility}
                    className="focus:outline-none hover:text-slate-700 transition"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                }
                autoComplete="new-password"
                required
              />

              <div className="pt-3">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full font-bold shadow-md shadow-primary/20"
                  isLoading={isLoading}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Daftarkan Toko Saya
                </Button>
              </div>
            </form>
          </CardContent>

          <CardFooter className="flex flex-col gap-3 text-center bg-slate-50/70 -mx-6 -mb-6 p-5 rounded-b-2xl border-t border-slate-100">
            <p className="text-sm text-slate-600">
              Sudah memiliki akun toko?{" "}
              <Link
                href="/login"
                className="font-semibold text-primary hover:text-primary-hover hover:underline transition"
              >
                Masuk ke Akun Anda
              </Link>
            </p>

            <div className="pt-3 border-t border-slate-200/80 w-full flex items-center justify-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Registrasi Cepat
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Otomatis Aktif
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Aman Terenkripsi
              </span>
            </div>
          </CardFooter>
        </Card>
      </div>
    </PublicLayout>
  );
}
