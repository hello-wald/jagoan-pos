import type { Metadata } from 'next';
import { CategoryTable } from '@/components/categories/category-table';

export const metadata: Metadata = {
  title: 'Kategori Produk | Jagoan POS',
  description: 'Kelola kategori katalog global yang dipakai untuk mengelompokkan dan menyaring produk.',
};

export default function CategoriesPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl tracking-[-0.015em]">Kategori Produk</h1>
        <p className="text-sm text-ink-2">
          Kategori berlaku untuk seluruh katalog dan menjadi pilihan filter di halaman produk.
        </p>
      </div>

      <CategoryTable />
    </div>
  );
}
