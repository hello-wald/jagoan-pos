import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { InventoryView } from './inventory-view';
import * as ownerInventoryApi from '@/lib/api/owner';
import type { InventorySummary, MerchantStockItem } from '@jagoan-pos/contracts';

vi.mock('@/lib/api/owner');

const mockSummary: InventorySummary = {
  totalProducts: 12,
  totalStockUnits: 340,
  lowStockCount: 2,
  outOfStockCount: 1,
};

const PRODUCT_IMAGE_URL = 'https://cdn.example/products/kopi-susu-aren.png';

const mockItems: MerchantStockItem[] = [
  {
    productId: 'prod-1',
    sku: 'KOP-001',
    name: 'Kopi Susu Aren',
    imageUrl: PRODUCT_IMAGE_URL,
    currentPrice: 18000,
    stockQuantity: 25,
    isActive: true,
    updatedAt: '2026-08-19T08:00:00.000Z',
  },
  {
    productId: 'prod-2',
    sku: 'TEA-002',
    name: 'Teh Melati',
    imageUrl: null,
    currentPrice: 8000,
    stockQuantity: 5,
    isActive: true,
    updatedAt: '2026-08-19T08:00:00.000Z',
  },
  {
    productId: 'prod-3',
    sku: 'CRS-003',
    name: 'Croissant Butter',
    imageUrl: null,
    currentPrice: 22000,
    stockQuantity: 0,
    isActive: false,
    updatedAt: '2026-08-19T08:00:00.000Z',
  },
];

const mockListResult = {
  data: {
    data: mockItems,
    meta: {
      total: 3,
      page: 1,
      limit: 10,
      totalPages: 1,
    },
  },
  isPending: false,
  isPlaceholderData: false,
  isError: false,
  refetch: vi.fn(),
};

const mutateAsyncMock = vi.fn();
const refetchSummaryMock = vi.fn();
const refetchListMock = vi.fn();

beforeEach(() => {
  mutateAsyncMock.mockReset();
  refetchSummaryMock.mockReset();
  refetchListMock.mockReset();

  vi.spyOn(ownerInventoryApi, 'useInventorySummary').mockReturnValue({
    data: mockSummary,
    isPending: false,
    isError: false,
    refetch: refetchSummaryMock,
  } as unknown as ReturnType<typeof ownerInventoryApi.useInventorySummary>);

  vi.spyOn(ownerInventoryApi, 'useInventoryList').mockReturnValue({
    ...mockListResult,
    refetch: refetchListMock,
  } as unknown as ReturnType<typeof ownerInventoryApi.useInventoryList>);

  vi.spyOn(ownerInventoryApi, 'useAdjustStock').mockReturnValue({
    mutateAsync: mutateAsyncMock,
    isPending: false,
  } as unknown as ReturnType<typeof ownerInventoryApi.useAdjustStock>);
});

describe('InventoryView', () => {
  it('renders headline summary cards correctly', () => {
    render(<InventoryView />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Manajemen Stok & Inventori');
    expect(screen.getByText('12 produk')).toBeInTheDocument();
    expect(screen.getByText('340 pcs')).toBeInTheDocument();
    expect(screen.getByText('2 SKU')).toBeInTheDocument();
    expect(screen.getByText('1 SKU')).toBeInTheDocument();
  });

  it('renders stock item rows and formatted values in table', () => {
    render(<InventoryView />);

    expect(screen.getByText('Kopi Susu Aren')).toBeInTheDocument();
    expect(screen.getByText('KOP-001')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Kopi Susu Aren' })).toHaveAttribute(
      'src',
      PRODUCT_IMAGE_URL,
    );
    expect(screen.getByText('Rp 18.000')).toBeInTheDocument();
    expect(screen.getByText('25 pcs')).toBeInTheDocument();
    expect(screen.getByText('Aman')).toBeInTheDocument();

    expect(screen.getByText('Teh Melati')).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: 'Tidak ada gambar untuk Teh Melati' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Menipis')).toBeInTheDocument();

    expect(screen.getByText('Croissant Butter')).toBeInTheDocument();
    expect(screen.getByText('Habis')).toBeInTheDocument();
  });

  it('debounces search input and calls list query', async () => {
    const listSpy = vi.spyOn(ownerInventoryApi, 'useInventoryList').mockReturnValue(
      mockListResult as unknown as ReturnType<typeof ownerInventoryApi.useInventoryList>,
    );

    render(<InventoryView />);

    const searchInput = screen.getByPlaceholderText('Cari nama produk atau SKU…');
    fireEvent.change(searchInput, { target: { value: 'Kopi' } });

    await waitFor(
      () => {
        expect(listSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            search: 'Kopi',
          }),
        );
      },
      { timeout: 1000 },
    );
  });

  it('filters by catalog active status', () => {
    const listSpy = vi.spyOn(ownerInventoryApi, 'useInventoryList').mockReturnValue(
      mockListResult as unknown as ReturnType<typeof ownerInventoryApi.useInventoryList>,
    );

    render(<InventoryView />);

    // Open custom SelectMenu dropdown and choose 'Katalog: Aktif'
    fireEvent.click(screen.getByRole('combobox', { name: 'Filter status katalog' }));
    fireEvent.click(screen.getByRole('option', { name: 'Katalog: Aktif' }));

    expect(listSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        activeOnly: true,
      }),
    );
  });

  it('changes page size limit via pagination select', () => {
    const listSpy = vi.spyOn(ownerInventoryApi, 'useInventoryList').mockReturnValue(
      mockListResult as unknown as ReturnType<typeof ownerInventoryApi.useInventoryList>,
    );

    render(<InventoryView />);

    // Open custom pagination SelectMenu and choose '20 / hal'
    fireEvent.click(screen.getByRole('combobox', { name: 'Jumlah item per halaman' }));
    fireEvent.click(screen.getByRole('option', { name: '20 / hal' }));

    expect(listSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        limit: 20,
        page: 1,
      }),
    );
  });

  it('opens adjust stock modal and saves valid new stock value', async () => {
    mutateAsyncMock.mockResolvedValueOnce({
      id: 'stock-1',
      productId: 'prod-1',
      stockQuantity: 30,
    });

    render(<InventoryView />);

    const adjustButtons = screen.getAllByRole('button', { name: /Ubah Stok/i });
    fireEvent.click(adjustButtons[0]);

    // Modal is open
    expect(screen.getByRole('heading', { level: 2, name: 'Penyesuaian Stok Fisik' })).toBeInTheDocument();
    expect(screen.getByDisplayValue('25')).toBeInTheDocument();

    // Click '+5' quick delta button
    fireEvent.click(screen.getByRole('button', { name: '+5' }));
    expect(screen.getByDisplayValue('30')).toBeInTheDocument();

    // Click 'Simpan Stok Baru' submit button
    fireEvent.click(screen.getByRole('button', { name: 'Simpan Stok Baru' }));

    await waitFor(() => {
      expect(mutateAsyncMock).toHaveBeenCalledWith({
        productId: 'prod-1',
        stockQuantity: 30,
      });
    });

    // Success banner is displayed
    await waitFor(() => {
      expect(screen.getByText(/Stok Kopi Susu Aren berhasil diperbarui menjadi 30 pcs/i)).toBeInTheDocument();
    });
  });

  it('rejects invalid float or negative stock in modal without mutating', async () => {
    render(<InventoryView />);

    const adjustButtons = screen.getAllByRole('button', { name: /Ubah Stok/i });
    fireEvent.click(adjustButtons[0]);

    const input = screen.getByRole('textbox', { name: /Jumlah Stok Baru/i });

    // Type float value
    fireEvent.change(input, { target: { value: '1.5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Simpan Stok Baru' }));

    expect(screen.getByText(/Jumlah stok harus berupa bilangan bulat positif/i)).toBeInTheDocument();
    expect(mutateAsyncMock).not.toHaveBeenCalled();

    // Type negative value
    fireEvent.change(input, { target: { value: '-10' } });
    fireEvent.click(screen.getByRole('button', { name: 'Simpan Stok Baru' }));

    expect(screen.getByText(/Jumlah stok harus berupa bilangan bulat positif/i)).toBeInTheDocument();
    expect(mutateAsyncMock).not.toHaveBeenCalled();
  });

  it('handles mutation rejection and displays error banner in modal', async () => {
    mutateAsyncMock.mockRejectedValueOnce(new Error('Network server timeout'));

    render(<InventoryView />);

    const adjustButtons = screen.getAllByRole('button', { name: /Ubah Stok/i });
    fireEvent.click(adjustButtons[0]);

    fireEvent.click(screen.getByRole('button', { name: '+10' }));
    fireEvent.click(screen.getByRole('button', { name: 'Simpan Stok Baru' }));

    await waitFor(() => {
      expect(screen.getByText('Network server timeout')).toBeInTheDocument();
    });
  });

  it('renders error banner when inventory API fails and retries', () => {
    vi.spyOn(ownerInventoryApi, 'useInventorySummary').mockReturnValue({
      data: undefined,
      isPending: false,
      isError: true,
      refetch: refetchSummaryMock,
    } as unknown as ReturnType<typeof ownerInventoryApi.useInventorySummary>);

    render(<InventoryView />);

    expect(screen.getByText('Gagal memuat data inventori stok.')).toBeInTheDocument();

    const retryBtn = screen.getByRole('button', { name: 'Coba lagi' });
    fireEvent.click(retryBtn);

    expect(refetchSummaryMock).toHaveBeenCalled();
  });
});
