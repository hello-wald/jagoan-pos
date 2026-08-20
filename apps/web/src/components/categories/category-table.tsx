'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import { toast } from 'sonner';
import { AppErrorCode, type CategoryWithUsage } from '@jagoan-pos/contracts';
import {
  useCategoryList,
  useCreateCategory,
  useSetCategoryActive,
  useUpdateCategory,
} from '@/lib/api/categories';
import { messageFor } from '@/lib/i18n/messages';
import { Badge } from '@/components/ui/badge';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { CategoryFormModal } from './category-form-modal';

const COLUMNS = ['Nama', 'Produk', 'Status', ''] as const;

// Cast at the source, same pattern as the products table: a query-only href is
// not one of typedRoutes' known literals.
const PRODUCTS_ROUTE = '/admin/products' as Route;
const productsInCategory = (id: string) => `/admin/products?category=${id}` as Route;

export function CategoryTable() {
  const { data, isPending, isError, refetch } = useCategoryList();
  const create = useCreateCategory();
  const update = useUpdateCategory();
  const setActive = useSetCategoryActive();

  // undefined = closed, null = creating, a row = renaming that row.
  const [editing, setEditing] = useState<CategoryWithUsage | null | undefined>(undefined);

  async function handleSubmit(name: string) {
    if (editing) {
      await update.mutateAsync({ id: editing.id, dto: { name } });
      toast.success('Kategori berhasil diubah.');
      return;
    }
    await create.mutateAsync({ name });
    toast.success('Kategori berhasil ditambahkan.');
  }

  async function handleToggle(category: CategoryWithUsage) {
    const next = !category.isActive;
    try {
      await setActive.mutateAsync({ id: category.id, isActive: next });
      toast.success(next ? 'Kategori diaktifkan.' : 'Kategori dinonaktifkan.');
    } catch (error) {
      const code = (error as { code?: AppErrorCode }).code ?? AppErrorCode.INTERNAL_ERROR;
      toast.error(messageFor(code));
    }
  }

  if (isPending) {
    return (
      <div className="divide-y divide-line rounded-panel border border-line bg-surface">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex h-[52px] items-center gap-4 px-4">
            <Skeleton className="h-4 flex-[3]" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-32" />
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-start gap-3">
        <Banner tone="danger">Kategori gagal dimuat.</Banner>
        <Button variant="secondary" size="sm" onClick={() => void refetch()}>
          Coba lagi
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button onClick={() => setEditing(null)}>Tambah Kategori</Button>
      </div>

      {data.length === 0 ? (
        <EmptyState
          title="Belum ada kategori"
          description="Kategori mengelompokkan produk di katalog dan menjadi pilihan filter bagi administrator."
          action={
            <Button size="sm" onClick={() => setEditing(null)}>
              Tambah Kategori
            </Button>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-panel border border-line bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line">
                {COLUMNS.map((column, i) => (
                  <th
                    key={column || i}
                    scope="col"
                    className={`px-4 py-3 text-[11px] font-medium uppercase tracking-[0.04em] text-ink-3 ${
                      column === 'Produk' ? 'text-right' : 'text-left'
                    }`}
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.map((category) => (
                <tr key={category.id} className="h-[52px]">
                  <td className="px-4 font-medium text-ink">{category.name}</td>
                  <td className="tabular px-4 text-right text-ink-2">
                    {category.productCount > 0 ? (
                      <Link
                        href={productsInCategory(category.id)}
                        className="underline-offset-4 hover:underline"
                      >
                        {category.productCount}
                      </Link>
                    ) : (
                      '0'
                    )}
                  </td>
                  <td className="px-4">
                    <Badge tone={category.isActive ? 'success' : 'neutral'}>
                      {category.isActive ? 'Aktif' : 'Nonaktif'}
                    </Badge>
                  </td>
                  <td className="px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => setEditing(category)}>
                        Ubah
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => void handleToggle(category)}
                        disabled={setActive.isPending}
                      >
                        {category.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-[13px] text-ink-3">
        Kategori tidak bisa dihapus permanen karena masih dirujuk produk. Kategori nonaktif tidak
        lagi muncul saat memilih kategori produk baru, tetapi produk yang sudah memakainya tetap
        utuh dan masih bisa disaring lewat filter kategori di{' '}
        <Link href={PRODUCTS_ROUTE} className="underline underline-offset-4 hover:text-ink-2">
          Katalog Produk
        </Link>
        .
      </p>

      <CategoryFormModal
        open={editing !== undefined}
        category={editing ?? undefined}
        isSubmitting={create.isPending || update.isPending}
        onClose={() => setEditing(undefined)}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
