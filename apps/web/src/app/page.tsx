import React from "react";
import Link from "next/link";
import {
  ShoppingBag,
  Boxes,
  Users,
  Bot,
  Shield,
  ArrowRight,
  BarChart3,
  Receipt,
  Store,
  PackageSearch,
  UserRoundCog,
} from "lucide-react";
import { PublicLayout } from "@/components/layouts/public-layout";
import { LandingHero } from "@/components/landing/landing-hero";
import { LandingTestimonials } from "@/components/landing/landing-testimonials";

export default function LandingPage() {
  return (
    <PublicLayout variant="landing">
      <div className="mx-auto w-full max-w-[1500px] px-4 py-12 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
        <LandingHero />

        {/* Feature Pillars Section */}
        <section id="fitur" className="relative mt-20 scroll-mt-24 space-y-10 overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white px-6 py-12 shadow-[0_28px_80px_-58px_rgba(79,70,229,0.45)] sm:mt-28 sm:px-10 sm:py-16 lg:px-16 lg:py-20">
          <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-indigo-100/80 blur-3xl" />
          <div className="relative max-w-4xl space-y-3">
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-950 sm:text-5xl">
              Satu alur kerja untuk menjaga toko tetap bergerak.
            </h2>
            <p className="max-w-3xl text-sm leading-6 text-slate-600 sm:text-base sm:leading-7">
              Kasir menyelesaikan transaksi, stok ikut diperbarui, dan owner langsung mendapat data untuk mengambil keputusan.
            </p>
          </div>

          <div className="relative grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-12 lg:grid-rows-2">
            <article className="relative overflow-hidden rounded-[1.75rem] bg-slate-950 p-7 text-white shadow-[0_24px_60px_-32px_rgba(30,41,59,0.8)] md:p-8 lg:col-span-7 lg:row-span-2">
              <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-indigo-500/30 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-cyan-300/10 blur-3xl" />
              <div className="relative flex h-full flex-col">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-indigo-200 ring-1 ring-white/15">
                  <ShoppingBag className="h-6 w-6" />
                </span>
                <div className="mt-8 max-w-md">
                  <h3 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                    Antrean jalan terus, catatan tetap rapi.
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-slate-300 sm:text-base">
                    Cari produk, selesaikan pembayaran tunai, lalu simpan transaksi tanpa memecah fokus kasir.
                  </p>
                </div>

                <div className="mt-10 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-4 backdrop-blur-sm">
                    <Receipt className="h-4 w-4 text-indigo-200" />
                    <p className="mt-5 text-sm font-bold">Pilih pesanan</p>
                    <p className="mt-1 text-xs leading-5 text-slate-400">Produk mudah dicari saat toko ramai.</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-4 backdrop-blur-sm">
                    <ShoppingBag className="h-4 w-4 text-indigo-200" />
                    <p className="mt-5 text-sm font-bold">Terima tunai</p>
                    <p className="mt-1 text-xs leading-5 text-slate-400">Total dan kembalian dihitung di satu layar.</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-4 backdrop-blur-sm">
                    <BarChart3 className="h-4 w-4 text-indigo-200" />
                    <p className="mt-5 text-sm font-bold">Data langsung masuk</p>
                    <p className="mt-1 text-xs leading-5 text-slate-400">Setiap penjualan siap dibaca owner.</p>
                  </div>
                </div>
              </div>
            </article>

            <article className="group rounded-[1.75rem] border border-emerald-100 bg-emerald-50 p-7 transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_45px_-28px_rgba(5,150,105,0.55)] md:p-8 lg:col-span-5">
              <div className="flex items-start justify-between gap-5">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-emerald-700 shadow-sm ring-1 ring-emerald-100">
                  <Boxes className="h-6 w-6" />
                </span>
                <Users className="h-5 w-5 text-emerald-500 transition-transform duration-300 group-hover:scale-110" />
              </div>
              <h3 className="mt-8 text-xl font-extrabold tracking-tight text-slate-950 sm:text-2xl">
                Stok dan tim tidak perlu ditebak.
              </h3>
              <p className="mt-3 max-w-md text-sm leading-6 text-slate-600">
                Owner bisa menyesuaikan stok fisik dan mengatur akses kasir tanpa pindah-pindah tempat.
              </p>
            </article>

            <article className="group rounded-[1.75rem] border border-indigo-100 bg-white p-7 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_45px_-30px_rgba(79,70,229,0.4)] md:p-8 lg:col-span-5">
              <div className="flex items-start justify-between gap-5">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100">
                  <Bot className="h-6 w-6" />
                </span>
                <BarChart3 className="h-5 w-5 text-indigo-400 transition-transform duration-300 group-hover:scale-110" />
              </div>
              <h3 className="mt-8 text-xl font-extrabold tracking-tight text-slate-950 sm:text-2xl">
                Tanyakan data toko dengan bahasa biasa.
              </h3>
              <p className="mt-3 max-w-md text-sm leading-6 text-slate-600">
                Lihat tren penjualan, jam ramai, dan produk terlaris. Saat butuh konteks, lanjutkan lewat chat AI.
              </p>
            </article>
          </div>

          <div id="peran" className="relative mt-20 scroll-mt-24 border-t border-slate-200 pt-14 sm:mt-24 sm:pt-16">
            <div className="max-w-4xl space-y-3">
              <h2 className="text-3xl font-extrabold tracking-tight text-slate-950 sm:text-5xl">
                Setiap orang bekerja dengan akses yang tepat.
              </h2>
              <p className="max-w-3xl text-sm leading-6 text-slate-600 sm:text-base sm:leading-7">
                Admin menjaga katalog, owner mengendalikan bisnis, dan kasir fokus melayani transaksi tanpa melihat data yang tidak diperlukan.
              </p>
            </div>

            <div className="mt-10 grid gap-5 lg:grid-cols-12 lg:grid-rows-2">
              <article className="rounded-[1.75rem] border border-indigo-100 bg-indigo-50 p-7 transition duration-300 hover:-translate-y-1 lg:col-span-5">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-indigo-700 shadow-sm ring-1 ring-indigo-100">
                  <Shield className="h-6 w-6" />
                </span>
                <h3 className="mt-7 text-xl font-extrabold text-slate-950">Global Admin</h3>
                <p className="mt-2 text-sm font-semibold text-indigo-700">Katalog platform tetap konsisten.</p>
                <p className="mt-4 max-w-md text-sm leading-6 text-slate-600">
                  Mengatur master produk, pendaftaran item baru, dan harga acuan untuk seluruh toko.
                </p>
              </article>

              <article className="relative overflow-hidden rounded-[1.75rem] bg-slate-950 p-7 text-white shadow-[0_28px_70px_-38px_rgba(30,41,59,0.85)] lg:col-span-7 lg:col-start-6 lg:row-span-2 lg:row-start-1 lg:p-9">
                <div className="pointer-events-none absolute -right-14 -top-20 h-72 w-72 rounded-full bg-indigo-500/30 blur-3xl" />
                <div className="relative flex h-full flex-col">
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/20 text-indigo-200 ring-1 ring-white/10">
                    <Store className="h-7 w-7" />
                  </span>
                  <h3 className="mt-8 text-2xl font-extrabold sm:text-3xl">Merchant Owner</h3>
                  <p className="mt-3 max-w-lg text-sm leading-6 text-slate-300">
                    Seluruh angka penting toko berada dalam satu pandangan untuk membantu owner bertindak lebih cepat.
                  </p>
                  <div className="mt-auto grid gap-3 pt-10 sm:grid-cols-3">
                    <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                      <BarChart3 className="h-4 w-4 text-indigo-300" />
                      <p className="mt-4 text-sm font-bold">Pantau omzet</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                      <PackageSearch className="h-4 w-4 text-indigo-300" />
                      <p className="mt-4 text-sm font-bold">Atur stok</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                      <Bot className="h-4 w-4 text-indigo-300" />
                      <p className="mt-4 text-sm font-bold">Tanya AI</p>
                    </div>
                  </div>
                </div>
              </article>

              <article className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-7 transition duration-300 hover:-translate-y-1 lg:col-span-5">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-700 shadow-sm ring-1 ring-slate-200">
                  <UserRoundCog className="h-6 w-6" />
                </span>
                <h3 className="mt-7 text-xl font-extrabold text-slate-950">Kasir Toko</h3>
                <p className="mt-2 text-sm font-semibold text-indigo-700">Transaksi cepat tanpa akses berlebih.</p>
                <p className="mt-4 max-w-md text-sm leading-6 text-slate-600">
                  Memproses pembayaran tunai dan melihat riwayat transaksi pribadi dalam ruang kerja yang fokus.
                </p>
              </article>
            </div>
          </div>
        </section>

        <LandingTestimonials />

        {/* Bottom CTA Banner */}
        <section className="relative mt-20 overflow-hidden rounded-[2.5rem] bg-slate-950 px-6 py-12 text-white shadow-[0_30px_80px_-44px_rgba(15,23,42,0.9)] sm:mt-28 sm:px-10 sm:py-16 lg:px-16 lg:py-20">
          <div className="pointer-events-none absolute -right-16 -top-24 h-96 w-96 rounded-full bg-indigo-500/25 blur-3xl" />
          <div className="relative grid gap-12 lg:grid-cols-[1.25fr_0.75fr] lg:items-end lg:gap-20">
            <div className="max-w-4xl">
              <h2 className="text-4xl font-black leading-[1.02] tracking-[-0.04em] sm:text-5xl lg:text-6xl">
                Siap melihat seluruh toko dari satu tempat?
              </h2>
              <p className="mt-6 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base sm:leading-7">
                Buat akun owner, undang kasir, lalu mulai membangun keputusan dari transaksi pertama.
              </p>
            </div>

            <div className="border-t border-white/15 pt-8 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0">
              <p className="text-sm font-semibold leading-6 text-slate-300">
                Sudah siap membuat operasional toko lebih mudah dikendalikan?
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row lg:flex-col">
              <Link
                href="/register"
                className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-extrabold text-slate-950 transition duration-200 hover:-translate-y-0.5 hover:bg-indigo-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 active:scale-[0.98]"
              >
                Mulai sekarang
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
              </Link>
              <Link
                href="/login"
                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/20 bg-white/[0.06] px-6 py-3 text-sm font-bold text-white transition duration-200 hover:-translate-y-0.5 hover:border-white/35 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 active:scale-[0.98]"
              >
                Masuk
              </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </PublicLayout>
  );
}
