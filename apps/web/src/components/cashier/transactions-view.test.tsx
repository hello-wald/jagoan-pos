import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CashierTransactionsView } from './transactions-view';
import * as cashierTransactionsApi from '@/lib/api/cashier/transactions';
import type { PaginatedSales, Sale } from '@jagoan-pos/contracts';

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
    cashierId: 'cashier-1',
    cashierName: 'Budi Kasir',
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

  vi.spyOn(cashierTransactionsApi, 'useCashierTransactions').mockImplementation((_params) => {
    return {
      data: mockPaginatedSales,
      isPending: false,
      isPlaceholderData: false,
      isError: false,
      refetch: refetchMock,
    } as unknown as ReturnType<typeof cashierTransactionsApi.useCashierTransactions>;
  });

  vi.spyOn(cashierTransactionsApi, 'useCashierTransaction').mockImplementation((id: string) => {
    const sale = mockSales.find((s) => s.id === id);
    return {
      data: sale,
      isPending: false,
      isError: false,
    } as unknown as ReturnType<typeof cashierTransactionsApi.useCashierTransaction>;
  });
});

describe('CashierTransactionsView Component', () => {
  it('renders page header and transactions table', () => {
    render(<CashierTransactionsView />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Riwayat Transaksi' }),
    ).toBeInTheDocument();
    expect(screen.getByText('TRX-20260819-001')).toBeInTheDocument();
    expect(screen.getByText('TRX-20260819-002')).toBeInTheDocument();
    expect(screen.getAllByText('Budi Kasir')).toHaveLength(2);
    expect(screen.getByText('Rp 45.000')).toBeInTheDocument();
    expect(screen.getByText('Rp 25.000')).toBeInTheDocument();
    expect(screen.getByText('Selesai')).toBeInTheDocument();
    expect(screen.getByText('Dibatalkan')).toBeInTheDocument();
  });

  it('debounces search input and triggers query with search param', async () => {
    const useTransactionsSpy = vi.spyOn(cashierTransactionsApi, 'useCashierTransactions');

    render(<CashierTransactionsView />);

    const searchInput = screen.getByRole('searchbox', { name: 'Cari transaksi' });
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

  it('triggers query when date filter changes', () => {
    const useTransactionsSpy = vi.spyOn(cashierTransactionsApi, 'useCashierTransactions');

    render(<CashierTransactionsView />);

    fireEvent.click(screen.getByRole('combobox', { name: 'Filter rentang tanggal' }));
    fireEvent.click(screen.getByRole('option', { name: 'Hari Ini' }));

    expect(useTransactionsSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({
        startDate: expect.any(String),
        endDate: expect.any(String),
        page: 1,
      }),
    );
  });

  it('renders error banner and allows retry when fetch fails', () => {
    vi.spyOn(cashierTransactionsApi, 'useCashierTransactions').mockReturnValue({
      data: undefined,
      isPending: false,
      isPlaceholderData: false,
      isError: true,
      refetch: refetchMock,
    } as unknown as ReturnType<typeof cashierTransactionsApi.useCashierTransactions>);

    render(<CashierTransactionsView />);

    expect(
      screen.getByText('Terjadi kesalahan saat memuat data transaksi kasir. Silakan coba lagi.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(
      screen.queryByText('Belum ada transaksi penjualan yang tercatat.'),
    ).not.toBeInTheDocument();
    const retryButton = screen.getByRole('button', { name: 'Coba Lagi' });
    fireEvent.click(retryButton);
    expect(refetchMock).toHaveBeenCalledTimes(1);
  });

  it('renders empty message when no sales are returned', () => {
    vi.spyOn(cashierTransactionsApi, 'useCashierTransactions').mockReturnValue({
      data: { data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } },
      isPending: false,
      isPlaceholderData: false,
      isError: false,
      refetch: refetchMock,
    } as unknown as ReturnType<typeof cashierTransactionsApi.useCashierTransactions>);

    render(<CashierTransactionsView />);

    expect(screen.getByText('Belum ada transaksi penjualan yang tercatat.')).toBeInTheDocument();
  });

  it('opens receipt detail modal and fetches transaction detail when action button is clicked', async () => {
    render(<CashierTransactionsView />);

    const receiptButtons = screen.getAllByRole('button', { name: /lihat struk/i });
    fireEvent.click(receiptButtons[0]);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Detail Struk Pembayaran')).toBeInTheDocument();
      expect(screen.getByText('Kopi Susu Gula Aren')).toBeInTheDocument();
      expect(screen.getByText('Donat Coklat')).toBeInTheDocument();
    });

    const closeButton = screen.getByRole('button', { name: 'Tutup Struk' });
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });
});
