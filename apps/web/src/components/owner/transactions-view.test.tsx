import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { TransactionsView } from './transactions-view';
import * as ownerTransactionsApi from '@/lib/api/owner-transactions';
import type { PaginatedSales, Sale } from '@jagoan-pos/contracts';

vi.mock('@/lib/api/owner-transactions');

const mockSales: Sale[] = [
  {
    id: 'sale-1',
    merchantId: 'merch-1',
    merchantName: 'Toko Kopi Senja',
    cashierId: 'cashier-1',
    cashierName: 'Budi Kasir',
    transactionNumber: 'TRX-20260819-001',
    status: 'COMPLETED',
    totalQuantity: 2,
    totalAmount: 45000,
    cashReceived: 50000,
    changeAmount: 5000,
    createdAt: '2026-08-19T08:30:00.000Z',
    items: [
      {
        id: 'line-1',
        productId: 'prod-1',
        productName: 'Kopi Susu Gula Aren',
        sku: 'KOP-001',
        unitPrice: 20000,
        quantity: 2,
        subtotal: 40000,
      },
      {
        id: 'line-2',
        productId: 'prod-2',
        productName: 'Donat Coklat',
        sku: 'DNT-001',
        unitPrice: 5000,
        quantity: 1,
        subtotal: 5000,
      },
    ],
  },
  {
    id: 'sale-2',
    merchantId: 'merch-1',
    merchantName: 'Toko Kopi Senja',
    cashierId: 'cashier-2',
    cashierName: 'Siti Rahma',
    transactionNumber: 'TRX-20260819-002',
    status: 'VOIDED',
    totalQuantity: 1,
    totalAmount: 25000,
    cashReceived: 25000,
    changeAmount: 0,
    createdAt: '2026-08-19T09:15:00.000Z',
    items: [
      {
        id: 'line-3',
        productId: 'prod-3',
        productName: 'Croissant Butter',
        sku: 'CRS-001',
        unitPrice: 25000,
        quantity: 1,
        subtotal: 25000,
      },
    ],
  },
];

const mockPaginatedSales: PaginatedSales = {
  data: mockSales,
  meta: {
    total: 2,
    page: 1,
    limit: 10,
    totalPages: 1,
  },
};

const refetchMock = vi.fn();

beforeEach(() => {
  refetchMock.mockReset();

  vi.spyOn(ownerTransactionsApi, 'useTransactions').mockImplementation((_params) => {
    return {
      data: mockPaginatedSales,
      isPending: false,
      isPlaceholderData: false,
      isError: false,
      refetch: refetchMock,
    } as unknown as ReturnType<typeof ownerTransactionsApi.useTransactions>;
  });

  vi.spyOn(ownerTransactionsApi, 'useTransaction').mockImplementation((id) => {
    const found = mockSales.find((s) => s.id === id);
    return {
      data: found,
      isPending: false,
      isError: false,
    } as unknown as ReturnType<typeof ownerTransactionsApi.useTransaction>;
  });
});

describe('TransactionsView', () => {
  it('renders transactions table with sales data', () => {
    render(<TransactionsView />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Riwayat Transaksi');
    expect(screen.getByText('TRX-20260819-001')).toBeInTheDocument();
    expect(screen.getByText('Budi Kasir')).toBeInTheDocument();
    expect(screen.getByText('Rp 45.000')).toBeInTheDocument();
    expect(screen.getByText('Selesai')).toBeInTheDocument();

    expect(screen.getByText('TRX-20260819-002')).toBeInTheDocument();
    expect(screen.getByText('Siti Rahma')).toBeInTheDocument();
    expect(screen.getByText('Rp 25.000')).toBeInTheDocument();
    expect(screen.getByText('Dibatalkan')).toBeInTheDocument();
  });

  it('debounces search input and triggers query with search param', async () => {
    const useTransactionsSpy = vi.spyOn(ownerTransactionsApi, 'useTransactions');
    render(<TransactionsView />);

    const searchInput = screen.getByPlaceholderText('Cari nomor struk atau kasir…');
    fireEvent.change(searchInput, { target: { value: 'TRX-001' } });

    await waitFor(() => {
      expect(useTransactionsSpy).toHaveBeenLastCalledWith(
        expect.objectContaining({
          search: 'TRX-001',
          page: 1,
        }),
      );
    });
  });

  it('filters by date preset using SelectMenu', () => {
    const useTransactionsSpy = vi.spyOn(ownerTransactionsApi, 'useTransactions');
    render(<TransactionsView />);

    // Open date filter dropdown and select 'Hari Ini'
    fireEvent.click(screen.getByRole('combobox', { name: 'Filter periode transaksi' }));
    fireEvent.click(screen.getByRole('option', { name: 'Hari Ini' }));

    expect(useTransactionsSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({
        startDate: expect.any(String),
        endDate: expect.any(String),
        page: 1,
      }),
    );
  });

  it('opens receipt modal when clicking "Lihat Struk"', async () => {
    const useTransactionSpy = vi.spyOn(ownerTransactionsApi, 'useTransaction');
    render(<TransactionsView />);

    const receiptButtons = screen.getAllByRole('button', { name: /Lihat Struk/i });
    fireEvent.click(receiptButtons[0]);

    // Modal opens
    expect(screen.getByRole('heading', { level: 2, name: 'Detail Struk Pembayaran' })).toBeInTheDocument();

    // Requests detail from /transactions/:id
    expect(useTransactionSpy).toHaveBeenCalledWith('sale-1');

    // Displays items, total, cash received, and change amount
    expect(screen.getByText('Kopi Susu Gula Aren')).toBeInTheDocument();
    expect(screen.getByText('Donat Coklat')).toBeInTheDocument();
    expect(screen.getByText('Tunai Diterima')).toBeInTheDocument();
    expect(screen.getByText('Rp 50.000')).toBeInTheDocument();
    expect(screen.getByText('Kembalian')).toBeInTheDocument();
    expect(screen.getAllByText('Rp 5.000')).toHaveLength(2);

    // Close modal
    fireEvent.click(screen.getByRole('button', { name: 'Tutup Struk' }));
    await waitFor(() => {
      expect(screen.queryByRole('heading', { level: 2, name: 'Detail Struk Pembayaran' })).not.toBeInTheDocument();
    });
  });

  it('renders empty state when no transactions match filter and hides pagination', () => {
    vi.spyOn(ownerTransactionsApi, 'useTransactions').mockReturnValue({
      data: {
        data: [],
        meta: { total: 0, page: 1, limit: 10, totalPages: 1 },
      },
      isPending: false,
      isPlaceholderData: false,
      isError: false,
      refetch: refetchMock,
    } as unknown as ReturnType<typeof ownerTransactionsApi.useTransactions>);

    render(<TransactionsView />);

    expect(screen.getByText('Belum ada transaksi')).toBeInTheDocument();
    expect(screen.getByText('Belum ada catatan transaksi penjualan pada periode ini.')).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Navigasi halaman' })).not.toBeInTheDocument();
  });

  it('renders error banner when loading transactions fails and allows retry', () => {
    vi.spyOn(ownerTransactionsApi, 'useTransactions').mockReturnValue({
      data: undefined,
      isPending: false,
      isPlaceholderData: false,
      isError: true,
      refetch: refetchMock,
    } as unknown as ReturnType<typeof ownerTransactionsApi.useTransactions>);

    render(<TransactionsView />);

    expect(screen.getByText('Gagal memuat riwayat transaksi penjualan.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Coba lagi' }));
    expect(refetchMock).toHaveBeenCalled();
  });
});
