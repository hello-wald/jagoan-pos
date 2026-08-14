"use client";

import React from "react";
import {
  Store,
  User,
  Mail,
  Shield,
  Calendar,
  Boxes,
  Users,
  Receipt,
  Edit2,
  Check,
  X,
  CheckCircle2,
  Copy,
  Sparkles,
  Database,
  ArrowUpRight,
} from "lucide-react";
import Link from "next/link";
import { OwnerLayout } from "@/components/layouts/owner-layout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useOwnerProfile } from "@/hooks/use-owner-profile";
import { useToast } from "@/components/ui/toast";

export default function OwnerProfilePage() {
  const {
    profile,
    isEditing,
    setIsEditing,
    merchantNameInput,
    setMerchantNameInput,
    isSaving,
    handleSaveProfile,
  } = useOwnerProfile();

  const { success } = useToast();

  const copyMerchantId = () => {
    navigator.clipboard.writeText(profile.merchantId);
    success("Merchant ID berhasil disalin ke papan klip.", "Tersalin");
  };

  return (
    <OwnerLayout
      title="Profil Toko & Pemilik"
      subtitle="Kelola identitas bisnis merchant dan pantau ringkasan ekosistem operasional toko Anda"
    >
      <div className="max-w-5xl mx-auto space-y-8 py-2">
        {/* Merchant Hero Banner */}
        <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-inner flex-shrink-0">
              <Store className="w-8 h-8 text-emerald-300" />
            </div>

            <div className="space-y-2">
              {isEditing ? (
                <form onSubmit={handleSaveProfile} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={merchantNameInput}
                    onChange={(e) => setMerchantNameInput(e.target.value)}
                    className="px-3 py-1.5 rounded-xl bg-white/20 text-white font-extrabold text-xl focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    required
                  />
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="p-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white transition shadow-sm"
                    title="Simpan Nama"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white transition"
                    title="Batal"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </form>
              ) : (
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-extrabold tracking-tight">
                    {profile.merchantName}
                  </h2>
                  <button
                    type="button"
                    onClick={() => {
                      setMerchantNameInput(profile.merchantName);
                      setIsEditing(true);
                    }}
                    className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-emerald-200 hover:text-white transition"
                    title="Ubah Nama Toko"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <div className="flex items-center gap-2 text-xs text-emerald-100/90 font-medium">
                <Calendar className="w-3.5 h-3.5 text-emerald-300" />
                <span>Terdaftar sejak {profile.joinedDate}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={copyMerchantId}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-mono font-semibold transition active:scale-95 text-emerald-100"
              title="Klik untuk menyalin ID Merchant"
            >
              <span>ID: {profile.merchantId}</span>
              <Copy className="w-3.5 h-3.5 opacity-80" />
            </button>
            <span className="px-3 py-1.5 rounded-xl bg-emerald-500/30 border border-emerald-400/40 text-xs font-bold text-emerald-200">
              Merchant Aktif
            </span>
          </div>
        </div>

        {/* 2 Focused Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: Informasi Akun Pemilik */}
          <Card className="p-6 rounded-2xl bg-white border border-border shadow-card space-y-5">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-2xs">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">
                  Informasi Akun Pemilik
                </h3>
                <p className="text-xs text-slate-400 font-medium">
                  Identitas akun pengelola utama toko
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Nama Lengkap Pemilik
                </label>
                <p className="font-bold text-slate-900 text-sm">{profile.ownerName}</p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Email Login Terdaftar
                </label>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <p className="font-mono text-xs font-semibold text-slate-800">
                    {profile.ownerEmail}
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Hak Akses Sistem
                </label>
                <div className="flex items-center gap-2 pt-0.5">
                  <Badge variant="success" size="sm">
                    OWNER (Merchant Administrator)
                  </Badge>
                  <span className="text-[11px] text-slate-400 font-medium">
                    &bull; Akses Penuh
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* Card 2: Ringkasan Ekosistem Toko */}
          <Card className="p-6 rounded-2xl bg-white border border-border shadow-card space-y-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-700 shadow-2xs">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    Ringkasan Ekosistem Toko
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">
                    Kapasitas inventori, tim kasir, dan transaksi
                  </p>
                </div>
              </div>

              {/* 3 Metric Cards */}
              <div className="grid grid-cols-3 gap-3 pt-4">
                <Link
                  href="/owner/inventory"
                  className="p-3.5 rounded-xl bg-slate-50 hover:bg-emerald-50/50 border border-slate-200/80 hover:border-emerald-200 text-center space-y-1 transition duration-150 group"
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    SKU Produk
                  </span>
                  <p className="text-2xl font-extrabold text-slate-900 group-hover:text-emerald-700">
                    {profile.stats.totalProducts}
                  </p>
                  <span className="text-[10px] text-slate-400 font-medium flex items-center justify-center gap-0.5">
                    Inventori <ArrowUpRight className="w-2.5 h-2.5" />
                  </span>
                </Link>

                <Link
                  href="/owner/staff"
                  className="p-3.5 rounded-xl bg-slate-50 hover:bg-emerald-50/50 border border-slate-200/80 hover:border-emerald-200 text-center space-y-1 transition duration-150 group"
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Staf Kasir
                  </span>
                  <p className="text-2xl font-extrabold text-slate-900 group-hover:text-emerald-700">
                    {profile.stats.totalStaff}
                  </p>
                  <span className="text-[10px] text-slate-400 font-medium flex items-center justify-center gap-0.5">
                    Kelola Staf <ArrowUpRight className="w-2.5 h-2.5" />
                  </span>
                </Link>

                <Link
                  href="/owner/transactions"
                  className="p-3.5 rounded-xl bg-emerald-50/70 hover:bg-emerald-100/60 border border-emerald-200/80 text-center space-y-1 transition duration-150 group"
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">
                    Bulan Ini
                  </span>
                  <p className="text-2xl font-extrabold text-emerald-700">
                    {profile.stats.totalTransactionsThisMonth}
                  </p>
                  <span className="text-[10px] text-emerald-600 font-medium flex items-center justify-center gap-0.5">
                    Transaksi <ArrowUpRight className="w-2.5 h-2.5" />
                  </span>
                </Link>
              </div>
            </div>

            {/* Engine Status Banner */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-between mt-4">
              <div className="flex items-center gap-2.5">
                <Database className="w-4 h-4 text-emerald-600" />
                <div>
                  <p className="text-xs font-bold text-slate-900">ClickHouse OLAP & AI Insight</p>
                  <p className="text-[11px] text-slate-400">Sinkronisasi analitik otomatis aktif</p>
                </div>
              </div>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            </div>
          </Card>
        </div>
      </div>
    </OwnerLayout>
  );
}
