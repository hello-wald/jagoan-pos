'use client';

import { useMemo, useState } from 'react';
import {
  Funnel,
  MagnifyingGlass,
  Plus,
  ShieldCheck,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
  X,
} from '@phosphor-icons/react';
import type {
  AppErrorCode,
  CreateCashierInput,
  UserSummary,
} from '@jagoan-pos/contracts';
import { useCashiers, useCreateCashier, useSetCashierActive } from '@/lib/api/owner';
import { messageFor } from '@/lib/i18n/messages';
import { formatDateWib } from '@/lib/format/date';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { DataTable, type ColumnDef } from '@/components/ui/data-table';
import { SelectMenu } from '@/components/ui/select-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { useDebounce } from '@/hooks/use-debounce';
import { CreateCashierModal } from './create-cashier-modal';
import { MetricCard } from '../metric-card';
import { OwnerPageHeader } from '../owner-page-header';

export type StaffStatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';

export function StaffView() {
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput.trim(), 300);
  const [statusFilter, setStatusFilter] = useState<StaffStatusFilter>('ALL');

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);
  const [actionErrorMessage, setActionErrorMessage] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const { data: cashierData, isPending, isError, refetch } = useCashiers();
  const createCashierMutation = useCreateCashier();
  const setCashierActiveMutation = useSetCashierActive();

  const handleCreateCashier = async (dto: CreateCashierInput) => {
    setActionErrorMessage(null);
    await createCashierMutation.mutateAsync(dto);
    setActionSuccessMessage(`Kasir "${dto.fullName}" berhasil didaftarkan.`);
  };

  const handleToggleStatus = async (user: UserSummary) => {
    setActionErrorMessage(null);
    setActionSuccessMessage(null);
    const nextStatus = !user.isActive;
    setTogglingId(user.id);

    try {
      await setCashierActiveMutation.mutateAsync({
        cashierId: user.id,
        isActive: nextStatus,
      });
      setActionSuccessMessage(
        `Status kasir "${user.fullName}" berhasil diubah menjadi ${
          nextStatus ? 'Aktif' : 'Nonaktif'
        }.`,
      );
    } catch (err: unknown) {
      const errObj = err as { code?: AppErrorCode; message?: string } | null;
      const msg =
        (errObj?.code ? messageFor(errObj.code) : null) ??
        errObj?.message ??
        (err instanceof Error ? err.message : 'Gagal mengubah status kasir.');
      setActionErrorMessage(msg);
    } finally {
      setTogglingId(null);
    }
  };

  const filteredCashiers = useMemo(() => {
    const rawList = cashierData?.data ?? [];
    return rawList.filter((user) => {
      // Search match
      if (debouncedSearch) {
        const query = debouncedSearch.toLowerCase();
        const matchesName = user.fullName.toLowerCase().includes(query);
        const matchesEmail = user.email.toLowerCase().includes(query);
        if (!matchesName && !matchesEmail) return false;
      }
      // Status match
      if (statusFilter === 'ACTIVE' && !user.isActive) return false;
      if (statusFilter === 'INACTIVE' && user.isActive) return false;

      return true;
    });
  }, [cashierData?.data, debouncedSearch, statusFilter]);

  const summary = cashierData?.summary;

  const columns: ColumnDef<UserSummary>[] = [
    {
      header: 'Nama & Email Kasir',
      accessor: (user) => (
        <div className="flex items-center gap-3 min-w-[200px]">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-bold text-accent-deep border border-accent/20">
            {user.fullName.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-semibold text-ink truncate">{user.fullName}</span>
            <span className="text-xs text-ink-2 truncate">{user.email}</span>
          </div>
        </div>
      ),
    },
    {
      header: 'Role Akun',
      accessor: () => (
        <div className="flex items-center gap-1.5">
          <ShieldCheck size={15} weight="duotone" className="text-accent-deep" />
          <span className="text-xs font-medium text-ink">Kasir Toko</span>
        </div>
      ),
    },
    {
      header: 'Terdaftar Pada',
      accessor: (user) => (
        <span className="text-xs text-ink-2">
          {formatDateWib(user.createdAt) ?? '—'}
        </span>
      ),
    },
    {
      header: 'Status & Akses',
      headerClassName: 'text-right',
      className: 'text-right',
      accessor: (user) => {
        const isToggling = togglingId === user.id;
        return (
          <div className="inline-flex items-center justify-end gap-2.5">
            <span
              className={`text-xs font-semibold ${
                user.isActive ? 'text-success' : 'text-ink-2'
              }`}
            >
              {user.isActive ? 'Aktif' : 'Nonaktif'}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={user.isActive}
              aria-label={`Ubah status kasir ${user.fullName}`}
              onClick={() => void handleToggleStatus(user)}
              disabled={isToggling}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-accent-deep/30 disabled:opacity-50 ${
                user.isActive ? 'bg-accent' : 'bg-line'
              }`}
            >
              <span
                aria-hidden="true"
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                  user.isActive ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header with Add Cashier Button */}
      <OwnerPageHeader
        title="Manajemen Kasir & Staf"
        subtitle="Kelola akun kasir toko, tambahkan staf baru, dan pantau status aktif kasir Anda."
        actions={
          <Button
            onClick={() => {
              setActionSuccessMessage(null);
              setActionErrorMessage(null);
              setIsCreateModalOpen(true);
            }}
            className="gap-2 shadow-xs"
          >
            <Plus size={16} weight="bold" />
            <span>Tambah Kasir</span>
          </Button>
        }
      />

      {/* Notifications */}
      {actionSuccessMessage ? (
        <Banner tone="success">{actionSuccessMessage}</Banner>
      ) : null}
      {actionErrorMessage ? (
        <Banner tone="danger">{actionErrorMessage}</Banner>
      ) : null}

      {/* Error state */}
      {isError ? (
        <div className="flex flex-col items-start gap-3">
          <Banner tone="danger">Gagal memuat data staf kasir.</Banner>
          <Button variant="secondary" size="sm" onClick={() => void refetch()}>
            Coba lagi
          </Button>
        </div>
      ) : null}

      {/* KPI Metric Cards */}
      {isPending ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <div
              key={i}
              className="flex flex-col gap-3 rounded-panel border border-line bg-surface p-5"
            >
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
          ))}
        </div>
      ) : summary ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <MetricCard
            label="Total Kasir Terdaftar"
            value={`${summary.total} staf`}
            description="Seluruh akun kasir terdaftar"
            icon={Users}
          />
          <MetricCard
            label="Kasir Aktif"
            value={`${summary.active} staf`}
            description="Dapat login dan melakukan transaksi"
            tone={summary.active > 0 ? 'success' : 'default'}
            icon={UserCheck}
          />
          <MetricCard
            label="Kasir Nonaktif"
            value={`${summary.inactive} staf`}
            description="Akses login ditangguhkan"
            icon={UserMinus}
          />
        </div>
      ) : null}

      {/* Table & Controls Section */}
      <div className="flex flex-col gap-4 rounded-panel border border-line bg-surface p-5 shadow-xs">
        {/* Toolbar: Search + Status Filter */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Search Input with Debounce and Clear Button */}
          <div className="relative w-full sm:w-80">
            <MagnifyingGlass
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-2"
            />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Cari nama atau email kasir…"
              className="h-10 w-full rounded-control border border-line bg-paper pl-9 pr-8 text-sm text-ink placeholder:text-ink-2 focus:border-accent focus:bg-surface focus:outline-none"
            />
            {searchInput ? (
              <button
                type="button"
                onClick={() => setSearchInput('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-2 hover:text-ink"
                aria-label="Bersihkan pencarian"
              >
                <X size={14} weight="bold" />
              </button>
            ) : null}
          </div>

          <div className="flex items-center gap-3">
            {/* Status Filter */}
            <SelectMenu<StaffStatusFilter>
              value={statusFilter}
              onChange={setStatusFilter}
              ariaLabel="Filter status akun kasir"
              icon={<Funnel size={14} weight="duotone" />}
              options={[
                { value: 'ALL', label: 'Semua Status' },
                { value: 'ACTIVE', label: 'Status: Aktif' },
                { value: 'INACTIVE', label: 'Status: Nonaktif' },
              ]}
            />
          </div>
        </div>

        {/* Data Table */}
        <DataTable
          columns={columns}
          data={filteredCashiers}
          isLoading={isPending}
          keyExtractor={(user) => user.id}
          emptyTitle={debouncedSearch ? 'Pencarian tidak ditemukan' : 'Belum ada staf kasir'}
          emptyDescription={
            debouncedSearch
              ? `Tidak ada staf kasir yang cocok dengan pencarian "${debouncedSearch}".`
              : 'Belum ada akun kasir terdaftar. Daftarkan kasir pertama Anda sekarang.'
          }
          emptyAction={
            !debouncedSearch ? (
              <Button
                onClick={() => setIsCreateModalOpen(true)}
                size="sm"
                className="gap-1.5 mt-2"
              >
                <UserPlus size={14} weight="bold" />
                <span>Tambah Kasir</span>
              </Button>
            ) : undefined
          }
        />
      </div>

      {/* Modal Tambah Kasir */}
      <CreateCashierModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateCashier}
        isSubmitting={createCashierMutation.isPending}
      />
    </div>
  );
}

// Alias export for plan spec compatibility
export const StaffContent = StaffView;
