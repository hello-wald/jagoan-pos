"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShoppingCart,
  Receipt,
  Store,
  Clock,
  User,
  LogOut,
  Sparkles,
  Shield,
} from "lucide-react";
import { RoleGuard } from "@/components/auth/role-guard";
import { useAuth } from "@/context/auth-context";
import { cn } from "@/lib/utils";

export function CashierLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [timeStr, setTimeStr] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleDateString("id-ID", {
          weekday: "short",
          day: "numeric",
          month: "short",
          year: "numeric",
        }) +
          " • " +
          now.toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          }) +
          " WIB"
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    {
      name: "Kasir POS",
      href: "/cashier/checkout",
      icon: ShoppingCart,
    },
    {
      name: "Riwayat Transaksi Saya",
      href: "/cashier/transactions",
      icon: Receipt,
    },
  ];

  return (
    <RoleGuard allowedRoles={["CASHIER", "OWNER"]}>
      <div className="h-screen w-full bg-slate-100 flex flex-col overflow-hidden text-slate-800 select-none">
        {/* Top Header Bar for POS Station */}
        <header className="h-16 bg-white border-b border-border px-6 flex items-center justify-between flex-shrink-0 z-30 shadow-xs">
          {/* Brand & Store */}
          <div className="flex items-center gap-6">
            <Link href="/cashier/checkout" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-sm">
                <Store className="w-5 h-5" />
              </div>
              <div>
                <span className="font-extrabold text-slate-900 text-lg tracking-tight">
                  App <span className="text-emerald-600">K</span>
                </span>
                <p className="text-[10px] font-semibold text-emerald-700 -mt-1 tracking-wider uppercase">
                  POS Kasir Station
                </p>
              </div>
            </Link>

            {/* Navigation Tabs */}
            <nav className="hidden md:flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition",
                      isActive
                        ? "bg-white text-emerald-800 shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Center: Live Clock */}
          <div className="hidden lg:flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs font-mono font-semibold text-slate-600">
            <Clock className="w-3.5 h-3.5 text-emerald-600" />
            <span>{timeStr}</span>
          </div>

          {/* Right: Cashier PIC & Logout */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center shadow-2xs">
                {user?.fullName?.charAt(0) || "K"}
              </div>
              <div className="hidden sm:block text-right">
                <p className="text-xs font-extrabold text-slate-900 leading-tight">
                  {user?.fullName || "Kasir Toko"}
                </p>
                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                  Kasir Aktif
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={logout}
              className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 text-slate-500 transition shadow-2xs"
              title="Keluar dari Sesi Kasir"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Fullscreen Main Content */}
        <main className="flex-1 overflow-hidden">{children}</main>
      </div>
    </RoleGuard>
  );
}
