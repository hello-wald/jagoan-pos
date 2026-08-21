import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { type ReactNode } from 'react';
import { CheckoutView } from './checkout-view';
import * as cashierApi from '@/lib/api/cashier';
import type { PaginatedMerchantStock, Sale } from '@jagoan-pos/contracts';

vi.mock('@/lib/api/cashier');

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

const mockCatalog: PaginatedMerchantStock = {
  data: [
    {
      productId: 'prod-1',
      sku: 'KOP-001',
      name: 'Kopi Arabika',
      imageUrl: 'https://cdn.example.com/kopi.png',
      currentPrice: 25000,
      stockQuantity: 10,
      isActive: true,
      updatedAt: '2026-08-20T00:00:00.000Z',
    },
    {
      productId: 'prod-2',
      sku: 'ROTI-001',
      name: 'Roti Bakar',
      imageUrl: null,
      currentPrice: 15000,
      stockQuantity: 2,
      isActive: true,
      updatedAt: '2026-08-20T00:00:00.000Z',
    },
    {
      productId: 'prod-3',
      sku: 'TEH-001',
      name: 'Teh Manis',
      imageUrl: null,
      currentPrice: 8000,
      stockQuantity: 0, // Out of stock
      isActive: true,
      updatedAt: '2026-08-20T00:00:00.000Z',
    },
  ],
  meta: { total: 3, page: 1, limit: 12, totalPages: 1 },
};

const mockSale: Sale = {
  id: 'sale-123',
  merchantId: 'merch-1',
  merchantName: 'Toko Kopi Jagoan',
  cashierId: 'cash-1',
  cashierName: 'Budi Santoso',
  transactionNumber: 'TRX-20260820-9999',
  status: 'COMPLETED',
  totalQuantity: 2,
  totalAmount: 50000,
  cashReceived: 100000,
  changeAmount: 50000,
  createdAt: '2026-08-20T10:00:00.000Z',
  items: [
    {
      id: 'line-1',
      productId: 'prod-1',
      productName: 'Kopi Arabika',
      sku: 'KOP-001',
      unitPrice: 25000,
      quantity: 2,
      subtotal: 50000,
    },
  ],
};

describe('CheckoutView Component', () => {
  const mutateAsyncMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(cashierApi, 'useCashierCatalog').mockReturnValue({
      data: mockCatalog,
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof cashierApi.useCashierCatalog>);

    vi.spyOn(cashierApi, 'useCashierCategoryList').mockReturnValue({
      data: [{ id: 'cat-1', name: 'Minuman' }],
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof cashierApi.useCashierCategoryList>);

    vi.spyOn(cashierApi, 'useCashierCheckout').mockReturnValue({
      mutateAsync: mutateAsyncMock,
      isPending: false,
    } as unknown as ReturnType<typeof cashierApi.useCashierCheckout>);
  });

  it('renders product catalog items with image and details', () => {
    render(<CheckoutView />, { wrapper: createWrapper() });

    expect(screen.getByText('Kopi Arabika')).toBeInTheDocument();
    expect(screen.getByText('KOP-001')).toBeInTheDocument();
    expect(screen.getByText('Roti Bakar')).toBeInTheDocument();
    expect(screen.getByText('Stok Habis')).toBeInTheDocument();

    const img = screen.getByRole('img', { name: 'Kopi Arabika' });
    expect(img).toHaveAttribute('src', 'https://cdn.example.com/kopi.png');
  });

  it('organizes the register into named catalog and payment regions', () => {
    render(<CheckoutView />, { wrapper: createWrapper() });

    expect(screen.getByRole('region', { name: 'Katalog produk' })).toBeInTheDocument();
    expect(
      screen.getByRole('complementary', { name: 'Keranjang dan pembayaran' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Pilih produk' })).toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: 'Cari produk' })).toBeInTheDocument();
  });

  it('announces product selection and shows the derived line subtotal', async () => {
    const user = userEvent.setup();
    render(<CheckoutView />, { wrapper: createWrapper() });

    const coffeeCard = screen.getByRole('button', {
      name: 'Tambah Kopi Arabika ke keranjang',
    });
    expect(coffeeCard).toHaveAttribute('aria-pressed', 'false');

    await user.click(coffeeCard);
    await user.click(coffeeCard);

    expect(coffeeCard).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText('Subtotal Kopi Arabika')).toHaveTextContent(/Rp\s*50\.000/);
  });

  it('adds items to cart and updates financial total', async () => {
    const user = userEvent.setup();
    render(<CheckoutView />, { wrapper: createWrapper() });

    const coffeeCard = screen.getByText('Kopi Arabika').closest('button')!;
    await user.click(coffeeCard);

    // Cart shows Kopi Arabika with qty 1 and subtotal Rp25.000
    expect(screen.getByText('1 pcs')).toBeInTheDocument();
    expect(screen.getByText('Total Tagihan')).toBeInTheDocument();

    // Click again to increment qty
    await user.click(coffeeCard);
    expect(screen.getByText('2 pcs')).toBeInTheDocument();
  });

  it('caps quantity by available stockQuantity', async () => {
    const user = userEvent.setup();
    render(<CheckoutView />, { wrapper: createWrapper() });

    const rotiCard = screen.getByText('Roti Bakar').closest('button')!;
    // Stock is 2
    await user.click(rotiCard);
    await user.click(rotiCard);

    // After 2 clicks, button is disabled / capped
    expect(rotiCard).toBeDisabled();

    // Plus buttons (both in catalog card and cart) are disabled
    const plusBtns = screen.getAllByRole('button', { name: /tambah roti bakar/i });
    plusBtns.forEach((btn) => expect(btn).toBeDisabled());
  });

  it('keeps checkout button disabled when cash is insufficient', async () => {
    const user = userEvent.setup();
    render(<CheckoutView />, { wrapper: createWrapper() });

    const coffeeCard = screen.getByText('Kopi Arabika').closest('button')!;
    await user.click(coffeeCard); // total 25.000

    const submitBtn = screen.getByRole('button', { name: /proses bayar/i });
    expect(submitBtn).toBeDisabled();

    // Enter partial cash (10.000)
    const cashInput = screen.getByLabelText(/nominal tunai diterima/i);
    await user.type(cashInput, '10000');
    expect(submitBtn).toBeDisabled();
    expect(screen.getByText(/kurang/i)).toBeInTheDocument();
  });

  it('handles quick cash buttons and executes checkout mutation successfully', async () => {
    const user = userEvent.setup();
    mutateAsyncMock.mockResolvedValueOnce(mockSale);

    render(<CheckoutView />, { wrapper: createWrapper() });

    const coffeeCard = screen.getByText('Kopi Arabika').closest('button')!;
    await user.click(coffeeCard); // 1x 25k
    await user.click(coffeeCard); // 2x = 50k

    // Click quick cash button (+100k)
    const quick100k = screen.getByRole('button', { name: '+100k' });
    await user.click(quick100k);

    const submitBtn = screen.getByRole('button', { name: /proses bayar/i });
    expect(submitBtn).not.toBeDisabled();

    await user.click(submitBtn);

    expect(mutateAsyncMock).toHaveBeenCalledWith(
      expect.objectContaining({
        cashReceived: 100000,
        items: [{ productId: 'prod-1', quantity: 2 }],
      }),
    );

    await waitFor(() => {
      expect(screen.getAllByText('TRX-20260820-9999').length).toBeGreaterThan(0);
    });
    expect(screen.getByText(/Budi Santoso/i)).toBeInTheDocument();
    expect(screen.getByText('Toko Kopi Jagoan')).toBeInTheDocument();
  });

  it('displays error message when checkout fails without clearing cart', async () => {
    const user = userEvent.setup();
    mutateAsyncMock.mockRejectedValueOnce(new Error('Stok barang tidak mencukupi'));

    render(<CheckoutView />, { wrapper: createWrapper() });

    const coffeeCard = screen.getByText('Kopi Arabika').closest('button')!;
    await user.click(coffeeCard);

    const exactBtn = screen.getByRole('button', { name: 'Pas' });
    await user.click(exactBtn);

    const submitBtn = screen.getByRole('button', { name: /proses bayar/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Stok barang tidak mencukupi')).toBeInTheDocument();
    });

    // Cart items are preserved
    expect(screen.getByText('1 pcs')).toBeInTheDocument();
  });

  it('preserves the exact same idempotencyKey across retries after a checkout failure', async () => {
    const user = userEvent.setup();
    // First attempt rejects (e.g. network timeout), second attempt succeeds
    mutateAsyncMock
      .mockRejectedValueOnce(new Error('Koneksi terputus saat checkout'))
      .mockResolvedValueOnce(mockSale);

    render(<CheckoutView />, { wrapper: createWrapper() });

    const coffeeCard = screen.getByText('Kopi Arabika').closest('button')!;
    await user.click(coffeeCard);

    const exactBtn = screen.getByRole('button', { name: 'Pas' });
    await user.click(exactBtn);

    const submitBtn = screen.getByRole('button', { name: /proses bayar/i });

    // Attempt 1: Fails due to network error
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Koneksi terputus saat checkout')).toBeInTheDocument();
    });

    const firstKey = mutateAsyncMock.mock.calls[0][0].idempotencyKey;
    expect(typeof firstKey).toBe('string');
    expect(firstKey.length).toBeGreaterThan(0);

    // Attempt 2: Kasir retries payment without modifying cart
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getAllByText('TRX-20260820-9999').length).toBeGreaterThan(0);
    });

    const secondKey = mutateAsyncMock.mock.calls[1][0].idempotencyKey;

    // EMPIRICAL PROOF: Both retry attempts sent the EXACT SAME idempotencyKey to the server!
    expect(secondKey).toBe(firstKey);
  });

  it('rotates idempotencyKey when cash changes after a definitive domain error', async () => {
    const user = userEvent.setup();
    mutateAsyncMock
      .mockRejectedValueOnce({ code: 'INSUFFICIENT_STOCK', message: 'Stok tidak mencukupi.' })
      .mockResolvedValueOnce(mockSale);

    render(<CheckoutView />, { wrapper: createWrapper() });

    const coffeeCard = screen.getByText('Kopi Arabika').closest('button')!;
    await user.click(coffeeCard);
    await user.click(screen.getByRole('button', { name: 'Pas' }));

    const submitBtn = screen.getByRole('button', { name: /proses bayar/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Stok tidak mencukupi.')).toBeInTheDocument();
    });

    const firstKey = mutateAsyncMock.mock.calls[0][0].idempotencyKey;

    // Cashier changes cash received after definitive domain error
    const cashInput = screen.getByLabelText(/nominal tunai diterima/i);
    await user.type(cashInput, '0');

    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getAllByText('TRX-20260820-9999').length).toBeGreaterThan(0);
    });

    const secondKey = mutateAsyncMock.mock.calls[1][0].idempotencyKey;
    // New key is generated because the previous rejection was definitive domain error
    expect(secondKey).not.toBe(firstKey);
  });

  it('locks cart, cash input, and controls after an ambiguous network error, allowing safe retry with exact same key', async () => {
    const user = userEvent.setup();
    mutateAsyncMock
      .mockRejectedValueOnce(new Error('Network timeout'))
      .mockResolvedValueOnce(mockSale);

    render(<CheckoutView />, { wrapper: createWrapper() });

    const coffeeCard = screen.getByText('Kopi Arabika').closest('button')!;
    await user.click(coffeeCard);
    await user.click(screen.getByRole('button', { name: 'Pas' }));

    const submitBtn = screen.getByRole('button', { name: /proses bayar/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Network timeout')).toBeInTheDocument();
    });

    // Verify all controls are locked
    const cashInput = screen.getByLabelText(/nominal tunai diterima/i);
    expect(cashInput).toBeDisabled();
    expect(screen.getByRole('searchbox', { name: 'Cari produk' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Kosongkan' })).toBeDisabled();

    // Verify retry button is shown
    const retryBtn = screen.getByRole('button', { name: /coba lagi transaksi ini/i });
    expect(retryBtn).toBeInTheDocument();
    expect(retryBtn).toBeEnabled();

    const firstKey = mutateAsyncMock.mock.calls[0][0].idempotencyKey;

    // Cashier retries via the Retry button
    await user.click(retryBtn);

    await waitFor(() => {
      expect(screen.getAllByText('TRX-20260820-9999').length).toBeGreaterThan(0);
    });

    const secondKey = mutateAsyncMock.mock.calls[1][0].idempotencyKey;
    // EMPIRICAL PROOF: Key is preserved for ambiguous errors
    expect(secondKey).toBe(firstKey);
  });

  it('disables catalog search when checkout is pending', () => {
    vi.spyOn(cashierApi, 'useCashierCheckout').mockReturnValue({
      mutateAsync: mutateAsyncMock,
      isPending: true,
    } as unknown as ReturnType<typeof cashierApi.useCashierCheckout>);

    render(<CheckoutView />, { wrapper: createWrapper() });

    const searchInput = screen.getByRole('searchbox', { name: 'Cari produk' });
    expect(searchInput).toBeDisabled();
  });

  it('filters by category and forwards categoryId to the catalog hook', async () => {
    const user = userEvent.setup();
    const useCashierCatalogSpy = vi.spyOn(cashierApi, 'useCashierCatalog').mockReturnValue({
      data: mockCatalog,
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof cashierApi.useCashierCatalog>);

    render(<CheckoutView />, { wrapper: createWrapper() });

    await user.click(screen.getByRole('button', { name: 'Minuman' }));

    expect(useCashierCatalogSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({ categoryId: 'cat-1', page: 1 }),
    );
  });
});
