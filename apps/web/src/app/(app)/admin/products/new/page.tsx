import { ProductForm } from '@/components/products/product-form';

export default function NewProductPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl tracking-[-0.015em]">Tambah Produk</h1>
        <p className="text-sm text-ink-2">
          Produk ini akan tersedia untuk seluruh merchant di platform.
        </p>
      </div>
      <ProductForm mode="create" />
    </div>
  );
}
