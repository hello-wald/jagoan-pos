'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Route } from 'next';
import { Controller, useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  AppErrorCode,
  createProductSchema,
  updateProductSchema,
  type CreateProductInput,
  type Product,
  type UpdateProductInput,
} from '@jagoan-pos/contracts';
import { useCreateProduct, useUpdateProduct } from '@/lib/api/products';
import { messageFor } from '@/lib/i18n/messages';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { RupiahInput } from '@/components/ui/rupiah-input';

const PRODUCTS_ROUTE = '/admin/products' as Route;

type FormValues = {
  name: string;
  sku: string;
  category?: string;
  price: number | null;
};

type Props = { mode: 'create'; product?: undefined } | { mode: 'edit'; product: Product };

export function ProductForm({ mode, product }: Props) {
  const router = useRouter();
  const create = useCreateProduct();
  const update = useUpdateProduct(product?.id ?? '');

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isDirty, dirtyFields, isSubmitting },
  } = useForm<FormValues>({
    // create/update schemas have different shapes (all-required vs. all-optional),
    // so zodResolver's inferred type doesn't line up with FormValues on its own;
    // both actually validate FormValues-shaped data at runtime.
    resolver: zodResolver(
      mode === 'create' ? createProductSchema : updateProductSchema,
    ) as Resolver<FormValues>,
    defaultValues: {
      name: product?.name ?? '',
      sku: product?.sku ?? '',
      category: product?.category ?? '',
      price: product?.price ?? null,
    },
  });

  // Unsaved work must not vanish on an accidental reload or tab close.
  useEffect(() => {
    if (!isDirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [isDirty]);

  async function onSubmit(values: FormValues) {
    // price is guaranteed non-null here: the schema rejects null before we run.
    const full: CreateProductInput = {
      name: values.name,
      sku: values.sku,
      category: values.category?.trim() ? values.category.trim() : undefined,
      price: values.price as number,
    };

    // Edit sends only what changed, satisfying updateProductSchema's
    // "at least one field" refinement without resending untouched fields.
    const partial: Partial<CreateProductInput> = {};
    if (dirtyFields.name) partial.name = full.name;
    if (dirtyFields.sku) partial.sku = full.sku;
    if (dirtyFields.category) partial.category = full.category;
    if (dirtyFields.price) partial.price = full.price;

    try {
      if (mode === 'create') {
        await create.mutateAsync(full);
      } else {
        await update.mutateAsync(partial as UpdateProductInput);
      }

      toast.success('Produk berhasil disimpan.');
      router.push(PRODUCTS_ROUTE);
      router.refresh();
    } catch (error) {
      const code = (error as { code?: AppErrorCode }).code ?? AppErrorCode.INTERNAL_ERROR;
      // GAP G-6: no SKU pre-check endpoint, so a collision surfaces on submit.
      if (code === AppErrorCode.SKU_ALREADY_EXISTS) {
        setError('sku', { message: messageFor(code) });
        return;
      }
      toast.error(messageFor(code));
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex max-w-[560px] flex-col gap-5"
      noValidate
    >
      <Field id="name" label="Nama produk" error={errors.name?.message}>
        <Input id="name" {...register('name')} />
      </Field>

      <Field
        id="sku"
        label="SKU"
        hint="Huruf, angka, titik, garis bawah, dan tanda hubung."
        error={errors.sku?.message}
      >
        {/* Mono here so the SKU looks the same as it will in the table. */}
        <Input id="sku" className="font-mono" {...register('sku')} />
      </Field>

      <Field id="category" label="Kategori (opsional)" error={errors.category?.message}>
        <Input id="category" {...register('category')} />
      </Field>

      <Controller
        control={control}
        name="price"
        render={({ field }) => (
          <Field id="price" label="Harga" error={errors.price?.message}>
            <RupiahInput id="price" value={field.value} onChange={field.onChange} />
          </Field>
        )}
      />

      {mode === 'edit' && dirtyFields.price ? (
        <Banner tone="info">
          Perubahan harga berlaku untuk seluruh merchant dan akan terlihat dalam beberapa saat.
        </Banner>
      ) : null}

      <div className="mt-1 flex items-center gap-3">
        <Button type="submit" disabled={isSubmitting || (mode === 'edit' && !isDirty)}>
          {isSubmitting ? 'Menyimpan…' : 'Simpan'}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Batal
        </Button>
      </div>
    </form>
  );
}
