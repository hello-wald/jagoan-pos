import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProductTable } from './product-table';
import * as productsApi from '@/lib/api/products';

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('./status-toggle', () => ({
  StatusToggle: () => <button type="button">Toggle</button>,
}));

const PRODUCT_IMAGE_URL = 'https://cdn.example/products/kopi.png';

const products = [
  {
    id: 'prod-1',
    name: 'Kopi Susu',
    sku: 'KOP-001',
    categoryId: null,
    category: null,
    price: 18000,
    isActive: true,
    createdAt: '2026-08-20T00:00:00.000Z',
    updatedAt: '2026-08-20T00:00:00.000Z',
    images: [
      {
        id: 'image-1',
        url: PRODUCT_IMAGE_URL,
        contentType: 'image/png',
        sizeBytes: 1234,
        sortOrder: 0,
        createdAt: '2026-08-20T00:00:00.000Z',
      },
    ],
  },
  {
    id: 'prod-2',
    name: 'Teh Melati',
    sku: 'TEH-002',
    categoryId: null,
    category: null,
    price: 8000,
    isActive: true,
    createdAt: '2026-08-20T00:00:00.000Z',
    updatedAt: '2026-08-20T00:00:00.000Z',
    images: [],
  },
];

describe('ProductTable', () => {
  it('renders the primary image when present and a placeholder when absent', () => {
    vi.spyOn(productsApi, 'useProductList').mockReturnValue({
      data: {
        data: products,
        meta: { total: 2, page: 1, pageSize: 20, totalPages: 1 },
      },
      isPending: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof productsApi.useProductList>);

    vi.spyOn(productsApi, 'useSetProductActive').mockReturnValue({
      mutateAsync: vi.fn(),
    } as unknown as ReturnType<typeof productsApi.useSetProductActive>);

    render(<ProductTable params={{ page: 1, pageSize: 20 }} />);

    expect(screen.getByRole('img', { name: 'Kopi Susu' })).toHaveAttribute(
      'src',
      PRODUCT_IMAGE_URL,
    );
    expect(
      screen.getByRole('img', { name: 'Tidak ada gambar untuk Teh Melati' }),
    ).toBeInTheDocument();
  });
});
