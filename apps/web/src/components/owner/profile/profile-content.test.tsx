import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import * as ownerProfileApi from '@/lib/api/owner';
import type { AuthUser } from '@jagoan-pos/contracts';
import { ProfileContent } from './profile-content';

describe('ProfileContent', () => {
  const mockOwnerUser: AuthUser = {
    id: 'user-uuid-1',
    merchantId: 'merchant-uuid-99',
    merchantName: 'Kopi Jagoan Mantap',
    fullName: 'Budi Jagoan',
    email: 'owner@kopi.com',
    role: 'OWNER',
    isActive: true,
  };

  it('renders loading state initially', () => {
    vi.spyOn(ownerProfileApi, 'useCurrentUser').mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof ownerProfileApi.useCurrentUser>);

    render(<ProfileContent />);

    expect(screen.getByText(/Memuat profil merchant/i)).toBeInTheDocument();
  });

  it('renders full profile details for active owner', () => {
    vi.spyOn(ownerProfileApi, 'useCurrentUser').mockReturnValue({
      data: mockOwnerUser,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof ownerProfileApi.useCurrentUser>);

    render(<ProfileContent />);

    expect(screen.getByText('Profil Merchant')).toBeInTheDocument();
    expect(screen.getByText('Kopi Jagoan Mantap')).toBeInTheDocument();
    expect(screen.getByText('merchant-uuid-99')).toBeInTheDocument();
    expect(screen.getByText('Budi Jagoan')).toBeInTheDocument();
    expect(screen.getByText('owner@kopi.com')).toBeInTheDocument();
    expect(screen.getByText(/Aktif/i)).toBeInTheDocument();

    // Must be strictly read-only: no edit inputs or forms
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByText(/Bergabung sejak/i)).not.toBeInTheDocument();
  });

  it('renders fallback when merchantName is null or not set', () => {
    vi.spyOn(ownerProfileApi, 'useCurrentUser').mockReturnValue({
      data: {
        ...mockOwnerUser,
        merchantName: null,
        merchantId: null,
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof ownerProfileApi.useCurrentUser>);

    render(<ProfileContent />);

    expect(screen.getByText('Belum Diatur')).toBeInTheDocument();
    expect(screen.getByText('-')).toBeInTheDocument();
  });

  it('renders error state and retry button on fetch failure', () => {
    vi.spyOn(ownerProfileApi, 'useCurrentUser').mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error('Network error'),
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof ownerProfileApi.useCurrentUser>);

    render(<ProfileContent />);

    expect(screen.getByText(/Gagal memuat profil merchant/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Coba Lagi/i })).toBeInTheDocument();
  });
});
