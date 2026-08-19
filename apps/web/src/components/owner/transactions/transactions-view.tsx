'use client';

import { useMemo, useState } from 'react';
import {
  Calendar,
  MagnifyingGlass,
  Receipt,
  X,
} from '@phosphor-icons/react';
import type { Sale } from '@jagoan-pos/contracts';
import { useTransactions, getPresetDateRange, type OwnerDatePreset } from '@/lib/api/owner';
import { formatIdr } from '@/lib/format/currency';
import { formatDateTimeWib } from '@/lib/format/date';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { DataTable, type ColumnDef } from '@/components/ui/data-table';
import { Pagination } from '@/components/ui/pagination';
import { SelectMenu } from '@/components/ui/select-menu';
import { StatusBadge } from '@/components/ui/status-badge';
import { useDebounce } from '@/hooks/use-debounce';
import { OwnerPageHeader } from '../owner-page-header';
import { ReceiptModal } from './receipt-modal';

export type TransactionDateFilter = 'ALL' | Exclude<OwnerDatePreset, 'MONTH_COMPARISON'>;

export function TransactionsView() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput.trim(), 300);
  const [dateFilter, setDateFilter] = useState<TransactionDateFilter>('ALL');

  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  // Compute date range from selected filter
  const { startDate, endDate } = useMemo(() => {
    if (dateFilter === 'ALL') {
      return { startDate: undefined, endDate: undefined };
    }
    const range = getPresetDateRange(dateFilter);
    return { startDate: range.from, endDate: range.to };
  }, [dateFilter]);

  const {
    data: paginatedSales,
    isPending,
    isPlaceholderData,
    isError,
    refetch,
  } = useTransactions({
    page,
    limit,
    search: debouncedSearch || undefined,
    startDate,
    endDate,
  });

  const handleOpenReceipt = (sale: Sale) => {
    setSelectedSaleId(sale.id);
    setIsReceiptModalOpen(true);
  };

  const handleCloseReceipt = () => {
    setSelectedSaleId(null);
    setIsReceiptModalOpen(false);
  };

  const salesList = paginatedSales?.data ?? [];
  const meta = paginatedSales?.meta;

  const columns: ColumnDef<Sale>[] = [
    {
      header: 'No. Transaksi',
      accessor: (sale) => (
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-semibold rounded bg-surface px-2 py-0.5 border border-line text-ink">
            {sale.transactionNumber}
          </span>
        </div>
      ),
    },
    {
      header: 'Waktu Transaksi',
      accessor: (sale) => (
        <span className="text-xs text-ink-2">
          {formatDateTimeWib(sale.createdAt) ?? '—'}
        </span>
      ),
    },
    {
      header: 'Kasir',
      accessor: (sale) => (
        <span className="text-xs font-medium text-ink">{sale.cashierName}</span>
      ),
    },
    {
      header: 'Jumlah Item',
      accessor: (sale) => (
        <span className="text-xs text-ink-2">{sale.totalQuantity} pcs</span>
      ),
    },
    {
      header: 'Total Transaksi',
      accessor: (sale) => (
        <span className="text-sm font-semibold text-ink">
          {formatIdr(sale.totalAmount)}
        </span>
      ),
    },
    {
      header: 'Status',
      accessor: (sale) => (
        <StatusBadge tone={sale.status === 'COMPLETED' ? 'success' : 'danger'}>
          {sale.status === 'COMPLETED' ? 'Selesai' : 'Dibatalkan'}
        </StatusBadge>
      ),
    },
    {
      header: 'Aksi',
      headerClassName: 'text-right',
      className: 'text-right',
      accessor: (sale) => (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => handleOpenReceipt(sale)}
          className="gap-1.5 shadow-xs"
        >
          <Receipt size={14} weight="duotone" />
          <span>Lihat Struk</span>
        </Button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <OwnerPageHeader
        title="Riwayat Transaksi"
        subtitle="Pantau seluruh riwayat transaksi penjualan toko, cek rincian pembayaran, dan cetak struk."
      />

      {/* Error state */}
      {isError ? (
        <div className="flex flex-col items-start gap-3">
          <Banner tone="danger">Gagal memuat riwayat transaksi penjualan.</Banner>
          <Button variant="secondary" size="sm" onClick={() => void refetch()}>
            Coba lagi
          </Button>
        </div>
      ) : null}

      {/* Table & Controls Section */}
      <div className="flex flex-col gap-4 rounded-panel border border-line bg-surface p-5 shadow-xs">
        {/* Toolbar: Search + Date Filter */}
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
              onChange={(e) => {
                setSearchInput(e.target.value);
                setPage(1);
              }}
              placeholder="Cari nomor struk atau kasir…"
              className="h-10 w-full rounded-control border border-line bg-paper pl-9 pr-8 text-sm text-ink placeholder:text-ink-2 focus:border-accent focus:bg-surface focus:outline-none"
            />
            {searchInput ? (
              <button
                type="button"
                onClick={() => {
                  setSearchInput('');
                  setPage(1);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-2 hover:text-ink"
                aria-label="Bersihkan pencarian"
              >
                <X size={14} weight="bold" />
              </button>
            ) : null}
          </div>

          <div className="flex items-center gap-3">
            {/* Date Preset Filter */}
            <SelectMenu<TransactionDateFilter>
              value={dateFilter}
              onChange={(val) => {
                setDateFilter(val);
                setPage(1);
              }}
              ariaLabel="Filter periode transaksi"
              icon={<Calendar size={14} weight="duotone" />}
              options={[
                { value: 'ALL', label: 'Semua Periode' },
                { value: 'TODAY', label: 'Hari Ini' },
                { value: '7D', label: '7 Hari Terakhir' },
                { value: '30D', label: '30 Hari Terakhir' },
              ]}
            />
          </div>
        </div>

        {/* Data Table */}
        <DataTable
          columns={columns}
          data={salesList}
          isLoading={isPending && !isPlaceholderData}
          keyExtractor={(sale) => sale.id}
          emptyTitle={debouncedSearch ? 'Pencarian tidak ditemukan' : 'Belum ada transaksi'}
          emptyDescription={
            debouncedSearch
              ? `Tidak ada transaksi yang cocok dengan kata kunci "${debouncedSearch}".`
              : 'Belum ada catatan transaksi penjualan pada periode ini.'
          }
        />

        {/* Server Pagination */}
        {meta && meta.total > 0 ? (
          <div className="pt-2">
            <Pagination
              currentPage={meta.page}
              totalPages={meta.totalPages}
              pageSize={meta.limit}
              totalItems={meta.total}
              onPageChange={(nextPage) => setPage(nextPage)}
              onPageSizeChange={(nextLimit) => {
                setLimit(nextLimit);
                setPage(1);
              }}
            />
          </div>
        ) : null}
      </div>

      {/* Modal Detail Struk */}
      <ReceiptModal
        saleId={selectedSaleId}
        isOpen={isReceiptModalOpen}
        onClose={handleCloseReceipt}
      />
    </div>
  );
}

// Alias export for plan spec compatibility
export const TransactionsContent = TransactionsView;
