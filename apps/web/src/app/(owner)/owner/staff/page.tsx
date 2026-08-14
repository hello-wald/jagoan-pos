"use client";

import React from "react";
import {
  Users,
  UserPlus,
  Search,
  Mail,
  Lock,
  Eye,
  EyeOff,
  UserCheck,
  UserX,
  RefreshCw,
  AlertCircle,
  Shield,
  Clock,
} from "lucide-react";
import { OwnerLayout } from "@/components/layouts/owner-layout";
import { DataTable, type ColumnDef } from "@/components/ui/data-table";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { formatDateIndo } from "@/lib/utils";
import { useOwnerStaff, type CashierAccount } from "@/hooks/use-owner-staff";

export default function OwnerStaffPage() {
  const {
    cashiers,
    summary,
    isLoading,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    isModalOpen,
    formData,
    errors,
    modalServerError,
    isCreating,
    showPassword,
    setShowPassword,
    openCreateModal,
    closeCreateModal,
    handleChange,
    handleCreateCashier,
    toggleCashierStatus,
    refresh,
  } = useOwnerStaff();

  const columns: ColumnDef<CashierAccount>[] = [
    {
      header: "Staf Kasir",
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-800 font-bold text-sm shadow-2xs">
            {row.fullName.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-bold text-slate-900 text-sm">{row.fullName}</p>
            <p className="text-xs text-slate-400 font-medium">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      header: "Peran Akun",
      cell: () => (
        <Badge variant="info" size="sm">
          Kasir Toko
        </Badge>
      ),
    },
    {
      header: "Status Akses",
      cell: (row) => (
        <div className="flex items-center gap-3">
          <Switch
            checked={row.isActive}
            onCheckedChange={() => toggleCashierStatus(row.id, row.isActive)}
          />
          <span
            className={`text-xs font-semibold ${
              row.isActive ? "text-emerald-700" : "text-slate-400"
            }`}
          >
            {row.isActive ? "Aktif" : "Nonaktif"}
          </span>
        </div>
      ),
    },
    {
      header: "Tanggal Dibuat",
      cell: (row) => (
        <span className="text-xs text-slate-500">
          {formatDateIndo(row.createdAt)}
        </span>
      ),
    },
  ];

  return (
    <OwnerLayout
      title="Manajemen Staf Kasir"
      subtitle="Kelola akun pengguna kasir toko Anda dan kontrol status izin akses secara real-time"
      actions={
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            isLoading={isLoading}
            className="border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Refresh
          </Button>

          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-md shadow-emerald-600/20 transition duration-150 active:scale-95"
          >
            <UserPlus className="w-4 h-4" />
            <span>Tambah Kasir Baru</span>
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Redesigned Staff KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {/* Total Kasir */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-card hover:shadow-elevated transition duration-200 flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                <span>Total Akun Kasir</span>
              </div>
              <p className="text-3xl font-extrabold text-slate-900 tracking-tight">
                {summary.total}
                <span className="text-sm font-semibold text-slate-400 ml-1.5">Staf</span>
              </p>
              <p className="text-xs text-slate-400 font-medium pt-1">
                Semua kasir terdaftar di toko
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-700 shadow-2xs">
              <Users className="w-6 h-6" />
            </div>
          </div>

          {/* Kasir Aktif */}
          <div className="p-5 rounded-2xl bg-white border border-emerald-200/80 shadow-card hover:shadow-elevated transition duration-200 flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-700">
                <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Kasir Aktif</span>
              </div>
              <p className="text-3xl font-extrabold text-emerald-700 tracking-tight">
                {summary.activeCount}
                <span className="text-sm font-semibold text-emerald-600/70 ml-1.5">Akun</span>
              </p>
              <p className="text-xs text-slate-400 font-medium pt-1">
                Memiliki izin aktif melayani kasir POS
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-2xs">
              <UserCheck className="w-6 h-6" />
            </div>
          </div>

          {/* Kasir Nonaktif */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-card hover:shadow-elevated transition duration-200 flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-rose-600">
                <UserX className="w-3.5 h-3.5 text-rose-500" />
                <span>Kasir Nonaktif</span>
              </div>
              <p className="text-3xl font-extrabold text-rose-700 tracking-tight">
                {summary.inactiveCount}
                <span className="text-sm font-semibold text-rose-500/70 ml-1.5">Akun</span>
              </p>
              <p className="text-xs text-slate-400 font-medium pt-1">
                Akses login kasir ditangguhkan
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shadow-2xs">
              <UserX className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-border shadow-xs">
          <div className="flex-1 max-w-md">
            <Input
              placeholder="Cari berdasarkan nama atau email kasir..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
              className="bg-slate-50 border-slate-200 text-sm"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto">
            <div className="flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setStatusFilter("ALL")}
                className={`px-3 py-1.5 rounded-lg transition ${
                  statusFilter === "ALL"
                    ? "bg-white text-slate-900 shadow-xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Semua ({summary.total})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("ACTIVE")}
                className={`px-3 py-1.5 rounded-lg transition ${
                  statusFilter === "ACTIVE"
                    ? "bg-emerald-600 text-white shadow-xs font-bold"
                    : "text-slate-600 hover:text-emerald-700"
                }`}
              >
                Aktif ({summary.activeCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("INACTIVE")}
                className={`px-3 py-1.5 rounded-lg transition ${
                  statusFilter === "INACTIVE"
                    ? "bg-rose-600 text-white shadow-xs font-bold"
                    : "text-slate-600 hover:text-rose-700"
                }`}
              >
                Nonaktif ({summary.inactiveCount})
              </button>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <DataTable
          columns={columns}
          data={cashiers}
          isLoading={isLoading}
          keyExtractor={(row) => row.id}
          emptyMessage={
            searchQuery
              ? `Tidak ada staf kasir yang cocok dengan pencarian "${searchQuery}".`
              : "Belum ada akun kasir terdaftar untuk toko Anda."
          }
          emptyIcon={<Users className="w-10 h-10 text-slate-300 mb-2" />}
        />
      </div>

      {/* Modal Buat Kasir Baru */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeCreateModal}
        title="Tambah Akun Kasir Baru"
        description="Daftarkan anggota staf kasir yang akan melayani transaksi di toko Anda"
        maxWidth="md"
      >
        <form onSubmit={handleCreateCashier} className="space-y-4 pt-2">
          {modalServerError && (
            <div className="p-3 rounded-xl bg-danger-light border border-danger/20 flex items-start gap-2 text-xs font-semibold text-danger-dark">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{modalServerError}</span>
            </div>
          )}

          {/* Full Name */}
          <Input
            label="Nama Lengkap Kasir"
            type="text"
            placeholder="Contoh: Rina Wijaya"
            value={formData.fullName}
            onChange={(e) => handleChange("fullName", e.target.value)}
            error={errors.fullName}
            leftIcon={<Users className="w-4 h-4" />}
            required
          />

          {/* Email */}
          <Input
            label="Email Akun Kasir"
            type="email"
            placeholder="rina@tokoberkah.com"
            value={formData.email}
            onChange={(e) => handleChange("email", e.target.value)}
            error={errors.email}
            leftIcon={<Mail className="w-4 h-4" />}
            autoComplete="new-email"
            required
          />

          {/* Password */}
          <Input
            label="Password Awal Kasir"
            type={showPassword ? "text" : "password"}
            placeholder="Minimal 8 karakter"
            value={formData.password}
            onChange={(e) => handleChange("password", e.target.value)}
            error={errors.password}
            helperText="Kasir dapat menggunakan password ini untuk login ke modul kasir POS"
            leftIcon={<Lock className="w-4 h-4" />}
            rightIcon={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
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
            autoComplete="new-password"
            required
          />

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={closeCreateModal}
              className="px-5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 font-semibold text-sm shadow-xs transition"
            >
              Batal
            </button>

            <button
              type="submit"
              disabled={isCreating}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-600/25 transition disabled:opacity-50"
            >
              {isCreating ? "Mendaftarkan..." : "Buat Akun Kasir"}
            </button>
          </div>
        </form>
      </Modal>
    </OwnerLayout>
  );
}
