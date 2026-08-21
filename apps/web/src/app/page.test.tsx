import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

const { default: RootPage } = await import('./page');

describe('public landing page', () => {
  it('shows the hero and role-based product preview', async () => {
    const { container } = render(await RootPage());

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Kelola Outlet Lebih Jago, Ambil Keputusan Lebih Cepat',
      }),
    ).toBeInTheDocument();

    expect(screen.getByRole('link', { name: 'Masuk' })).toHaveAttribute('href', '/login');
    expect(screen.getByRole('link', { name: 'Coba Demo' })).toHaveAttribute('href', '/register');

    expect(screen.queryByRole('link', { name: 'Lihat Fitur' })).not.toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: 'Satu sistem, dua cara kerja.' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        level: 2,
        name: 'Siap Kelola Banyak Outlet dengan Lebih Rapi?',
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Satukan katalog produk, transaksi, stok/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Coba Demo POS Jagoan' })).toHaveAttribute(
      'href',
      '/register',
    );
    expect(screen.getByRole('link', { name: 'Masuk ke Dashboard' })).toHaveAttribute(
      'href',
      '/login',
    );
    expect(container.querySelectorAll('main section')).toHaveLength(3);

    const background = container.querySelector('img[src*="hero-rice-bowl"]');
    expect(background).toHaveAttribute('alt', '');

    const scrims = container.querySelectorAll('section > div[aria-hidden="true"]');
    expect(scrims).toHaveLength(1);
    expect(scrims[0]?.className).toContain('linear-gradient');
    expect(scrims[0]?.className).not.toContain('clip-path');
  });
});
