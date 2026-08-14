import React from "react";
import Link from "next/link";
import { Store, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PublicLayout({
  children,
  showNavButtons = true,
  variant = "default",
}: {
  children: React.ReactNode;
  showNavButtons?: boolean;
  variant?: "default" | "landing";
}) {
  const isLanding = variant === "landing";

  return (
    <div className="min-h-screen flex flex-col justify-between bg-gradient-to-b from-slate-50 to-slate-100/60">
      <header
        className={
          isLanding
            ? "sticky top-3 z-30 mx-3 rounded-2xl border border-slate-200/80 bg-white/85 shadow-[0_12px_32px_-24px_rgba(15,23,42,0.45)] backdrop-blur-xl sm:mx-6"
            : "sticky top-0 z-30 border-b border-border/70 bg-white/80 backdrop-blur-md"
        }
      >
        <div className={`mx-auto flex items-center justify-between px-4 sm:px-6 lg:px-8 ${isLanding ? "h-14 w-full max-w-[1500px]" : "h-16 max-w-7xl"}`}>
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className={`${isLanding ? "h-8 w-8 rounded-lg" : "h-10 w-10 rounded-xl"} bg-primary flex items-center justify-center text-white shadow-md shadow-primary/20 transition-transform group-hover:scale-105`}>
              <Store className={isLanding ? "h-4 w-4" : "w-5 h-5"} />
            </div>
            <div>
              <span className={`${isLanding ? "text-lg" : "text-xl"} font-extrabold text-slate-900 tracking-tight flex items-center gap-1`}>
                App <span className="text-primary">K</span>
              </span>
              <p className={`${isLanding ? "hidden" : "block"} text-[10px] font-semibold text-slate-400 -mt-1 tracking-wider uppercase`}>
                POS & Analitik Bisnis
              </p>
            </div>
          </Link>

          {isLanding && (
            <nav className="hidden items-center gap-1 text-sm font-semibold text-slate-500 md:flex" aria-label="Navigasi landing page">
              <Link href="#fitur" className="rounded-lg px-3 py-2 transition hover:bg-slate-100 hover:text-slate-900">Fitur</Link>
              <Link href="#testimoni" className="rounded-lg px-3 py-2 transition hover:bg-slate-100 hover:text-slate-900">Testimoni</Link>
            </nav>
          )}

          {showNavButtons && (
            <div className={isLanding ? "flex items-center gap-1.5" : "flex items-center gap-3"}>
              <Link href="/login">
                <Button variant="ghost" size="sm" className="font-semibold text-slate-700">
                  Masuk
                </Button>
              </Link>
              <Link href="/register">
                <Button variant="primary" size="sm" className="font-bold shadow-sm shadow-primary/20" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                  {isLanding ? "Mulai gratis" : "Daftar Toko"}
                </Button>
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className={isLanding ? "flex w-full flex-1 flex-col items-center" : "flex w-full flex-1 flex-col items-center justify-center p-4 sm:p-6 lg:p-8"}>
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-white py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            <span>&copy; {new Date().getFullYear()} App K POS & Analitik Bisnis. Hak cipta dilindungi.</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Kasir Cepat</span>
            <span>&bull;</span>
            <span>Manajemen Stok</span>
            <span>&bull;</span>
            <span>Laporan Penjualan Real-Time</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
