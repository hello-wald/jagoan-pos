"use client";

import React from "react";
import Link from "next/link";
import { ShieldAlert, ArrowLeft, LogOut, Home, UserCheck } from "lucide-react";
import { PublicLayout } from "@/components/layouts/public-layout";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/auth-context";
import { ROLE_REDIRECT_MAP, ROLE_LABELS } from "@/lib/constants";

export default function UnauthorizedPage() {
  const { user, role, isAuthenticated, logout } = useAuth();

  const targetDashboardRoute = role ? ROLE_REDIRECT_MAP[role] : "/login";
  const roleLabel = role ? ROLE_LABELS[role] : "Tamu (Belum Login)";

  return (
    <PublicLayout showNavButtons={false}>
      <div className="w-full max-w-lg mx-auto my-auto py-8 animate-scale-up">
        <Card className="border border-rose-200/90 shadow-elevated bg-white">
          <CardHeader className="text-center pb-6">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600 mb-4 border border-rose-100 shadow-sm">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <div className="flex justify-center mb-2">
              <Badge variant="danger" size="md">
                Error 403 • Akses Terbatas
              </Badge>
            </div>
            <CardTitle className="text-2xl font-bold text-slate-900">
              Hak Akses Dibatasi
            </CardTitle>
            <CardDescription className="text-slate-600 text-sm mt-1 max-w-sm mx-auto">
              Akun Anda tidak memiliki izin untuk membuka halaman ini. Sistem membatasi fitur berdasarkan peran yang telah ditentukan.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {isAuthenticated && user ? (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-left space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                  <span>Informasi Akun Saat Ini:</span>
                  <span className="flex items-center gap-1 text-slate-700">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-600" /> Terautentikasi
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-sm font-semibold text-slate-900 truncate">
                    {user.email || "Pengguna Terdaftar"}
                  </span>
                  <Badge variant="info" size="sm">
                    Peran: {roleLabel}
                  </Badge>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500">
                Anda belum masuk ke sistem. Silakan masuk dengan akun yang memiliki hak akses.
              </div>
            )}

            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              {isAuthenticated && role ? (
                <Link href={targetDashboardRoute} className="flex-1">
                  <Button variant="primary" size="md" className="w-full font-semibold" leftIcon={<Home className="w-4 h-4" />}>
                    Kembali ke Halaman Peran Saya
                  </Button>
                </Link>
              ) : (
                <Link href="/login" className="flex-1">
                  <Button variant="primary" size="md" className="w-full font-semibold" leftIcon={<ArrowLeft className="w-4 h-4" />}>
                    Masuk ke Akun
                  </Button>
                </Link>
              )}

              {isAuthenticated && (
                <Button
                  variant="outline"
                  size="md"
                  onClick={logout}
                  className="text-slate-700 hover:bg-slate-50 border-slate-300"
                  leftIcon={<LogOut className="w-4 h-4 text-rose-500" />}
                >
                  Keluar / Ganti Akun
                </Button>
              )}
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-2 text-center bg-slate-50/70 -mx-6 -mb-6 p-4 rounded-b-2xl border-t border-slate-100">
            <p className="text-xs text-slate-500">
              Butuh bantuan akses? Hubungi administrator sistem toko Anda.
            </p>
          </CardFooter>
        </Card>
      </div>
    </PublicLayout>
  );
}
