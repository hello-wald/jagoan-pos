import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Bot,
  Box,
  Check,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  PackageCheck,
  ReceiptText,
  Store,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";

const chartBars = ["h-[34%]", "h-[46%]", "h-[42%]", "h-[68%]", "h-[58%]", "h-[82%]", "h-full"];

const trustPoints = [
  "Checkout sub-detik",
  "Stok tersinkron real-time",
  "Insight bisnis berbasis AI",
];

const transactionActivities = [
  "#INV-0248 tercatat",
  "Stok Es Kopi terbarui",
  "+ Rp48.000 masuk",
];

export function LandingHero() {
  return (
    <section className="relative isolate overflow-visible px-4 py-6 sm:py-10 lg:py-12">
      <div className="hero-motion hero-orb hero-orb-one pointer-events-none absolute -left-32 top-8 -z-10 h-72 w-72 rounded-full bg-indigo-200/35 blur-3xl" />
      <div className="hero-motion hero-orb hero-orb-two pointer-events-none absolute -right-20 bottom-0 -z-10 h-80 w-80 rounded-full bg-cyan-200/30 blur-3xl" />

      <div className="grid items-center gap-12 xl:grid-cols-[0.78fr_1.22fr] xl:gap-20">
        <div className="relative z-10 max-w-2xl">
          <div className="hero-motion hero-enter hero-enter-1 inline-flex items-center gap-2 rounded-full border border-indigo-200/80 bg-indigo-50/80 px-3.5 py-2 text-[11px] font-extrabold uppercase tracking-[0.14em] text-indigo-700 shadow-sm backdrop-blur sm:text-xs">
            <span className="relative flex h-2 w-2">
              <span className="hero-motion hero-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            POS + Business Intelligence untuk UMKM
          </div>

          <h1 className="hero-motion hero-enter hero-enter-2 mt-6 text-[2.8rem] font-black leading-[0.96] tracking-[-0.055em] text-slate-950 sm:text-6xl lg:text-[4.25rem] xl:text-[4.65rem]">
            Operasional toko melaju.{" "}
            <span className="relative inline-block bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-800 bg-clip-text text-transparent">
              Angka bicara.
              <svg
                aria-hidden="true"
                className="hero-motion hero-underline absolute -bottom-2 left-0 h-3 w-full text-indigo-300/80"
                viewBox="0 0 320 18"
                preserveAspectRatio="none"
              >
                <path
                  d="M4 12C75 2 209 2 316 10"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeWidth="6"
                />
              </svg>
            </span>
          </h1>

          <p className="hero-motion hero-enter hero-enter-3 mt-7 max-w-xl text-base font-medium leading-7 text-slate-600 sm:text-lg sm:leading-8">
            Satu ruang kerja untuk checkout tunai, kontrol stok, laporan penjualan,
            dan insight AI, supaya keputusan bisnis tidak lagi menunggu akhir bulan.
          </p>

          <div className="hero-motion hero-enter hero-enter-4 mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/register"
              className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-slate-950 px-6 py-3 text-sm font-extrabold text-white shadow-[0_12px_30px_-12px_rgba(15,23,42,0.8)] transition hover:-translate-y-0.5 hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
            >
              Mulai sekarang
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/login"
              aria-label="Masuk ke dashboard"
              className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white/80 px-6 py-3 text-sm font-bold text-slate-700 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:border-indigo-200 hover:text-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
            >
              Masuk
              <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>
          </div>

          <div className="hero-motion hero-enter hero-enter-5 mt-8 hidden gap-2.5 text-xs font-semibold text-slate-500 sm:grid sm:grid-cols-3 sm:gap-3">
            {trustPoints.map((point) => (
              <span key={point} className="flex items-center gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <Check className="h-3 w-3" strokeWidth={3} />
                </span>
                {point}
              </span>
            ))}
          </div>
        </div>

        <div className="relative min-h-[430px] sm:min-h-[550px] lg:min-h-[640px]">
          <div className="hero-motion hero-float-card hero-float-card-left absolute left-0 top-4 z-30 hidden rounded-2xl border border-white/90 bg-white/90 p-3.5 shadow-[0_18px_50px_-20px_rgba(15,23,42,0.35)] backdrop-blur sm:flex sm:items-center sm:gap-3 lg:-left-4 lg:top-12">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <PackageCheck className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Stok hari ini</p>
              <p className="mt-0.5 text-sm font-extrabold text-slate-900">98% aman</p>
            </div>
          </div>

          <div className="hero-motion hero-float-card hero-float-card-right absolute right-0 top-14 z-30 hidden rounded-2xl border border-indigo-200/80 bg-slate-950 p-3.5 text-white shadow-[0_18px_50px_-20px_rgba(79,70,229,0.8)] sm:flex sm:items-center sm:gap-3 lg:-right-4 lg:top-24">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-300">
              <Zap className="h-4 w-4" fill="currentColor" />
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-300">Checkout</p>
              <p className="mt-0.5 text-sm font-extrabold">Berhasil dalam 0,4 dtk</p>
            </div>
          </div>

          <div className="hero-motion hero-preview-enter relative z-10 mx-auto mt-8 w-full max-w-[720px] sm:mt-14 lg:mt-10">
            <div
              role="img"
              aria-label="Pratinjau dashboard App K"
              className="hero-motion hero-dashboard-float overflow-hidden rounded-[1.65rem] border border-slate-200/80 bg-white shadow-[0_35px_90px_-30px_rgba(30,41,59,0.35)] ring-1 ring-white/80"
            >
              <div className="flex h-11 items-center justify-between border-b border-slate-100 bg-white px-4 sm:h-14 sm:px-5">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm sm:h-8 sm:w-8">
                    <Store className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </span>
                  <div>
                    <p className="text-[10px] font-black tracking-tight text-slate-900 sm:text-xs">APP K</p>
                    <p className="hidden text-[8px] font-semibold uppercase tracking-widest text-slate-500 sm:block">Toko Nusantara</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="hidden items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[9px] font-bold text-emerald-700 sm:flex">
                    <span className="hero-motion hero-pulse-dot h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Data live
                  </span>
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-[9px] font-extrabold text-white">AN</span>
                </div>
              </div>

              <div className="flex min-h-[350px] bg-slate-50/80 sm:min-h-[410px]">
                <aside className="hidden w-14 shrink-0 flex-col items-center gap-3 border-r border-slate-100 bg-white py-4 sm:flex">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white"><BarChart3 className="h-4 w-4" /></span>
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500"><ReceiptText className="h-4 w-4" /></span>
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500"><Box className="h-4 w-4" /></span>
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500"><Users className="h-4 w-4" /></span>
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500"><Bot className="h-4 w-4" /></span>
                </aside>

                <div className="min-w-0 flex-1 p-3 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-indigo-600 sm:text-[10px]">Ringkasan bisnis</p>
                      <h2 className="mt-1 text-sm font-black tracking-tight text-slate-900 sm:text-lg">Selamat pagi, Andini</h2>
                    </div>
                    <span className="hidden items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[9px] font-semibold text-slate-500 sm:flex">
                      7 hari terakhir <ChevronRight className="h-3 w-3" />
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 sm:mt-4 sm:grid-cols-3 sm:gap-3">
                    <div className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm sm:p-3.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-bold text-slate-500">OMZET</span>
                        <CircleDollarSign className="h-3.5 w-3.5 text-indigo-500" />
                      </div>
                      <p className="mt-2 text-base font-black tracking-tight text-slate-900 sm:text-xl">Rp12,8jt</p>
                      <p className="mt-1 flex items-center gap-1 text-[9px] font-bold text-emerald-600"><TrendingUp className="h-3 w-3" /> +18,4%</p>
                    </div>
                    <div className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm sm:p-3.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-bold text-slate-500">TRANSAKSI</span>
                        <ReceiptText className="h-3.5 w-3.5 text-violet-500" />
                      </div>
                      <p className="mt-2 text-base font-black tracking-tight text-slate-900 sm:text-xl">248</p>
                      <p className="mt-1 text-[9px] font-bold text-slate-500">35 transaksi/hari</p>
                    </div>
                    <div className="col-span-2 hidden rounded-xl border border-slate-100 bg-white p-3 shadow-sm sm:col-span-1 sm:block sm:p-3.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-bold text-slate-500">JAM RAMAI</span>
                        <Clock3 className="h-3.5 w-3.5 text-amber-500" />
                      </div>
                      <p className="mt-2 text-xl font-black tracking-tight text-slate-900">12:00</p>
                      <p className="mt-1 text-[9px] font-bold text-slate-500">Siapkan 2 kasir</p>
                    </div>
                  </div>

                  <div className="mt-2 grid gap-2 sm:mt-3 sm:grid-cols-[1.25fr_0.75fr] sm:gap-3">
                    <div className="relative overflow-hidden rounded-xl border border-slate-100 bg-white p-3 shadow-sm sm:p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Tren penjualan</p>
                          <p className="mt-1 text-xs font-extrabold text-slate-800">Minggu ini</p>
                        </div>
                        <span className="rounded-md bg-emerald-50 px-2 py-1 text-[8px] font-bold text-emerald-700">Naik 18%</span>
                      </div>
                      <div className="mt-3 flex h-24 items-end gap-1.5 border-b border-slate-100 sm:h-28 sm:gap-2">
                        {chartBars.map((height, index) => (
                          <div key={height + index} className="flex h-full flex-1 items-end">
                            <span className={`hero-motion hero-chart-bar ${height} w-full origin-bottom rounded-t bg-gradient-to-t from-indigo-600 to-indigo-400`} style={{ animationDelay: `${700 + index * 90}ms` }} />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-xl border border-emerald-100 bg-white p-3 shadow-sm sm:p-4">
                      <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700"><Bot className="h-3.5 w-3.5" /></span>
                        <div>
                          <p className="text-[9px] font-black text-slate-800">AI Business Advisor</p>
                          <p className="text-[8px] font-semibold text-emerald-600">Analisis penjualan toko</p>
                        </div>
                      </div>
                      <div className="mt-3 ml-auto w-fit max-w-[90%] rounded-xl rounded-tr-sm bg-emerald-600 px-2.5 py-2 text-[9px] font-semibold leading-4 text-white">
                        Produk apa yang paling laku minggu ini?
                      </div>
                      <div className="mt-2 flex items-start gap-1.5">
                        <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-md bg-emerald-100 text-emerald-700"><Bot className="h-2.5 w-2.5" /></span>
                        <p className="rounded-xl rounded-tl-sm bg-slate-50 px-2.5 py-2 text-[9px] font-semibold leading-4 text-slate-700">
                          Es kopi susu naik 23%. Tambah stok sebelum 12.00.
                        </p>
                      </div>
                      <p className="mt-2 text-[8px] font-bold text-emerald-700">Tanya AI dari data penjualanmu</p>
                    </div>
                  </div>

                  <div className="mt-2 flex items-center gap-2 overflow-hidden rounded-lg border border-emerald-100 bg-emerald-50/80 px-3 py-2 sm:mt-3">
                    <span className="hero-motion hero-pulse-dot h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                    <div className="hero-ticker-viewport min-w-0 flex-1 overflow-hidden">
                      <div className="hero-motion hero-ticker-track flex w-max items-center text-[9px] font-bold text-emerald-800">
                        {[0, 1].map((groupIndex) => (
                          <div
                            key={groupIndex}
                            aria-hidden={groupIndex === 1}
                            className="flex shrink-0 items-center gap-5 pr-5"
                          >
                            {transactionActivities.map((activity) => (
                              <span key={activity} className="flex items-center gap-5 whitespace-nowrap">
                                {activity}
                                <span className="h-1 w-1 rounded-full bg-emerald-400" />
                              </span>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="hero-motion hero-float-card hero-float-card-bottom absolute -bottom-1 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2.5 rounded-2xl border border-white/90 bg-white/95 px-4 py-3 shadow-[0_18px_45px_-18px_rgba(15,23,42,0.35)] backdrop-blur sm:bottom-0 sm:left-auto sm:right-5 sm:translate-x-0">
            <span className="hero-motion hero-bot-breathe flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-700">
              <Bot className="h-4 w-4" />
            </span>
            <div className="whitespace-nowrap">
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">AI membaca data</p>
              <p className="mt-0.5 text-xs font-extrabold text-slate-900">Insight siap dalam hitungan detik</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
