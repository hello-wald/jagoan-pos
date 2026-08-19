import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { StaffView } from './staff-view';
import * as ownerStaffApi from '@/lib/api/owner';
import { AppErrorCode, type CashierListResult, type UserSummary } from '@jagoan-pos/contracts';

vi.mock('@/lib/api/owner');

const mockCashiers: UserSummary[] = [
  {
    id: 'user-1',
    merchantId: 'merch-1',
    merchantName: 'Toko Kopi Senja',
    fullName: 'Budi Kasir',
    email: 'budi@tokokopi.com',
    role: 'CASHIER',
    isActive: true,
    createdAt: '2026-08-19T08:00:00.000Z',
    updatedAt: '2026-08-19T08:00:00.000Z',
  },
  {
    id: 'user-2',
    merchantId: 'merch-1',
    merchantName: 'Toko Kopi Senja',
    fullName: 'Siti Rahma',
    email: 'siti@tokokopi.com',
    role: 'CASHIER',
    isActive: false,
    createdAt: '2026-08-18T10:00:00.000Z',
    updatedAt: '2026-08-18T10:00:00.000Z',
  },
];

const mockCashierData: CashierListResult = {
  data: mockCashiers,
  summary: {
    total: 2,
    active: 1,
    inactive: 1,
  },
};

const createCashierMock = vi.fn();
const setCashierActiveMock = vi.fn();
const refetchMock = vi.fn();

beforeEach(() => {
  createCashierMock.mockReset();
  setCashierActiveMock.mockReset();
  refetchMock.mockReset();

  vi.spyOn(ownerStaffApi, 'useCashiers').mockReturnValue({
    data: mockCashierData,
    isPending: false,
    isError: false,
    refetch: refetchMock,
  } as unknown as ReturnType<typeof ownerStaffApi.useCashiers>);

  vi.spyOn(ownerStaffApi, 'useCreateCashier').mockReturnValue({
    mutateAsync: createCashierMock,
    isPending: false,
  } as unknown as ReturnType<typeof ownerStaffApi.useCreateCashier>);

  vi.spyOn(ownerStaffApi, 'useSetCashierActive').mockReturnValue({
    mutateAsync: setCashierActiveMock,
    isPending: false,
  } as unknown as ReturnType<typeof ownerStaffApi.useSetCashierActive>);
});

describe('StaffView', () => {
  it('renders headline KPI cards with summary totals', () => {
    render(<StaffView />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Manajemen Kasir & Staf');
    expect(screen.getByText('2 staf')).toBeInTheDocument();
    expect(screen.getAllByText('1 staf')).toHaveLength(2);
  });

  it('renders cashier rows with status badges and actions', () => {
    render(<StaffView />);

    expect(screen.getByText('Budi Kasir')).toBeInTheDocument();
    expect(screen.getByText('budi@tokokopi.com')).toBeInTheDocument();
    expect(screen.getByText('Aktif')).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Ubah status kasir Budi Kasir' })).toBeChecked();

    expect(screen.getByText('Siti Rahma')).toBeInTheDocument();
    expect(screen.getByText('siti@tokokopi.com')).toBeInTheDocument();
    expect(screen.getByText('Nonaktif')).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Ubah status kasir Siti Rahma' })).not.toBeChecked();
  });

  it('filters cashiers by search query', async () => {
    render(<StaffView />);

    const searchInput = screen.getByPlaceholderText('Cari nama atau email kasir…');
    fireEvent.change(searchInput, { target: { value: 'Siti' } });

    await waitFor(() => {
      expect(screen.getByText('Siti Rahma')).toBeInTheDocument();
      expect(screen.queryByText('Budi Kasir')).not.toBeInTheDocument();
    });
  });

  it('filters cashiers by status using SelectMenu', () => {
    render(<StaffView />);

    // Open status filter dropdown and select 'Status: Aktif'
    fireEvent.click(screen.getByRole('combobox', { name: 'Filter status akun kasir' }));
    fireEvent.click(screen.getByRole('option', { name: 'Status: Aktif' }));

    expect(screen.getByText('Budi Kasir')).toBeInTheDocument();
    expect(screen.queryByText('Siti Rahma')).not.toBeInTheDocument();

    // Select 'Status: Nonaktif'
    fireEvent.click(screen.getByRole('combobox', { name: 'Filter status akun kasir' }));
    fireEvent.click(screen.getByRole('option', { name: 'Status: Nonaktif' }));

    expect(screen.getByText('Siti Rahma')).toBeInTheDocument();
    expect(screen.queryByText('Budi Kasir')).not.toBeInTheDocument();
  });

  it('opens modal, validates input, and creates a new cashier successfully', async () => {
    createCashierMock.mockResolvedValueOnce({
      id: 'user-3',
      fullName: 'Ahmad Fauzi',
      email: 'ahmad@tokokopi.com',
      role: 'CASHIER',
      isActive: true,
      createdAt: '2026-08-19T10:00:00.000Z',
      updatedAt: '2026-08-19T10:00:00.000Z',
    });

    render(<StaffView />);

    // Click 'Tambah Kasir' button
    fireEvent.click(screen.getByRole('button', { name: /Tambah Kasir/i }));

    expect(screen.getByRole('heading', { level: 2, name: 'Tambah Kasir Baru' })).toBeInTheDocument();

    // Fill form
    fireEvent.change(screen.getByPlaceholderText('Contoh: Budi Santoso'), {
      target: { value: 'Ahmad Fauzi' },
    });
    fireEvent.change(screen.getByPlaceholderText('kasir@toko.com'), {
      target: { value: 'ahmad@tokokopi.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'password123' },
    });

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: 'Daftarkan Kasir' }));

    await waitFor(() => {
      expect(createCashierMock).toHaveBeenCalledWith({
        fullName: 'Ahmad Fauzi',
        email: 'ahmad@tokokopi.com',
        password: 'password123',
      });
    });

    // Success banner is shown
    await waitFor(() => {
      expect(screen.getByText(/Kasir "Ahmad Fauzi" berhasil didaftarkan/i)).toBeInTheDocument();
    });
  });

  it('handles EMAIL_ALREADY_EXISTS error object from BFF in create modal', async () => {
    // Rejects with plain AppError object as thrown by bffFetch
    createCashierMock.mockRejectedValueOnce({
      code: AppErrorCode.EMAIL_ALREADY_EXISTS,
      status: 400,
      message: 'Email address is already registered',
    });

    render(<StaffView />);

    fireEvent.click(screen.getByRole('button', { name: /Tambah Kasir/i }));

    fireEvent.change(screen.getByPlaceholderText('Contoh: Budi Santoso'), {
      target: { value: 'Budi Santoso' },
    });
    fireEvent.change(screen.getByPlaceholderText('kasir@toko.com'), {
      target: { value: 'budi@tokokopi.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'password123' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Daftarkan Kasir' }));

    await waitFor(() => {
      expect(
        screen.getByText('Email ini sudah terdaftar.'),
      ).toBeInTheDocument();
    });
  });

  it('toggles cashier active status', async () => {
    setCashierActiveMock.mockResolvedValueOnce({
      ...mockCashiers[0],
      isActive: false,
    });

    render(<StaffView />);

    // Click switch toggle on first user
    const toggleSwitch = screen.getByRole('switch', { name: 'Ubah status kasir Budi Kasir' });
    fireEvent.click(toggleSwitch);

    await waitFor(() => {
      expect(setCashierActiveMock).toHaveBeenCalledWith({
        cashierId: 'user-1',
        isActive: false,
      });
    });

    await waitFor(() => {
      expect(
        screen.getByText(/Status kasir "Budi Kasir" berhasil diubah menjadi Nonaktif/i),
      ).toBeInTheDocument();
    });
  });

  it('handles toggle failure gracefully and displays error banner with AppError message', async () => {
    // Rejects with plain AppError object as thrown by bffFetch (e.g. CASHIER_NOT_FOUND)
    setCashierActiveMock.mockRejectedValueOnce({
      code: AppErrorCode.CASHIER_NOT_FOUND,
      status: 404,
      message: 'Cashier not found',
    });

    render(<StaffView />);

    const toggleSwitch = screen.getByRole('switch', { name: 'Ubah status kasir Budi Kasir' });
    fireEvent.click(toggleSwitch);

    await waitFor(() => {
      expect(screen.getByText('Kasir tidak ditemukan.')).toBeInTheDocument();
    });
  });

  it('renders error banner when loading cashiers fails and retries', () => {
    vi.spyOn(ownerStaffApi, 'useCashiers').mockReturnValue({
      data: undefined,
      isPending: false,
      isError: true,
      refetch: refetchMock,
    } as unknown as ReturnType<typeof ownerStaffApi.useCashiers>);

    render(<StaffView />);

    expect(screen.getByText('Gagal memuat data staf kasir.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Coba lagi' }));
    expect(refetchMock).toHaveBeenCalled();
  });
});
