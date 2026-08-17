'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { useSearchParams } from 'next/navigation';
import type { Product } from '@jagoan-pos/contracts';
import { formatIdr } from '@/lib/format/currency';
import {
  totalPages,
  useProductList,
  useSetProductActive,
  type ProductListParams,
} from '@/lib/api/products';
import { Badge } from '@/components/ui/badge';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusToggle } from './status-toggle';

const COLUMNS = ['Nama', 'SKU', 'Kategori', 'Harga', 'Status', ''] as const;

// Cast at the source, same pattern as homeForRole in lib/auth/roles.ts and
// the NAV table in components/layout/sidebar.tsx: typedRoutes can't see
// /admin/products/new or /admin/products/[productId] as literals until
// Task 12 builds those pages.
const NEW_PRODUCT_ROUTE = '/admin/products/new' as Route;

export function ProductTable({ params }: { params: ProductListParams }) {
  const { data, isPending, isError, refetch } = useProductList(params);
  const setActive = useSetProductActive(params);

  const filtered = Boolean(params.query?.trim()) || params.activeOnly !== undefined;

  if (isPending) {
    return (
      <div className="divide-y divide-line rounded-[--radius-panel] border border-line bg-surface">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="flex h-[52px] items-center gap-4 px-4">
            <Skeleton className="h-4 flex-[3]" />
            <Skeleton className="h-4 flex-[2]" />
            <Skeleton className="h-4 flex-[2]" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-start gap-3">
        <Banner tone="danger">Katalog gagal dimuat.</Banner>
        <Button variant="secondary" size="sm" onClick={() => void refetch()}>
          Coba lagi
        </Button>
      </div>
    );
  }

  if (data.data.length === 0) {
    return filtered ? (
      <EmptyState
        title="Tidak ada hasil"
        description="Tidak ada produk yang cocok dengan pencarian Anda."
        action={
          <Link
            href="/admin/products"
            className="inline-flex h-9 items-center rounded-[--radius-control] border border-line bg-surface px-3 text-[13px] font-medium"
          >
            Hapus filter
          </Link>
        }
      />
    ) : (
      <EmptyState
        title="Belum ada produk"
        description="Katalog ini masih kosong. Tambahkan produk pertama untuk mulai."
        action={
          <Link
            href={NEW_PRODUCT_ROUTE}
            className="inline-flex h-11 items-center rounded-[--radius-control] bg-accent px-5 text-sm font-medium text-ink"
          >
            Tambah Produk
          </Link>
        }
      />
    );
  }

  const pages = totalPages(data.meta.total, data.meta.pageSize);

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-[--radius-panel] border border-line bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line">
              {COLUMNS.map((column, i) => (
                <th
                  key={column || i}
                  scope="col"
                  className={`px-4 py-3 text-[11px] font-medium uppercase tracking-[0.04em] text-ink-3 ${
                    column === 'Harga' ? 'text-right' : 'text-left'
                  }`}
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {data.data.map((product: Product) => (
              <tr key={product.id} className="h-[52px]">
                <td className="px-4">
                  <Link
                    href={`/admin/products/${product.id}` as Route}
                    className="font-medium text-ink underline-offset-4 hover:underline"
                  >
                    {product.name}
                  </Link>
                </td>
                <td className="px-4 font-mono text-[13px] text-ink-2">{product.sku}</td>
                <td className="px-4 text-ink-2">{product.category ?? '—'}</td>
                <td className="tabular px-4 text-right">{formatIdr(product.price)}</td>
                <td className="px-4">
                  <Badge tone={product.isActive ? 'success' : 'neutral'}>
                    {product.isActive ? 'Aktif' : 'Nonaktif'}
                  </Badge>
                </td>
                <td className="px-4 text-right">
                  <StatusToggle
                    id={product.id}
                    isActive={product.isActive}
                    onToggle={setActive.mutateAsync}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-[13px] text-ink-2">
        <span>
          Menampilkan {data.data.length} dari {data.meta.total} produk
        </span>
        <Pagination page={data.meta.page} pages={pages} />
      </div>
    </div>
  );
}

function Pagination({ page, pages }: { page: number; pages: number }) {
  // useSearchParams rather than window.location, so the links are correct
  // during SSR too and do not change on hydration.
  const searchParams = useSearchParams();

  function href(next: number) {
    const search = new URLSearchParams(searchParams.toString());
    search.set('page', String(next));
    // A query-only relative href isn't one of typedRoutes' known literals;
    // cast at the source rather than at each call site, same pattern as
    // NEW_PRODUCT_ROUTE above.
    return `?${search.toString()}` as Route;
  }

  return (
    <div className="flex items-center gap-2">
      {page > 1 ? (
        <Link href={href(page - 1)} className="rounded-[--radius-control] px-3 py-1.5 hover:bg-paper">
          Sebelumnya
        </Link>
      ) : null}
      <span className="tabular px-2">
        {page} / {pages}
      </span>
      {page < pages ? (
        <Link href={href(page + 1)} className="rounded-[--radius-control] px-3 py-1.5 hover:bg-paper">
          Berikutnya
        </Link>
      ) : null}
    </div>
  );
}
