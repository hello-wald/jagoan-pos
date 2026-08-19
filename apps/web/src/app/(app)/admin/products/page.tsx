import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { cookies } from 'next/headers';
import type { Route } from 'next';
import { makeQueryClient } from '@/lib/query/client';
import { buildListQuery, productKeys, type ProductListParams } from '@/lib/api/products.shared';
import { SESSION_COOKIE } from '@/lib/auth/session';
import { ProductFilters } from '@/components/products/product-filters';
import { ProductTable } from '@/components/products/product-table';
import Link from 'next/link';

// Cast at the source, same pattern as homeForRole in lib/auth/roles.ts and
// the NAV table in components/layout/sidebar.tsx: typedRoutes can't see
// /admin/products/new as a literal until Task 12 builds that page.
const NEW_PRODUCT_ROUTE = '/admin/products/new' as Route;

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ query?: string; page?: string; status?: string }>;
}) {
  const sp = await searchParams;
  const params: ProductListParams = {
    query: sp.query,
    page: Number(sp.page ?? 1),
    pageSize: 20,
    activeOnly: sp.status === 'active' ? true : sp.status === 'inactive' ? false : undefined,
  };

  // Prefetch on the server so the first paint carries the table, not a skeleton.
  const client = makeQueryClient();
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  await client.prefetchQuery({
    queryKey: productKeys.list(params),
    queryFn: async () => {
      const url = `${process.env.GATEWAY_URL ?? 'http://localhost:3000'}/api/admin/products${buildListQuery(params)}`;
      const response = await fetch(url, {
        headers: { authorization: `Bearer ${token}`, accept: 'application/json' },
        cache: 'no-store',
      });
      if (!response.ok) throw new Error('prefetch failed');
      return response.json();
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl tracking-[-0.015em]">Katalog Produk</h1>
          <p className="text-sm text-ink-2">
            Katalog dan harga berlaku untuk seluruh merchant di platform.
          </p>
        </div>
        {/* A styled Link, not a Button wrapping one — a button containing an
            anchor is invalid nesting and breaks keyboard semantics. */}
        <Link
          href={NEW_PRODUCT_ROUTE}
          className="inline-flex h-11 shrink-0 items-center rounded-control bg-accent px-5 text-sm font-medium text-ink transition-transform duration-150 active:scale-[0.98]"
        >
          Tambah Produk
        </Link>
      </div>

      <ProductFilters />

      <HydrationBoundary state={dehydrate(client)}>
        <ProductTable params={params} />
      </HydrationBoundary>
    </div>
  );
}
