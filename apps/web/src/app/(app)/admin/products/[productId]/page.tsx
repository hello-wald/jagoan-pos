import { EditProductLoader } from '@/components/products/edit-product-loader';

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = await params;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl tracking-[-0.015em]">Ubah Produk</h1>
      <EditProductLoader productId={productId} />
    </div>
  );
}
