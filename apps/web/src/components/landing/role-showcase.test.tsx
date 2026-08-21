import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { RoleShowcase } from './role-showcase';

describe('RoleShowcase', () => {
  it('switches the role explanation and product preview together', async () => {
    const user = userEvent.setup();
    render(<RoleShowcase />);

    const ownerButton = screen.getByRole('button', { name: 'Tampilkan fitur Owner' });
    const cashierButton = screen.getByRole('button', { name: 'Tampilkan fitur Cashier' });

    expect(ownerButton).toHaveAttribute('aria-pressed', 'true');
    expect(cashierButton).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText('Pantau bisnis dari satu layar')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Pratinjau dashboard owner' })).toHaveTextContent(
      'Dashboard & Laporan',
    );
    expect(screen.getByRole('group', { name: 'Preview fitur Owner' })).toBeInTheDocument();

    await user.click(cashierButton);

    expect(ownerButton).toHaveAttribute('aria-pressed', 'false');
    expect(cashierButton).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Checkout cepat saat antrean ramai')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Pratinjau checkout kasir' })).toHaveTextContent(
      'Pilih produk',
    );
    expect(screen.getByRole('group', { name: 'Preview fitur Cashier' })).toBeInTheDocument();
    expect(
      screen.queryByRole('region', { name: 'Pratinjau dashboard owner' }),
    ).not.toBeInTheDocument();
  });
});
