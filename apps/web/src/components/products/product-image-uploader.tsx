'use client';

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { ImageSquare, Spinner, Trash, UploadSimple } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { AppErrorCode, type ProductImage } from '@jagoan-pos/contracts';
import {
  ACCEPTED_IMAGE_TYPES,
  MAX_IMAGES_PER_PRODUCT,
  useDeleteProductImage,
  useUploadProductImages,
  validateImageFile,
  type ImageValidationError,
} from '@/lib/api/product-images';
import { messageFor } from '@/lib/i18n/messages';
import { Button } from '@/components/ui/button';

const VALIDATION_MESSAGES: Record<ImageValidationError, string> = {
  type: 'Format gambar harus JPG, PNG, atau WEBP.',
  size: 'Ukuran gambar maksimal 5 MB.',
  count: `Maksimal ${MAX_IMAGES_PER_PRODUCT} gambar per produk.`,
};

/**
 * On edit the product already exists, so a picked file uploads immediately.
 * On create there is no id to attach to yet, so files are held here and the
 * form uploads them once the product has been saved.
 */
type Props =
  | {
      mode: 'edit';
      productId: string;
      images: ProductImage[];
      files?: undefined;
      onChange?: undefined;
    }
  | {
      mode: 'create';
      files: File[];
      onChange: (files: File[]) => void;
      productId?: undefined;
      images?: undefined;
    };

type Thumb = { key: string; url: string; remove: () => void };

/** Stable identity: a fresh [] each render would re-run the preview effect. */
const NO_STAGED_FILES: File[] = [];

export function ProductImageUploader(props: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [confirmingKey, setConfirmingKey] = useState<string | null>(null);

  const upload = useUploadProductImages();
  // A staged product has no id to delete against; the hook is still called
  // unconditionally so the hook order stays stable across both modes.
  const remove = useDeleteProductImage(props.productId ?? '');

  const staged = props.mode === 'create' ? props.files : NO_STAGED_FILES;

  // Object URLs are leaked memory until revoked, so they are rebuilt and
  // released as a unit whenever the staged list changes.
  const previews = useMemo(() => staged.map((file) => URL.createObjectURL(file)), [staged]);
  useEffect(() => {
    return () => previews.forEach((url) => URL.revokeObjectURL(url));
  }, [previews]);

  const count = props.mode === 'edit' ? props.images.length : staged.length;
  const isFull = count >= MAX_IMAGES_PER_PRODUCT;
  const busy = upload.isPending || remove.isPending;

  function removeStaged(index: number) {
    if (props.mode !== 'create') return;
    props.onChange(props.files.filter((_, i) => i !== index));
  }

  async function deleteAttached(imageId: string) {
    setConfirmingKey(null);
    try {
      await remove.mutateAsync(imageId);
      toast.success('Gambar dihapus.');
    } catch (error) {
      const code = (error as { code?: AppErrorCode }).code ?? AppErrorCode.INTERNAL_ERROR;
      toast.error(messageFor(code));
    }
  }

  const thumbs: Thumb[] =
    props.mode === 'edit'
      ? props.images.map((image) => ({
          key: image.id,
          url: image.url,
          remove: () => setConfirmingKey(image.id),
        }))
      : previews.map((url, index) => ({
          key: `${staged[index].name}-${index}`,
          url,
          // Nothing is stored yet, so a staged file drops without a confirm.
          remove: () => removeStaged(index),
        }));

  /** Files are validated as they arrive, in both modes, so a staged batch
   *  cannot fail at save time for something checkable up front. */
  function accept(incoming: File[]) {
    const accepted: File[] = [];
    let projected = count;

    for (const file of incoming) {
      const problem = validateImageFile(file, projected);
      if (problem) {
        toast.error(`${file.name}: ${VALIDATION_MESSAGES[problem]}`);
        if (problem === 'count') break;
        continue;
      }
      accepted.push(file);
      projected += 1;
    }

    if (accepted.length === 0) return;

    if (props.mode === 'create') {
      props.onChange([...props.files, ...accepted]);
      return;
    }

    void uploadNow(props.productId, accepted);
  }

  async function uploadNow(productId: string, files: File[]) {
    const failures = await upload.run(productId, files);

    for (const failure of failures) {
      toast.error(`${failure.fileName}: ${messageFor(failure.code)}`);
    }
    const succeeded = files.length - failures.length;
    if (succeeded > 0) toast.success(`${succeeded} gambar berhasil diunggah.`);
  }

  function onPick(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    // Reset first so re-picking the same file still fires a change event.
    event.target.value = '';
    if (files.length > 0) accept(files);
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    if (busy || isFull) return;
    const files = Array.from(event.dataTransfer.files);
    if (files.length > 0) accept(files);
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-medium text-ink">Gambar produk</h2>
        <span className="text-xs text-ink-2">
          {count}/{MAX_IMAGES_PER_PRODUCT}
        </span>
      </div>

      {thumbs.length > 0 ? (
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {thumbs.map((thumb) => (
            <li
              key={thumb.key}
              className="group relative aspect-square overflow-hidden rounded-panel border border-line bg-paper"
            >
              {/* A plain img, not next/image: signed storage URLs expire and
                  vary by host, so the optimizer would need a remotePatterns
                  entry for every environment's Supabase project — and staged
                  previews are blob: URLs it cannot touch at all. */}
              <img
                src={thumb.url}
                alt=""
                className="h-full w-full object-cover"
                loading="lazy"
                draggable={false}
              />

              {confirmingKey === thumb.key ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-ink/70 p-2 text-center">
                  <span className="text-[11px] leading-tight text-white">Hapus gambar ini?</span>
                  <div className="flex gap-1.5">
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      disabled={busy}
                      onClick={() => void deleteAttached(thumb.key)}
                    >
                      Hapus
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setConfirmingKey(null)}
                    >
                      Batal
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={thumb.remove}
                  disabled={busy}
                  aria-label="Hapus gambar"
                  className="absolute top-1.5 right-1.5 flex h-7 w-7 items-center justify-center rounded-control bg-ink/60 text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus-visible:opacity-100 disabled:pointer-events-none"
                >
                  <Trash size={15} aria-hidden />
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : null}

      <div
        onDragOver={(event) => {
          event.preventDefault();
          if (!busy && !isFull) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`flex flex-col items-center gap-2 rounded-panel border border-dashed p-6 text-center transition-colors duration-150 ${
          dragging ? 'border-accent bg-accent/5' : 'border-line bg-paper'
        } ${isFull ? 'opacity-60' : ''}`}
      >
        {upload.isPending ? (
          <Spinner size={22} className="animate-spin text-ink-2" aria-hidden />
        ) : (
          <ImageSquare size={22} className="text-ink-2" aria-hidden />
        )}

        <p className="text-[13px] text-ink-2">
          {isFull
            ? `Sudah mencapai batas ${MAX_IMAGES_PER_PRODUCT} gambar.`
            : 'Tarik gambar ke sini atau pilih dari perangkat.'}
        </p>
        <p className="text-xs text-ink-2">
          {props.mode === 'create'
            ? 'JPG, PNG, atau WEBP. Diunggah setelah produk disimpan.'
            : 'JPG, PNG, atau WEBP. Maksimal 5 MB per gambar.'}
        </p>

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_IMAGE_TYPES.join(',')}
          multiple
          className="hidden"
          onChange={onPick}
        />

        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="mt-1"
          disabled={busy || isFull}
          onClick={() => inputRef.current?.click()}
        >
          <UploadSimple size={16} aria-hidden />
          {upload.isPending ? 'Mengunggah…' : 'Pilih gambar'}
        </Button>
      </div>
    </section>
  );
}
