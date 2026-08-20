'use client';

import { useState } from 'react';
import {
  Cube,
  Funnel,
  MagnifyingGlass,
  Package,
  PencilSimple,
  Warning,
  WarningOctagon,
  X,
} from '@phosphor-icons/react';
import type { MerchantStockItem } from '@jagoan-pos/contracts';
import { useAdjustStock, useInventoryList, useInventorySummary } from '@/lib/api/owner';
import { formatIdr } from '@/lib/format/currency';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { DataTable, type ColumnDef } from '@/components/ui/data-table';
import { Pagination } from '@/components/ui/pagination';
import { SelectMenu } from '@/components/ui/select-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/ui/status-badge';
import { useDebounce } from '@/hooks/use-debounce';
import { MetricCard } from '../metric-card';
import { OwnerPageHeader } from '../owner-page-header';
import { StockAdjustModal } from './stock-adjust-modal';

export type CatalogStatusFilterType = 'ALL' | 'ACTIVE' | 'INACTIVE';

export function InventoryView() {
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput.trim(), 300);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [catalogFilter, setCatalogFilter] = useState<CatalogStatusFilterType>('ALL');

  const [selectedItem, setSelectedItem] = useState<MerchantStockItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  const activeOnlyParam =
    catalogFilter === 'ACTIVE' ? true : catalogFilter === 'INACTIVE' ? false : undefined;

  const {
    data: summary,
    isPending: isSummaryPending,
    isError: isSummaryError,
    refetch: refetchSummary,
  } = useInventorySummary();

  const {
    data: paginatedData,
    isPending: isListPending,
    isPlaceholderData,
    isError: isListError,
    refetch: refetchList,
  } = useInventoryList({
    page,
    limit,
    search: debouncedSearch || undefined,
    activeOnly: activeOnlyParam,
  });

  const adjustStockMutation = useAdjustStock();

  const handleOpenModal = (item: MerchantStockItem) => {
    setSelectedItem(item);
    setIsModalOpen(true);
    setActionSuccessMessage(null);
  };

  const handleCloseModal = () => {
    setSelectedItem(null);
    setIsModalOpen(false);
  };

  const handleSaveStock = async (productId: string, stockQuantity: number) => {
    await adjustStockMutation.mutateAsync({ productId, stockQuantity });
    setActionSuccessMessage(
      `Stok ${selectedItem?.name ?? 'produk'} berhasil diperbarui menjadi ${stockQuantity} pcs.`,
    );
  };

  const items = paginatedData?.data ?? [];

  const columns: ColumnDef<MerchantStockItem>[] = [
    {
      header: 'Produk & SKU',
      accessor: (item) => {
        const thumbnail = item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.name}
            loading="lazy"
            decoding="async"
            className="h-10 w-10 shrink-0 rounded-control border border-line bg-paper object-cover"
          />
        ) : (
          <div
            role="img"
            aria-label={`Tidak ada gambar untuk ${item.name}`}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control border border-line bg-paper text-ink-2"
          >
            <Package size={18} weight="duotone" aria-hidden="true" />
          </div>
        );

        return (
          <div className="flex min-w-40 items-center gap-3">
            {thumbnail}
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="truncate font-semibold text-ink">{item.name}</span>
              <span className="font-mono text-xs text-ink-2">{item.sku}</span>
            </div>
          </div>
        );
      },
    },
    {
      header: 'Harga Satuan',
      accessor: (item) => (
        <span className="font-medium text-ink">{formatIdr(item.currentPrice)}</span>
      ),
    },
    {
      header: 'Status Stok',
      accessor: (item) => {
        if (item.stockQuantity === 0) {
          return <StatusBadge tone="danger">Habis</StatusBadge>;
        }
        if (item.stockQuantity <= 10) {
          return <StatusBadge tone="warning">Menipis</StatusBadge>;
        }
        return <StatusBadge tone="success">Aman</StatusBadge>;
      },
    },
    {
      header: 'Stok Fisik',
      accessor: (item) => (
        <span className="font-mono font-bold text-ink">{item.stockQuantity} pcs</span>
      ),
    },
    {
      header: 'Katalog',
      accessor: (item) => (
        <StatusBadge tone={item.isActive ? 'success' : 'default'}>
          {item.isActive ? 'Aktif' : 'Nonaktif'}
        </StatusBadge>
      ),
    },
    {
      header: 'Aksi',
      headerClassName: 'text-right',
      className: 'text-right',
      accessor: (item) => (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => handleOpenModal(item)}
          className="gap-1.5"
        >
          <PencilSimple size={14} weight="bold" />
          <span>Ubah Stok</span>
        </Button>
      ),
    },
  ];

  const totalCount = paginatedData?.meta.total ?? 0;
  const totalPages = paginatedData?.meta.totalPages ?? 1;

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <OwnerPageHeader
        title="Manajemen Stok & Inventori"
        subtitle="Pantau stok fisik toko, deteksi produk menipis, dan lakukan penyesuaian stok barang secara langsung."
      />

      {/* Action Success Notification */}
      {actionSuccessMessage ? (
        <Banner tone="success">{actionSuccessMessage}</Banner>
      ) : null}

      {/* Error state */}
      {isSummaryError || isListError ? (
        <div className="flex flex-col items-start gap-3">
          <Banner tone="danger">Gagal memuat data inventori stok.</Banner>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              void refetchSummary();
              void refetchList();
            }}
          >
            Coba lagi
          </Button>
        </div>
      ) : null}

      {/* KPI Metric Cards */}
      {isSummaryPending ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Total Produk SKU"
            value={`${summary.totalProducts} produk`}
            description="Item terdaftar di katalog"
            icon={Package}
          />
          <MetricCard
            label="Total Unit Fisik"
            value={`${summary.totalStockUnits} pcs`}
            description="Akumulasi stok seluruh barang"
            icon={Cube}
          />
          <MetricCard
            label="Stok Menipis"
            value={`${summary.lowStockCount} SKU`}
            description="Stok di bawah batas aman (<= 10)"
            tone={summary.lowStockCount > 0 ? 'warning' : 'default'}
            icon={Warning}
          />
          <MetricCard
            label="Stok Habis"
            value={`${summary.outOfStockCount} SKU`}
            description="Perlu restock segera"
            tone={summary.outOfStockCount > 0 ? 'danger' : 'default'}
            icon={WarningOctagon}
          />
        </div>
      ) : null}

      {/* Table & Controls Section */}
      <div className="flex flex-col gap-4 rounded-panel border border-line bg-surface p-5 shadow-xs">
        {/* Toolbar: Search + Catalog Filter */}
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
              placeholder="Cari nama produk atau SKU…"
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
            {/* Catalog Status Filter (activeOnly) */}
            <SelectMenu<CatalogStatusFilterType>
              value={catalogFilter}
              onChange={(newVal) => {
                setCatalogFilter(newVal);
                setPage(1);
              }}
              ariaLabel="Filter status katalog"
              icon={<Funnel size={14} weight="duotone" />}
              options={[
                { value: 'ALL', label: 'Semua Produk' },
                { value: 'ACTIVE', label: 'Katalog: Aktif' },
                { value: 'INACTIVE', label: 'Katalog: Nonaktif' },
              ]}
            />
          </div>
        </div>

        {/* Data Table */}
        <DataTable
          columns={columns}
          data={items}
          isLoading={isListPending || isPlaceholderData}
          keyExtractor={(item) => item.productId}
          emptyTitle={debouncedSearch ? 'Pencarian tidak ditemukan' : 'Belum ada data stok'}
          emptyDescription={
            debouncedSearch
              ? `Tidak ada produk inventori yang cocok dengan pencarian "${debouncedSearch}".`
              : 'Belum ada data stok produk pada inventori toko Anda.'
          }
        />

        {/* Pagination with Limit Selector */}
        {totalCount > 0 ? (
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
            totalItems={totalCount}
            pageSize={limit}
            onPageSizeChange={(newLimit) => {
              setLimit(newLimit);
              setPage(1);
            }}
          />
        ) : null}
      </div>

      {/* Modal Penyesuaian Stok */}
      <StockAdjustModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        item={selectedItem}
        onSave={handleSaveStock}
        isSaving={adjustStockMutation.isPending}
      />
    </div>
  );
}
