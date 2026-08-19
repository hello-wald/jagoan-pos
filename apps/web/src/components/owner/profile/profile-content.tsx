'use client';

import React from 'react';
import Link from 'next/link';
import {
  Storefront,
  User,
  Envelope,
  ShieldCheck,
  Package,
  Users,
  Receipt,
  Sparkle,
  ArrowRight,
  ArrowClockwise,
} from '@phosphor-icons/react';
import type { Route } from 'next';
import { useCurrentUser } from '@/lib/api/owner';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Banner } from '@/components/ui/banner';
import { OwnerPageHeader } from '../owner-page-header';

type QuickLink = {
  href: Route;
  title: string;
  description: string;
  icon: React.ComponentType<{ size?: number; weight?: 'bold' | 'duotone' | 'regular'; className?: string }>;
};

export function ProfileContent() {
  const { data: user, isLoading, isError, refetch } = useCurrentUser();

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <OwnerPageHeader
          title="Profil Merchant"
          subtitle="Informasi akun merchant dan data pemilik toko."
        />
        <div className="rounded-panel border border-line bg-surface p-12 text-center text-sm text-ink-2 shadow-xs">
          <div className="flex items-center justify-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            <span>Memuat profil merchant…</span>
          </div>
        </div>
      </div>
    );
  }

  if (isError || !user) {
    return (
      <div className="flex flex-col gap-6">
        <OwnerPageHeader
          title="Profil Merchant"
          subtitle="Informasi akun merchant dan data pemilik toko."
        />
        <Banner tone="danger">
          Gagal memuat profil merchant. Pastikan koneksi internet stabil dan sesi login masih aktif.
        </Banner>
        <div className="flex justify-start">
          <Button variant="secondary" size="sm" onClick={() => void refetch()}>
            <ArrowClockwise size={16} weight="bold" />
            <span>Coba Lagi</span>
          </Button>
        </div>
      </div>
    );
  }

  const QUICK_LINKS: QuickLink[] = [
    {
      href: '/inventory',
      title: 'Katalog Produk & Stok',
      description: 'Pantau status inventori dan stok menipis.',
      icon: Package,
    },
    {
      href: '/staff',
      title: 'Kelola Staf Kasir',
      description: 'Atur hak akses kasir dan pendaftaran akun.',
      icon: Users,
    },
    {
      href: '/transactions',
      title: 'Riwayat Transaksi',
      description: 'Audit struk belanja dan log penjualan.',
      icon: Receipt,
    },
    {
      href: '/insights',
      title: 'AI Insight Assistant',
      description: 'Analisis strategi bisnis & tren penjualan.',
      icon: Sparkle,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <OwnerPageHeader
        title="Profil Merchant"
        subtitle="Informasi akun merchant dan data pemilik toko."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Merchant Info Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-control bg-accent/15 text-accent-deep border border-accent/20">
                  <Storefront size={20} weight="duotone" />
                </div>
                <div>
                  <CardTitle>Identitas Usaha</CardTitle>
                  <CardDescription>Informasi toko terdaftar di sistem POS.</CardDescription>
                </div>
              </div>
              <Badge tone={user.isActive ? 'success' : 'neutral'}>
                {user.isActive ? 'Aktif' : 'Nonaktif'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 border-t border-line/60 pt-4">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-ink-2 font-medium">Nama Usaha / Toko</span>
              <p className="text-sm font-semibold text-ink">
                {user.merchantName ?? 'Belum Diatur'}
              </p>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs text-ink-2 font-medium">Merchant ID</span>
              <p className="font-mono text-xs text-ink-2 bg-paper px-2.5 py-1.5 rounded-control border border-line inline-block self-start">
                {user.merchantId ?? '-'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Owner Info Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-control bg-accent/15 text-accent-deep border border-accent/20">
                <User size={20} weight="duotone" />
              </div>
              <div>
                <CardTitle>Identitas Pemilik</CardTitle>
                <CardDescription>Detail akun login pemilik (Owner).</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 border-t border-line/60 pt-4">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-ink-2 font-medium">Nama Lengkap</span>
              <p className="text-sm font-semibold text-ink">{user.fullName}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-ink-2 font-medium">Email Terdaftar</span>
                <div className="flex items-center gap-1.5 text-xs text-ink">
                  <Envelope size={14} className="text-ink-2" />
                  <span className="font-medium">{user.email}</span>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-xs text-ink-2 font-medium">Hak Akses / Role</span>
                <div className="flex items-center gap-1.5 text-xs text-ink capitalize">
                  <ShieldCheck size={14} className="text-accent-deep" />
                  <span className="font-semibold">{user.role}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Module Shortcuts */}
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-ink">Navigasi Modul Toko</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {QUICK_LINKS.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="group flex flex-col justify-between rounded-panel border border-line bg-surface p-4 shadow-xs transition-all hover:border-accent hover:shadow-sm"
              >
                <div className="flex flex-col gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-control bg-paper text-ink-2 transition-colors group-hover:bg-accent/20 group-hover:text-accent-deep">
                    <Icon size={18} weight="duotone" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-ink group-hover:text-ink">
                      {link.title}
                    </h4>
                    <p className="text-xs text-ink-2 mt-0.5">{link.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs font-semibold text-accent-deep mt-4 pt-2 border-t border-line/40">
                  <span>Buka Modul</span>
                  <ArrowRight
                    size={13}
                    weight="bold"
                    className="transition-transform group-hover:translate-x-1"
                  />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
