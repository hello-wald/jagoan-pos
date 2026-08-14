"use client";

import React from "react";
import Link from "next/link";
import { Mail, Lock, Eye, EyeOff, LogIn, AlertCircle, ArrowRight, CheckCircle } from "lucide-react";
import { PublicLayout } from "@/components/layouts/public-layout";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuthLogin } from "@/hooks/use-auth-login";

export default function LoginPage() {
  const {
    formData,
    errors,
    serverError,
    isLoading,
    showPassword,
    handleChange,
    togglePasswordVisibility,
    handleSubmit,
  } = useAuthLogin();

  return (
    <PublicLayout>
      <div className="w-full max-w-md mx-auto my-auto py-6 animate-scale-up">
        <Card className="border border-slate-200/90 shadow-elevated bg-white">
          <CardHeader className="text-center pb-6">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-3">
              <LogIn className="w-6 h-6" />
            </div>
            <CardTitle className="text-2xl font-bold text-slate-900">
              Masuk ke Akun Anda
            </CardTitle>
            <CardDescription className="text-slate-500 text-sm mt-1">
              Akses kasir POS dan dashboard analitik toko Anda
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
              <Input
                label="Email Akun"
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
                label="Password"
                type={showPassword ? "text" : "password"}
                placeholder="Minimal 8 karakter"
                value={formData.password}
                onChange={(e) => handleChange("password", e.target.value)}
                error={errors.password}
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
                autoComplete="current-password"
                required
              />

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full font-semibold shadow-md shadow-primary/20"
                  isLoading={isLoading}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Masuk ke Sistem
                </Button>
              </div>
            </form>
          </CardContent>

          <CardFooter className="flex flex-col gap-3 text-center bg-slate-50/70 -mx-6 -mb-6 p-5 rounded-b-2xl border-t border-slate-100">
            <p className="text-sm text-slate-600">
              Belum mendaftarkan toko Anda?{" "}
              <Link
                href="/register"
                className="font-semibold text-primary hover:text-primary-hover hover:underline transition"
              >
                Daftar Merchant Baru
              </Link>
            </p>

            <div className="pt-3 border-t border-slate-200/80 w-full flex items-center justify-center gap-4 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Admin
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Owner
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Kasir
              </span>
            </div>
          </CardFooter>
        </Card>
      </div>
    </PublicLayout>
  );
}
