import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { DashboardView } from './dashboard-view';
import * as ownerReportsApi from '@/lib/api/owner';
import * as ownerTransactionsApi from '@/lib/api/owner';
import type {
  DashboardTotals,
  HourlySales,
  RevenueRange,
  TopProducts,
  Sale,
} from '@jagoan-pos/contracts';

vi.mock('@/lib/api/owner');

const mockDashboard: DashboardTotals = {
  day: '2026-08-19',
  revenue: 1500000,
  transactions: 25,
  units: 40,
  averageBasket: 60000,
  asOf: '2026-08-19T08:00:00.000Z',
};

const mockRevenue: RevenueRange = {
  from: '2026-08-19',
  to: '2026-08-19',
  totalRevenue: 1500000,
  totalTransactions: 25,
  averageBasket: 60000,
  days: [{ day: '2026-08-19', revenue: 1500000, transactions: 25, units: 40 }],
  asOf: '2026-08-19T08:00:00.000Z',
};

const mockTopProducts: TopProducts = {
  from: '2026-08-19',
  to: '2026-08-19',
  direction: 'best',
  asOf: '2026-08-19T08:00:00.000Z',
  products: [
    {
      productId: 'p-1',
      productName: 'Kopi Susu Gula Aren',
      sku: 'KOP-001',
      revenue: 500000,
      units: 20,
      transactions: 15,
    },
    {
      productId: 'p-2',
      productName: 'Croissant Butter',
      sku: 'CRS-002',
      revenue: 300000,
      units: 10,
      transactions: 8,
    },
  ],
};

const mockHourly: HourlySales = {
  from: '2026-08-19',
  to: '2026-08-19',
  asOf: '2026-08-19T08:00:00.000Z',
  hours: Array.from({ length: 24 }, (_, hour) => ({
    hour,
    revenue: hour === 14 ? 400000 : 50000,
    transactions: hour === 14 ? 10 : 2,
    units: hour === 14 ? 15 : 3,
  })),
};

const mockRecentSales: Sale[] = [
  {
    id: 'tx-1',
    merchantId: 'm-1',
    merchantName: 'Toko Kopi',
    cashierId: 'c-1',
    cashierName: 'Budi Kasir',
    transactionNumber: 'INV/20260819/0002',
    status: 'COMPLETED',
    totalQuantity: 1,
    totalAmount: 10000,
    cashReceived: 10000,
    changeAmount: 0,
    createdAt: '2026-08-19T09:14:16.835Z',
    items: [],
  },
];

const mockTransactionsQuery = {
  data: {
    data: mockRecentSales,
    meta: {
      total: 1,
      page: 1,
      limit: 5,
      totalPages: 1,
    },
  },
  isPending: false,
  isError: false,
  refetch: vi.fn(),
};

const mockDefaultReports = {
  dashboard: mockDashboard,
  revenue: mockRevenue,
  previousRevenue: null,
  topProducts: mockTopProducts,
  hourly: mockHourly,
  activeRange: { from: '2026-08-19', to: '2026-08-19' },
  comparisonRanges: null,
  asOf: '2026-08-19T08:00:00.000Z',
  isPending: false,
  isError: false,
  refetch: vi.fn(),
};

beforeEach(() => {
  vi.spyOn(ownerTransactionsApi, 'useTransactions').mockReturnValue(
    mockTransactionsQuery as unknown as ReturnType<typeof ownerTransactionsApi.useTransactions>,
  );
});

describe('DashboardView', () => {
  it('renders today snapshot metrics correctly', () => {
    vi.spyOn(ownerReportsApi, 'useOwnerDashboardData').mockReturnValue(mockDefaultReports);

    render(<DashboardView />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Dashboard & Laporan');
    expect(screen.getByText('Total Pendapatan')).toBeInTheDocument();
    expect(screen.getByText('Rp 1.500.000')).toBeInTheDocument();
    expect(screen.getByText('25 transaksi')).toBeInTheDocument();
    expect(screen.getByText('40 produk')).toBeInTheDocument();
    expect(screen.getByText('Rp 60.000')).toBeInTheDocument();
  });

  it('renders asOf timestamp indicator', () => {
    vi.spyOn(ownerReportsApi, 'useOwnerDashboardData').mockReturnValue(mockDefaultReports);

    render(<DashboardView />);

    expect(screen.getByText(/Data analitik & grafik/i)).toBeInTheDocument();
    expect(screen.getByText(/diperbarui otomatis secara berkala/i)).toBeInTheDocument();
  });

  it('renders top products list and link to inventory', () => {
    vi.spyOn(ownerReportsApi, 'useOwnerDashboardData').mockReturnValue(mockDefaultReports);

    render(<DashboardView />);

    expect(screen.getByText('5 Produk Terlaris')).toBeInTheDocument();
    expect(screen.getByText('Kopi Susu Gula Aren')).toBeInTheDocument();
    expect(screen.getByText('KOP-001')).toBeInTheDocument();
    expect(screen.getByText('20 terjual')).toBeInTheDocument();
    expect(screen.getByText('Rp 500.000')).toBeInTheDocument();

    expect(screen.getByText('Croissant Butter')).toBeInTheDocument();
    expect(screen.getByText('CRS-002')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Stok/i })).toHaveAttribute('href', '/inventory');
  });

  it('renders recent transactions list and link to transactions page', () => {
    vi.spyOn(ownerReportsApi, 'useOwnerDashboardData').mockReturnValue(mockDefaultReports);

    render(<DashboardView />);

    expect(screen.getByText('Transaksi Terbaru')).toBeInTheDocument();
    expect(screen.getByText('INV/20260819/0002')).toBeInTheDocument();
    expect(screen.getByText('Budi Kasir')).toBeInTheDocument();
    expect(screen.getByText('Selesai')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Lihat Semua Transaksi/i })).toHaveAttribute(
      'href',
      '/transactions',
    );
  });

  it('renders error state and retry button when useTransactions fails', () => {
    const refetchTx = vi.fn();
    vi.spyOn(ownerTransactionsApi, 'useTransactions').mockReturnValue({
      data: undefined,
      isPending: false,
      isError: true,
      refetch: refetchTx,
    } as unknown as ReturnType<typeof ownerTransactionsApi.useTransactions>);

    vi.spyOn(ownerReportsApi, 'useOwnerDashboardData').mockReturnValue(mockDefaultReports);

    render(<DashboardView />);

    expect(screen.getByText('Gagal memuat transaksi terbaru.')).toBeInTheDocument();
    const retryBtn = screen.getByRole('button', { name: 'Coba lagi' });
    fireEvent.click(retryBtn);
    expect(refetchTx).toHaveBeenCalledTimes(1);
  });

  it('renders loading skeleton when transactions are fetching placeholder data', () => {
    vi.spyOn(ownerTransactionsApi, 'useTransactions').mockReturnValue({
      data: mockTransactionsQuery.data,
      isPending: false,
      isPlaceholderData: true,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof ownerTransactionsApi.useTransactions>);

    vi.spyOn(ownerReportsApi, 'useOwnerDashboardData').mockReturnValue(mockDefaultReports);

    const { container } = render(<DashboardView />);

    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
    expect(screen.queryByText('INV/20260819/0002')).not.toBeInTheDocument();
  });

  it('passes active date range filter to useTransactions', () => {
    const useTransactionsSpy = vi.spyOn(ownerTransactionsApi, 'useTransactions').mockReturnValue(
      mockTransactionsQuery as unknown as ReturnType<typeof ownerTransactionsApi.useTransactions>,
    );

    vi.spyOn(ownerReportsApi, 'useOwnerDashboardData').mockReturnValue(mockDefaultReports);

    render(<DashboardView />);

    expect(useTransactionsSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        limit: 5,
        startDate: '2026-08-19',
        endDate: '2026-08-19',
      }),
    );
  });

  it('renders 24-hour hourly distribution intervals', () => {
    vi.spyOn(ownerReportsApi, 'useOwnerDashboardData').mockReturnValue(mockDefaultReports);

    render(<DashboardView />);

    expect(screen.getByText('Pola Jam Sibuk')).toBeInTheDocument();
    expect(screen.getByTestId('hourly-distribution')).toBeInTheDocument();
  });

  it('switches period preset properly when selecting 7 Hari', () => {
    const selectedPeriodRevenue = {
      ...mockRevenue,
      from: '2026-08-13',
      to: '2026-08-19',
      asOf: '2026-08-19T10:00:00.000Z',
    };
    vi.spyOn(ownerReportsApi, 'useOwnerDashboardData').mockImplementation((preset) => ({
      ...mockDefaultReports,
      revenue: preset === 'TODAY' ? mockRevenue : selectedPeriodRevenue,
      activeRange:
        preset === 'TODAY'
          ? { from: '2026-08-19', to: '2026-08-19' }
          : { from: '2026-08-13', to: '2026-08-19' },
      asOf: preset === 'TODAY' ? '2026-08-19T08:00:00.000Z' : '2026-08-19T10:00:00.000Z',
    }));

    render(<DashboardView />);
    fireEvent.click(screen.getByRole('button', { name: '7 Hari' }));

    expect(screen.getByText(/Data analitik & grafik/i)).toBeInTheDocument();
  });

  it('renders empty states when report collections contain no rows', () => {
    vi.spyOn(ownerReportsApi, 'useOwnerDashboardData').mockReturnValue({
      ...mockDefaultReports,
      dashboard: { ...mockDashboard, revenue: 0, transactions: 0, units: 0 },
      revenue: { ...mockRevenue, totalRevenue: 0, totalTransactions: 0, days: [] },
      previousRevenue: null,
      topProducts: { ...mockTopProducts, products: [] },
      hourly: { ...mockHourly, hours: [] },
      asOf: undefined,
    });

    render(<DashboardView />);

    expect(screen.getByText('Belum ada data penjualan pada periode ini')).toBeInTheDocument();
    expect(screen.getByText('Belum ada data produk terjual pada periode ini.')).toBeInTheDocument();
    expect(
      screen.getByText('Belum ada data aktivitas per jam pada periode ini.'),
    ).toBeInTheDocument();
  });

  it('switches presets when clicking preset buttons', () => {
    const useOwnerDashboardDataSpy = vi
      .spyOn(ownerReportsApi, 'useOwnerDashboardData')
      .mockReturnValue(mockDefaultReports);

    render(<DashboardView />);

    const button7D = screen.getByRole('button', { name: '7 Hari' });
    fireEvent.click(button7D);

    expect(useOwnerDashboardDataSpy).toHaveBeenCalledWith('7D');

    const buttonMonth = screen.getByRole('button', { name: 'Bandingkan Bulan' });
    fireEvent.click(buttonMonth);

    expect(useOwnerDashboardDataSpy).toHaveBeenCalledWith('MONTH_COMPARISON');
  });

  it('renders error banner and retry button when isError is true', () => {
    const refetch = vi.fn();
    vi.spyOn(ownerReportsApi, 'useOwnerDashboardData').mockReturnValue({
      ...mockDefaultReports,
      dashboard: null,
      revenue: null,
      previousRevenue: null,
      topProducts: null,
      hourly: null,
      isPending: false,
      isError: true,
      refetch,
    });

    render(<DashboardView />);

    expect(screen.getByText('Laporan dashboard gagal dimuat.')).toBeInTheDocument();
    const retryBtn = screen.getByRole('button', { name: 'Coba lagi' });
    fireEvent.click(retryBtn);
    expect(refetch).toHaveBeenCalledTimes(1);
  });
});
