'use client';

import { useState } from 'react';
import Image from 'next/image';
import {
  Check,
  Coins,
  Lightning,
  MagnifyingGlass,
  Minus,
  Package,
  Plus,
  Receipt,
  ShoppingBag,
  ShoppingCart,
  Sparkle,
  Storefront,
  TrendUp,
} from '@phosphor-icons/react';

type Role = 'owner' | 'cashier';

const ROLE_CONTENT = {
  owner: {
    label: 'Owner',
    title: 'Pantau bisnis dari satu layar',
    description:
      'Owner mendapat gambaran bisnis yang rapi untuk menentukan produk, stok, dan jam operasional berikutnya.',
    capabilities: [
      'Dashboard omzet, transaksi, & rata-rata keranjang realtime',
      'AI Insight chatbot untuk prediksi jam ramai & stok',
      'Riwayat transaksi detail & analisis produk terlaris',
    ],
  },
  cashier: {
    label: 'Cashier',
    title: 'Checkout cepat saat antrean ramai',
    description:
      'Cashier fokus pada alur transaksi yang singkat, dari memilih rice bowl sampai pembayaran selesai.',
    capabilities: [
      'Katalog visual responsif dengan pencarian instan',
      'Hitung otomatis kembalian & tombol uang pas',
      'Pencatatan langsung sinkron ke laporan owner',
    ],
  },
} as const;

const OWNER_METRICS = [
  {
    label: 'Pendapatan Hari Ini',
    value: 'Rp 8.460.000',
    trend: '+14,2%',
    icon: Coins,
  },
  {
    label: 'Total Transaksi',
    value: '132 pesanan',
    trend: '+8 pesanan/jam',
    icon: Receipt,
  },
  {
    label: 'Rata-rata Keranjang',
    value: 'Rp 64.091',
    trend: 'Stabil',
    icon: ShoppingBag,
  },
  {
    label: 'AI Stok Terjual',
    value: '184 porsi',
    trend: '92% target',
    icon: Package,
  },
] as const;

const RECENT_TRANSACTIONS = [
  {
    id: '#TRX-8941',
    items: '2x Crispy Sambal Matah',
    time: 'Baru saja',
    total: 'Rp 56.000',
    method: 'Tunai',
  },
  {
    id: '#TRX-8940',
    items: '1x Korean Chicken, 1x Teh',
    time: '3 mnt lalu',
    total: 'Rp 38.000',
    method: 'QRIS',
  },
  {
    id: '#TRX-8939',
    items: '3x Beef Teriyaki Bowl',
    time: '7 mnt lalu',
    total: 'Rp 105.000',
    method: 'Tunai',
  },
  {
    id: '#TRX-8938',
    items: '1x Crispy Sambal Matah',
    time: '14 mnt lalu',
    total: 'Rp 28.000',
    method: 'QRIS',
  },
] as const;

const CASHIER_PRODUCTS = [
  {
    name: 'Crispy Sambal Matah',
    sku: 'RB-MTH-01',
    price: 'Rp 28.000',
    stock: 18,
    imagePosition: '68% 55%',
    selected: true,
  },
  {
    name: 'Korean Chicken Bowl',
    sku: 'RB-KOR-02',
    price: 'Rp 32.000',
    stock: 11,
    imagePosition: '78% 48%',
    selected: false,
  },
] as const;

function OwnerPreview() {
  return (
    <div
      role="region"
      aria-label="Pratinjau dashboard owner"
      className="role-panel-enter flex h-[460px] min-h-[460px] max-h-[460px] flex-col justify-between overflow-hidden bg-paper text-ink"
    >
      {/* Top App Header */}
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-line bg-surface/90 px-3.5 sm:px-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="grid size-6 place-items-center rounded bg-accent font-mono text-[10px] font-bold text-ink">
              J
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-[10px] font-bold tracking-tight">Jagoan Bowl - Outlet Tebet</span>
              <span className="flex items-center gap-1 rounded bg-success/15 px-1.5 py-0.2 font-mono text-[7px] font-bold text-success">
                <span className="size-1 rounded-full bg-success animate-pulse" />
                ONLINE
              </span>
            </div>
          </div>

          <div className="hidden items-center gap-1 sm:flex">
            {['Dashboard & Laporan', 'Riwayat Transaksi', 'AI Insight BI'].map((tab, idx) => (
              <span
                key={tab}
                className={`rounded px-2 py-0.5 text-[8px] font-medium ${
                  idx === 0
                    ? 'bg-paper text-ink font-semibold shadow-2xs'
                    : 'text-ink-2 hover:text-ink'
                }`}
              >
                {tab}
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="rounded-badge bg-accent/20 px-2 py-0.5 font-mono text-[7px] font-bold uppercase tracking-wider text-accent-deep">
            Owner View
          </span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col justify-between overflow-hidden p-3.5">
        {/* Top 4 Metrics Grid */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {OWNER_METRICS.map((metric) => {
            const Icon = metric.icon;

            return (
              <div
                key={metric.label}
                className="rounded-panel border border-line bg-surface p-2.5 shadow-xs transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="truncate text-[7.5px] font-medium text-ink-2">{metric.label}</span>
                  <span className="grid size-5 place-items-center rounded bg-paper text-accent-deep">
                    <Icon size={11} weight="bold" aria-hidden />
                  </span>
                </div>
                <p className="tabular mt-1 text-[12.5px] font-bold tracking-tight sm:text-[13.5px]">
                  {metric.value}
                </p>
                <span className="mt-0.5 inline-block text-[7px] font-semibold text-success">
                  {metric.trend}
                </span>
              </div>
            );
          })}
        </div>

        {/* 2-Column: Revenue Trend & Transaction Feed */}
        <div className="grid flex-1 gap-2.5 overflow-hidden pt-1 sm:grid-cols-[1.1fr_0.9fr]">
          {/* Revenue Chart */}
          <div className="flex flex-col justify-between rounded-panel border border-line bg-surface p-2.5 shadow-xs">
            <div className="flex items-center justify-between border-b border-line/60 pb-1.5">
              <div className="flex items-center gap-1.5">
                <TrendUp size={12} weight="bold" className="text-accent-deep" aria-hidden />
                <span className="text-[8.5px] font-bold">Tren Penjualan Hari Ini</span>
              </div>
              <span className="rounded bg-accent/15 px-1.5 py-0.2 font-mono text-[7px] font-bold text-accent-deep">
                Puncak: 12.30 WIB
              </span>
            </div>

            <div className="relative mt-1.5 flex-1 min-h-[95px] overflow-hidden rounded bg-paper/60 px-1.5 pt-1.5">
              <svg
                viewBox="0 0 400 120"
                preserveAspectRatio="none"
                className="size-full"
                aria-label="Grafik omzet demo"
              >
                <defs>
                  <linearGradient id="owner-gradient-showcase" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#e8af25" stopOpacity="0.38" />
                    <stop offset="100%" stopColor="#e8af25" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <path
                  d="M 0 100 C 40 95, 70 85, 110 88 S 160 55, 200 65 S 250 25, 290 35 S 350 15, 400 20 L 400 120 L 0 120 Z"
                  fill="url(#owner-gradient-showcase)"
                />
                <path
                  d="M 0 100 C 40 95, 70 85, 110 88 S 160 55, 200 65 S 250 25, 290 35 S 350 15, 400 20"
                  fill="none"
                  stroke="#a06207"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  className="role-chart-line"
                />
              </svg>
              <div className="absolute inset-x-2 bottom-1 flex justify-between font-mono text-[5.5px] text-ink-3">
                <span>09:00</span>
                <span>12:00</span>
                <span>15:00</span>
                <span>18:00</span>
                <span>21:00</span>
              </div>
            </div>
          </div>

          {/* Live Recent Transactions Feed */}
          <div className="flex flex-col rounded-panel border border-line bg-surface p-2.5 shadow-xs">
            <div className="flex items-center justify-between border-b border-line/60 pb-1.5">
              <div className="flex items-center gap-1.5">
                <Receipt size={12} weight="bold" className="text-accent-deep" aria-hidden />
                <span className="text-[8.5px] font-bold">Riwayat Transaksi</span>
              </div>
              <span className="text-[6.5px] font-semibold text-accent-deep">Live Feed</span>
            </div>

            <div className="flex flex-col gap-1.5 pt-1.5">
              {RECENT_TRANSACTIONS.map((trx) => (
                <div
                  key={trx.id}
                  className="flex items-center justify-between rounded border border-line/60 bg-paper/60 px-2 py-1 text-[7px]"
                >
                  <div className="min-w-0 pr-1.5">
                    <div className="flex items-center gap-1 font-semibold">
                      <span className="font-mono text-accent-deep">{trx.id}</span>
                      <span className="text-[6px] text-ink-3">• {trx.time}</span>
                    </div>
                    <p className="truncate text-[6.5px] text-ink-2">{trx.items}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="tabular font-bold text-ink">{trx.total}</span>
                    <p className="text-[6px] font-semibold text-success">{trx.method}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Status Banner */}
        <div className="flex items-center justify-between rounded border border-line/70 bg-surface px-2.5 py-1.5 text-[7px]">
          <div className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-success animate-pulse" />
            <span className="font-semibold text-ink">Semua data transaksi &amp; inventori sinkron</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function CashierProductCard({ product }: { product: (typeof CASHIER_PRODUCTS)[number] }) {
  return (
    <article
      className={`flex min-w-0 flex-col overflow-hidden rounded-panel border p-1.5 shadow-xs transition-all ${
        product.selected
          ? 'border-accent-deep/60 bg-accent/5 ring-1 ring-accent-deep/25'
          : 'border-line bg-surface'
      }`}
    >
      <div className="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded bg-paper">
        <Image
          src="/landing/hero-rice-bowl.png"
          alt=""
          fill
          sizes="(max-width: 640px) 120px, 180px"
          className="object-cover"
          style={{ objectPosition: product.imagePosition }}
        />
        <span className="absolute right-1 top-1 rounded bg-surface/90 px-1 py-0.2 text-[5.5px] font-bold text-ink shadow-xs backdrop-blur-xs">
          Stok: {product.stock}
        </span>
      </div>

      <div className="px-0.5 pt-1">
        <p className="line-clamp-1 text-[7.5px] font-semibold leading-snug">
          {product.name}
        </p>
        <p className="font-mono text-[5px] uppercase tracking-wider text-ink-3">
          {product.sku}
        </p>
      </div>

      <div className="mt-1 flex items-center justify-between border-t border-line/60 pt-1">
        <p className="tabular text-[8px] font-bold text-ink">{product.price}</p>
        {product.selected ? (
          <div className="flex items-center rounded border border-accent-deep/40 bg-surface shadow-2xs">
            <span className="grid size-4 place-items-center text-ink-2">
              <Minus size={7} weight="bold" aria-hidden />
            </span>
            <span className="tabular w-3 text-center text-[7px] font-bold text-accent-deep">1</span>
            <span className="grid size-4 place-items-center text-ink-2">
              <Plus size={7} weight="bold" aria-hidden />
            </span>
          </div>
        ) : (
          <span className="flex h-4 items-center gap-0.5 rounded bg-accent/20 px-1 text-[6px] font-semibold text-accent-deep">
            <Plus size={6} weight="bold" aria-hidden />
            Tambah
          </span>
        )}
      </div>
    </article>
  );
}

function CashierPreview() {
  return (
    <div
      role="region"
      aria-label="Pratinjau checkout kasir"
      className="role-panel-enter flex h-[460px] min-h-[460px] max-h-[460px] flex-col justify-between overflow-hidden bg-surface text-ink"
    >
      {/* Top POS Header */}
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-line bg-surface px-3.5 sm:px-4">
        <div className="flex items-center gap-2.5">
          <span className="grid size-6 place-items-center rounded bg-accent text-ink">
            <Storefront size={13} weight="bold" aria-hidden />
          </span>
          <div>
            <p className="text-[9px] font-bold leading-tight">POS Kasir - Terminal 01</p>
            <p className="text-[6.5px] text-ink-3">Kasir: Siti Rahma (Shift Pagi)</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="flex items-center gap-1 rounded bg-success/15 px-2 py-0.5 font-mono text-[7px] font-bold text-success">
            <span className="size-1 rounded-full bg-success animate-pulse" />
            TERHUBUNG
          </span>
        </div>
      </div>

      <div className="grid flex-1 overflow-hidden bg-paper sm:grid-cols-[minmax(0,1fr)_220px]">
        {/* Product Catalog */}
        <div className="flex flex-col justify-between overflow-hidden p-3">
          <div className="flex flex-col gap-2">
            {/* Search & Header */}
            <div className="flex items-center justify-between">
              <span className="text-[8px] font-bold text-ink">Pilih produk</span>
              <span className="font-mono text-[6px] text-ink-3">12 Menu Aktif</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="flex h-7 flex-1 items-center gap-1.5 rounded border border-line bg-surface px-2 text-ink-3 shadow-xs">
                <MagnifyingGlass size={10} aria-hidden />
                <span className="text-[6.5px]">Cari rice bowl atau SKU...</span>
              </div>
              <span className="shrink-0 rounded bg-ink px-1.5 py-1 text-[6.5px] font-semibold text-white">
                Semua Menu
              </span>
            </div>

            {/* Product Cards */}
            <div className="grid grid-cols-2 gap-2">
              {CASHIER_PRODUCTS.map((product) => (
                <CashierProductCard key={product.sku} product={product} />
              ))}
            </div>
          </div>

          <div className="rounded border border-dashed border-line p-1.5 text-center">
            <p className="text-[6.5px] font-medium text-ink-3">
              ⚡ Barcode Scanner &amp; Keyboard Shortcut Didukung
            </p>
          </div>
        </div>

        {/* Cart & Quick Checkout */}
        <div className="flex min-w-0 flex-col justify-between border-t border-line bg-surface sm:border-l sm:border-t-0">
          <div className="flex items-center justify-between border-b border-line px-3 py-1.5">
            <div className="flex items-center gap-1.5">
              <ShoppingCart size={11} weight="bold" className="text-accent-deep" aria-hidden />
              <span className="text-[8px] font-bold">Keranjang (2 pcs)</span>
            </div>
            <span className="text-[6px] font-medium text-danger">Batal</span>
          </div>

          <div className="flex flex-1 flex-col gap-1.5 overflow-hidden p-2.5">
            {CASHIER_PRODUCTS.map((product) => (
              <div
                key={product.sku}
                className="flex items-center justify-between rounded border border-line/70 bg-paper/60 p-1.5 text-[6.5px]"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold">{product.name}</p>
                  <span className="text-[5.5px] text-ink-3">{product.price} x 1</span>
                </div>
                <span className="tabular font-bold">{product.price}</span>
              </div>
            ))}
          </div>

          {/* Quick Pay Box */}
          <div className="border-t border-line bg-paper/40 p-2.5">
            <div className="flex items-center justify-between rounded bg-accent px-2 py-1 text-ink font-bold shadow-2xs">
              <span className="text-[7px]">Total Bayar</span>
              <span className="tabular text-[10px]">Rp 60.000</span>
            </div>

            {/* Quick Cash Buttons */}
            <div className="mt-1.5 grid grid-cols-3 gap-1">
              {['Pas', 'Rp 60k', 'Rp 100k'].map((amt, i) => (
                <span
                  key={amt}
                  className={`flex h-5 items-center justify-center rounded border text-[6px] font-semibold ${
                    i === 2
                      ? 'border-accent-deep/50 bg-accent/15 text-accent-deep'
                      : 'border-line bg-surface text-ink-2'
                  }`}
                >
                  {amt}
                </span>
              ))}
            </div>

            <div className="mt-1.5 flex items-center justify-between rounded border border-success/20 bg-success/5 px-2 py-0.5 text-[6.5px]">
              <span className="font-medium text-ink-2">Kembalian</span>
              <span className="tabular font-bold text-success">Rp 40.000</span>
            </div>

            <button
              type="button"
              className="mt-1.5 flex h-7 w-full items-center justify-center gap-1 rounded bg-accent text-[7px] font-bold text-ink shadow-[0_4px_12px_rgba(160,98,7,0.18)] transition-transform active:scale-[0.98]"
            >
              <Check size={9} weight="bold" aria-hidden />
              Selesaikan Transaksi
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function RoleShowcase() {
  const [activeRole, setActiveRole] = useState<Role>('owner');
  const role = ROLE_CONTENT[activeRole];

  return (
    <section
      aria-labelledby="role-showcase-title"
      className="relative overflow-hidden border-t border-white/10 bg-[#0e0d0f] py-16 sm:py-20 lg:py-24"
    >
      {/* Subtle Ambient Radial Glow */}
      <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_70%_35%,rgba(232,175,37,0.15),transparent_40%)]" />

      {/* Centered, sleek-width container */}
      <div className="relative mx-auto w-full max-w-[1240px] px-5 sm:px-8 lg:px-10">
        <div className="grid items-center gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:gap-12 xl:gap-16">
          {/* Left Column: Role Details & Toggle */}
          <div className="max-w-[480px]">
            <p className="font-mono text-xs uppercase tracking-[0.14em] text-accent">
              Dua Sudut Pandang
            </p>
            <h2
              id="role-showcase-title"
              className="mt-3 text-[clamp(2.1rem,3.4vw,3.2rem)] font-semibold leading-[1.02] tracking-[-0.045em] text-white"
            >
              Satu sistem, dua cara kerja.
            </h2>
            <p className="mt-4 text-sm leading-6 text-white/65 sm:text-base sm:leading-7">
              Setiap peran mendapatkan tampilan yang fokus, cepat, dan sesuai kebutuhan operasional harian.
            </p>

            {/* Role Switcher Pills */}
            <div
              role="group"
              aria-label="Pilih role"
              className="mt-6 grid grid-cols-2 rounded-[14px] border border-white/14 bg-white/[0.04] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
            >
              {(Object.keys(ROLE_CONTENT) as Role[]).map((roleKey) => {
                const isActive = activeRole === roleKey;
                const Icon = roleKey === 'owner' ? TrendUp : Storefront;

                return (
                  <button
                    key={roleKey}
                    type="button"
                    aria-label={`Tampilkan fitur ${ROLE_CONTENT[roleKey].label}`}
                    aria-pressed={isActive}
                    onClick={() => setActiveRole(roleKey)}
                    className={`flex h-11 items-center justify-center gap-2 rounded-[10px] text-sm font-semibold transition-all duration-200 active:scale-[0.98] ${
                      isActive
                        ? 'bg-accent text-ink shadow-[0_6px_20px_rgba(160,98,7,0.25)]'
                        : 'bg-transparent text-white/65 hover:bg-white/7 hover:text-white'
                    }`}
                  >
                    <Icon size={16} weight={isActive ? 'bold' : 'regular'} aria-hidden />
                    {ROLE_CONTENT[roleKey].label}
                  </button>
                );
              })}
            </div>

            {/* Active Role Explanations */}
            <div key={activeRole} className="role-panel-enter mt-6" aria-live="polite">
              <div className="flex items-center gap-2">
                <span className="h-px w-5 bg-accent" />
                <p className="text-xs font-semibold uppercase tracking-wider text-accent">
                  Keunggulan Mode {role.label}
                </p>
              </div>
              <h3 className="mt-2 text-xl font-semibold tracking-tight text-white sm:text-2xl">
                {role.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-white/60">
                {role.description}
              </p>

              <ul className="mt-5 space-y-2.5">
                {role.capabilities.map((capability) => (
                  <li
                    key={capability}
                    className="flex items-start gap-2.5 text-xs leading-5 text-white/80 sm:text-sm"
                  >
                    <span className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full bg-accent text-ink">
                      <Check size={9} weight="bold" aria-hidden />
                    </span>
                    <span>{capability}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Right Column: Sleek Floating Glass Window Preview with Floating Feature Badges */}
          <div
            role="group"
            aria-label={`Preview fitur ${role.label}`}
            className="role-preview-float relative min-w-0"
          >
            {/* Animated Decorative Ambient Border Accent */}
            <div
              className="role-frame-drift pointer-events-none absolute -inset-2.5 rounded-[22px] border border-accent/25 opacity-70"
              aria-hidden="true"
            />
            <div
              className="pointer-events-none absolute -inset-1 translate-x-2 translate-y-1.5 rounded-[20px] border border-white/8"
              aria-hidden="true"
            />

            {/* ✨ FLOATING BADGE 1 (Top-Right of Window) - ENLARGED */}
            <div className="role-badge-float-1 absolute -right-5 -top-7 z-30 hidden items-center gap-3 rounded-full border border-accent/50 bg-[#1e1a17]/95 px-4.5 py-2.5 shadow-[0_16px_40px_rgba(0,0,0,0.65)] backdrop-blur-md sm:flex">
              <span className="grid size-8 place-items-center rounded-full bg-accent text-ink shadow-sm">
                {activeRole === 'owner' ? (
                  <Sparkle size={15} weight="fill" />
                ) : (
                  <Lightning size={15} weight="fill" />
                )}
              </span>
              <div className="text-left">
                <p className="text-[11px] font-bold leading-tight text-white">
                  {activeRole === 'owner' ? 'AI Smart Forecast' : 'Fast 1-Click POS'}
                </p>
                <p className="text-[8.5px] font-mono leading-none text-accent">
                  {activeRole === 'owner' ? 'Prediksi Jam Ramai' : 'Hitung Kembalian Cepat'}
                </p>
              </div>
            </div>

            {/* ✨ FLOATING BADGE 2 (Bottom-Left of Window) - ENLARGED */}
            <div className="role-badge-float-2 absolute -bottom-6 -left-6 z-30 hidden items-center gap-3 rounded-full border border-white/20 bg-[#161519]/95 px-4.5 py-2.5 shadow-[0_16px_40px_rgba(0,0,0,0.65)] backdrop-blur-md sm:flex">
              <span className="grid size-8 place-items-center rounded-full bg-success/20 text-success shadow-sm">
                {activeRole === 'owner' ? (
                  <TrendUp size={15} weight="bold" />
                ) : (
                  <Receipt size={15} weight="bold" />
                )}
              </span>
              <div className="text-left">
                <p className="text-[11px] font-bold leading-tight text-white">
                  {activeRole === 'owner' ? 'Live Omzet & Transaksi' : 'Auto Sync & Generate Struk'}
                </p>
                <p className="text-[8.5px] font-mono leading-none text-white/65">
                  {activeRole === 'owner' ? 'Summary dan Transaksi Sinkron Otomatis' : 'Struk Langsung Tercatat'}
                </p>
              </div>
            </div>

            {/* Window Container */}
            <div className="relative overflow-hidden rounded-[18px] border border-white/16 bg-[#161519]/90 p-2 shadow-[0_24px_70px_rgba(0,0,0,0.55)] backdrop-blur-md">
              {/* Window Titlebar */}
              <div className="mb-2 flex items-center justify-between px-2 pt-1">
                <div className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-[#ff5f56]/80" />
                  <span className="size-2 rounded-full bg-[#ffbd2e]/80" />
                  <span className="size-2 rounded-full bg-[#27c93f]/80" />
                  <span className="ml-2 font-mono text-[9px] text-white/40">
                    jagoanpos.app/{activeRole}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[8px] font-mono text-accent">
                  <Sparkle size={9} weight="fill" />
                  <span>Interactive Mock</span>
                </div>
              </div>

              {/* Window Body (Strict Equal Height 460px) */}
              <div className="h-[460px] overflow-hidden rounded-[12px] border border-black/20 bg-surface shadow-[0_8px_24px_rgba(0,0,0,0.3)]">
                {activeRole === 'owner' ? (
                  <OwnerPreview key="owner" />
                ) : (
                  <CashierPreview key="cashier" />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
