'use client';

import { useMemo, useState } from 'react';
import { Calendar, MagnifyingGlass, Receipt, X } from '@phosphor-icons/react';
import type { Sale } from '@jagoan-pos/contracts';
import { useCashierTransactions } from '@/lib/api/cashier/transactions';
import { getPresetDateRange } from '@/lib/api/owner';
import { formatIdr } from '@/lib/format/currency';
import { formatDateTimeWib } from '@/lib/format/date';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { DataTable, type ColumnDef } from '@/components/ui/data-table';
import { Pagination } from '@/components/ui/pagination';
import { SelectMenu } from '@/components/ui/select-menu';
import { StatusBadge } from '@/components/ui/status-badge';
import { useDebounce } from '@/hooks/use-debounce';
import { ReceiptModal } from './receipt-modal';

export type TransactionDateFilter = '7D' | 'TODAY' | '30D';

export function CashierTransactionsView() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput.trim(), 300);
  const [dateFilter, setDateFilter] = useState<TransactionDateFilter>('7D');

  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  // Compute date range from selected filter
  const { startDate, endDate } = useMemo(() => {
    const range = getPresetDateRange(dateFilter);
    return { startDate: range.from, endDate: range.to };
  }, [dateFilter]);

  const {
    data: paginatedSales,
    isPending,
    isPlaceholderData,
    isError,
    refetch,
  } = useCashierTransactions({
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
          <span className="rounded border border-line bg-surface px-2 py-0.5 font-mono text-xs font-semibold text-ink">
            {sale.transactionNumber}
          </span>
        </div>
      ),
    },
    {
      header: 'Waktu Transaksi',
      accessor: (sale) => (
        <span className="text-xs text-ink-2">{formatDateTimeWib(sale.createdAt) ?? '—'}</span>
      ),
    },
    {
      header: 'Kasir',
      accessor: (sale) => <span className="text-xs font-medium text-ink">{sale.cashierName}</span>,
    },
    {
      header: 'Jumlah Item',
      accessor: (sale) => <span className="text-xs text-ink-2">{sale.totalQuantity} pcs</span>,
    },
    {
      header: 'Total Pembayaran',
      accessor: (sale) => (
        <span className="text-xs font-semibold text-ink">{formatIdr(sale.totalAmount)}</span>
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
      accessor: (sale) => (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => handleOpenReceipt(sale)}
            className="cursor-pointer gap-1.5 text-xs text-ink-2 hover:text-ink"
          >
            <Receipt size={14} weight="duotone" />
            <span>Lihat Struk</span>
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 sm:p-6 lg:p-8">
      {/* Header Section */}
      <header className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.035em] text-ink sm:text-[28px]">
            Riwayat Transaksi
          </h1>
          <p className="mt-1 text-sm text-ink-2">
            Daftar transaksi penjualan kasir toko secara terperinci.
          </p>
        </div>
      </header>

      {/* Filter Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-sm">
          <MagnifyingGlass
            size={16}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3"
            aria-hidden
          />
          <input
            type="search"
            aria-label="Cari transaksi"
            placeholder="Cari no. transaksi / kasir..."
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              setPage(1);
            }}
            className="h-10 w-full rounded-control border border-line bg-surface pl-10 pr-9 text-xs text-ink placeholder:text-ink-3 outline-none transition-[border-color,box-shadow] focus:border-accent-deep focus:ring-2 focus:ring-accent-deep/15"
          />
          {searchInput ? (
            <button
              type="button"
              aria-label="Hapus pencarian"
              onClick={() => {
                setSearchInput('');
                setPage(1);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-ink-3 hover:text-ink"
            >
              <X size={14} />
            </button>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <SelectMenu<TransactionDateFilter>
            ariaLabel="Filter rentang tanggal"
            icon={<Calendar size={14} weight="duotone" />}
            value={dateFilter}
            onChange={(val) => {
              setDateFilter(val);
              setPage(1);
            }}
            options={[
              { value: '7D', label: '7 Hari Terakhir' },
              { value: 'TODAY', label: 'Hari Ini' },
              { value: '30D', label: '30 Hari Terakhir' },
            ]}
          />
        </div>
      </div>

      {/* Error State or Data Table */}
      {isError ? (
        <Banner tone="danger">
          <div className="flex items-center justify-between gap-3">
            <span>Terjadi kesalahan saat memuat data transaksi kasir. Silakan coba lagi.</span>
            <Button type="button" variant="secondary" size="sm" onClick={() => refetch()}>
              Coba Lagi
            </Button>
          </div>
        </Banner>
      ) : (
        <>
          <div className="overflow-hidden rounded-panel border border-line bg-surface shadow-[0_8px_24px_rgba(23,23,26,0.04)]">
            <DataTable
              columns={columns}
              data={salesList}
              keyExtractor={(sale) => sale.id}
              isLoading={isPending && !isPlaceholderData}
              emptyTitle={debouncedSearch ? 'Pencarian tidak ditemukan' : 'Belum ada transaksi'}
              emptyDescription={
                debouncedSearch
                  ? `Tidak ada transaksi yang cocok dengan kata kunci "${debouncedSearch}".`
                  : 'Belum ada transaksi penjualan yang tercatat.'
              }
            />
          </div>

          {/* Pagination Footer */}
          {meta && meta.total > 0 ? (
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
          ) : null}
        </>
      )}

      {/* Receipt Detail Modal */}
      <ReceiptModal
        saleId={selectedSaleId}
        isOpen={isReceiptModalOpen}
        onClose={handleCloseReceipt}
      />
    </div>
  );
}

export { CashierTransactionsView as TransactionsView };
export const TransactionsContent = CashierTransactionsView;
