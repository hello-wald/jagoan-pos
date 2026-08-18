'use client';

import { AppErrorCode } from '@jagoan-pos/contracts';
import { useProduct } from '@/lib/api/products';
import { messageFor } from '@/lib/i18n/messages';
import { Banner } from '@/components/ui/banner';
import { Skeleton } from '@/components/ui/skeleton';
import { ProductForm } from './product-form';

export function EditProductLoader({ productId }: { productId: string }) {
  const { data, isPending, isError, error } = useProduct(productId);

  if (isPending) {
    // Four field blocks matching the form's geometry, so nothing shifts on load.
    return (
      <div className="flex max-w-[560px] flex-col gap-5">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-11 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    const code = (error as { code?: AppErrorCode }).code ?? AppErrorCode.PRODUCT_NOT_FOUND;
    return <Banner tone="danger">{messageFor(code)}</Banner>;
  }

  return <ProductForm mode="edit" product={data} />;
}
