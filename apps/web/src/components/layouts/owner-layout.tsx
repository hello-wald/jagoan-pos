"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Receipt,
  Boxes,
  Users,
  Bot,
  Store,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { RoleGuard } from "@/components/auth/role-guard";
import { useAuth } from "@/context/auth-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const OWNER_NAV_ITEMS = [
  {
    name: "Dashboard & Laporan",
    href: "/owner/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Riwayat Transaksi",
    href: "/owner/transactions",
    icon: Receipt,
  },
  {
    name: "Stok Inventori",
    href: "/owner/inventory",
    icon: Boxes,
  },
  {
    name: "Kelola Kasir",
    href: "/owner/staff",
    icon: Users,
  },
  {
    name: "AI Insight BI",
    href: "/owner/ai-insight",
    icon: Bot,
    badge: "AI",
  },
  {
    name: "Profil Toko",
    href: "/owner/profile",
    icon: Store,
  },
];

export function OwnerLayout({
  children,
  title,
  subtitle,
  actions,
}: {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <RoleGuard allowedRoles={["OWNER"]}>
      <div className="h-screen w-full bg-background flex flex-col md:flex-row overflow-hidden text-slate-800">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-border sticky top-0 z-40 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold">
              <Store className="w-4 h-4" />
            </div>
            <span className="font-bold text-slate-900">App K Merchant</span>
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-lg text-slate-600 hover:bg-slate-100"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Sidebar Container - FIXED on desktop */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 w-64 h-full bg-white border-r border-border flex flex-col justify-between transition-transform duration-200 md:static md:translate-x-0 flex-shrink-0 overflow-y-auto",
            isMobileMenuOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
          )}
        >
          {/* Sidebar Top / Brand */}
          <div>
            <div className="h-16 px-6 border-b border-border/80 flex items-center justify-between">
              <Link href="/owner/dashboard" className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-sm">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-extrabold text-slate-900 text-lg tracking-tight">
                    App <span className="text-emerald-600">K</span>
                  </span>
                  <p className="text-[10px] font-semibold text-emerald-600 -mt-1 tracking-wider uppercase">
                    Merchant Portal
                  </p>
                </div>
              </Link>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="md:hidden text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation Menu */}
            <div className="p-4 space-y-1">
              <p className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Menu Toko
              </p>
              {OWNER_NAV_ITEMS.map((item) => {
                const isActive = pathname === item.href || (item.href !== "/owner/dashboard" && pathname.startsWith(item.href));
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group",
                      isActive
                        ? "bg-emerald-600 text-white font-semibold shadow-sm shadow-emerald-600/25"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Icon
                        className={cn(
                          "w-4 h-4 transition-colors",
                          isActive ? "text-white" : "text-slate-400 group-hover:text-slate-700"
                        )}
                      />
                      <span>{item.name}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {item.badge && (
                        <span
                          className={cn(
                            "px-1.5 py-0.5 rounded text-[10px] font-bold",
                            isActive
                              ? "bg-white/20 text-white"
                              : "bg-indigo-100 text-primary"
                          )}
                        >
                          {item.badge}
                        </span>
                      )}
                      {isActive && <ChevronRight className="w-4 h-4 text-white/70" />}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Sidebar Bottom User & Logout */}
          <div className="p-4 border-t border-border/80 bg-slate-50/60">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-sm">
                O
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">
                  {user?.fullName || "Pemilik Toko"}
                </p>
                <p className="text-[11px] text-slate-500 truncate">
                  {user?.email || "owner@tokoberkah.com"}
                </p>
                <div className="mt-1">
                  <Badge variant="success" size="sm">
                    Merchant Owner
                  </Badge>
                </div>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={logout}
              className="w-full text-slate-700 hover:bg-rose-50 hover:text-danger hover:border-rose-200 transition"
              leftIcon={<LogOut className="w-3.5 h-3.5" />}
            >
              Keluar
            </Button>
          </div>
        </aside>

        {/* Mobile Backdrop */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          {/* Top Page Header */}
          {(title || actions) && (
            <header className="bg-white border-b border-border px-6 py-5 sticky top-0 z-20 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  {title && (
                    <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                      {title}
                    </h1>
                  )}
                  {subtitle && (
                    <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>
                  )}
                </div>
                {actions && <div className="flex items-center gap-3">{actions}</div>}
              </div>
            </header>
          )}

          {/* Page Body Content */}
          <div className="p-6 md:p-8 flex-1">{children}</div>
        </main>
      </div>
    </RoleGuard>
  );
}
