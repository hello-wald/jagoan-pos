'use client';

import { useEffect, useState } from 'react';
import {
  AppErrorCode,
  createCategorySchema,
  type CategoryWithUsage,
} from '@jagoan-pos/contracts';
import { messageFor } from '@/lib/i18n/messages';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';

export type CategoryFormModalProps = {
  open: boolean;
  /** Absent for a new category, present when renaming an existing one. */
  category?: CategoryWithUsage;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (name: string) => Promise<void>;
};

export function CategoryFormModal({
  open,
  category,
  isSubmitting,
  onClose,
  onSubmit,
}: CategoryFormModalProps) {
  const [name, setName] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  // The same modal serves create and rename, so it reseeds whenever the row it
  // points at changes rather than holding the previous category's name.
  useEffect(() => {
    if (!open) return;
    setName(category?.name ?? '');
    setFieldError(null);
    setServerError(null);
  }, [open, category]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setServerError(null);

    const result = createCategorySchema.safeParse({ name });
    if (!result.success) {
      setFieldError(result.error.issues[0]?.message ?? 'Nama kategori tidak valid.');
      return;
    }
    setFieldError(null);

    try {
      await onSubmit(result.data.name);
      onClose();
    } catch (error) {
      const code = (error as { code?: AppErrorCode }).code;
      if (code === AppErrorCode.CATEGORY_NAME_ALREADY_EXISTS) {
        setFieldError(messageFor(code));
        return;
      }
      setServerError(messageFor(code ?? AppErrorCode.INTERNAL_ERROR));
    }
  }

  return (
    <Modal
      open={open}
      title={category ? 'Ubah Kategori' : 'Tambah Kategori'}
      description={
        category
          ? 'Nama baru langsung berlaku untuk seluruh produk dalam kategori ini.'
          : 'Kategori baru bisa langsung dipilih saat menambah atau mengubah produk.'
      }
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
        {serverError ? <Banner tone="danger">{serverError}</Banner> : null}

        <Field id="category-name" label="Nama kategori" error={fieldError ?? undefined}>
          <Input
            id="category-name"
            autoFocus
            maxLength={80}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </Field>

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Menyimpan…' : 'Simpan'}
          </Button>
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Batal
          </Button>
        </div>
      </form>
    </Modal>
  );
}
