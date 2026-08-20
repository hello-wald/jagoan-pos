'use client';

import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AppErrorCode,
  createProductImageUploadSchema,
  type ProductImage,
  type ProductImageUpload,
} from '@jagoan-pos/contracts';
import { bffFetch } from './bff-client';
import { productKeys } from './products.shared';

/** Mirrors createProductImageUploadSchema's contentType enum, so the file
 *  picker and the gateway agree on what counts as an image. */
export const ACCEPTED_IMAGE_TYPES = createProductImageUploadSchema.shape.contentType.options;

/** The gateway rejects anything larger before the upload URL is minted;
 *  checking here saves a round trip and gives a message in Indonesian. */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** products.service caps a product at 5 images, counting pending ones. */
export const MAX_IMAGES_PER_PRODUCT = 5;

export type ImageValidationError = 'type' | 'size' | 'count';

export function validateImageFile(file: File, currentCount: number): ImageValidationError | null {
  if (currentCount >= MAX_IMAGES_PER_PRODUCT) return 'count';
  if (!(ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type)) return 'type';
  if (file.size > MAX_IMAGE_BYTES) return 'size';
  return null;
}

/**
 * Uploads bypass the BFF: the bytes go straight to the storage signed URL, so
 * they never pass through Next's route handler. Shaped like uploadToSignedUrl
 * in @supabase/storage-js — a Blob body is sent as multipart, which is how the
 * storage API learns the file's own content type.
 */
async function putToSignedUrl(uploadUrl: string, file: File): Promise<void> {
  const body = new FormData();
  body.append('cacheControl', '3600');
  body.append('', file);

  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'x-upsert': 'false' },
    body,
  });

  if (!response.ok) {
    // Storage errors are not AppErrors; give the caller a code it can translate.
    throw { code: AppErrorCode.STORAGE_ERROR, status: response.status, message: 'Upload failed' };
  }
}

/**
 * Three legs, all of which must run for the image to become visible:
 * reserve a row and an upload URL, push the bytes, then have the service
 * verify size and type against what was reserved and flip the row to READY.
 *
 * The product id is a mutation variable rather than a hook argument because
 * the create form only learns it after the product has been saved.
 */
export function useUploadProductImage() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: async ({
      productId,
      file,
    }: {
      productId: string;
      file: File;
    }): Promise<ProductImage> => {
      const upload = await bffFetch<ProductImageUpload>(
        `/admin/products/${productId}/images/upload-url`,
        {
          method: 'POST',
          body: JSON.stringify({
            fileName: file.name,
            contentType: file.type,
            sizeBytes: file.size,
          }),
        },
      );

      await putToSignedUrl(upload.uploadUrl, file);

      return bffFetch<ProductImage>(
        `/admin/products/${productId}/images/${upload.imageId}/complete`,
        { method: 'POST' },
      );
    },
    // The detail response carries freshly signed read URLs, so refetch rather
    // than splicing the new image into the cached product by hand.
    onSuccess: () => client.invalidateQueries({ queryKey: productKeys.all }),
  });
}

export type UploadFailure = { fileName: string; code: AppErrorCode };

/**
 * Uploads a batch one file at a time and reports what did not make it.
 *
 * Sequential on purpose: the service counts pending rows against the
 * five-image cap, so a parallel batch could slip past it. A rejected file
 * does not abandon the rest — except at the cap, where every remaining file
 * would fail the same way.
 */
export function useUploadProductImages() {
  const upload = useUploadProductImage();

  const run = useCallback(
    async (productId: string, files: File[]): Promise<UploadFailure[]> => {
      const failures: UploadFailure[] = [];

      for (const file of files) {
        try {
          await upload.mutateAsync({ productId, file });
        } catch (error) {
          const code = (error as { code?: AppErrorCode }).code ?? AppErrorCode.INTERNAL_ERROR;
          failures.push({ fileName: file.name, code });
          if (code === AppErrorCode.PRODUCT_IMAGE_LIMIT_REACHED) break;
        }
      }

      return failures;
    },
    [upload],
  );

  return { run, isPending: upload.isPending };
}

export function useDeleteProductImage(productId: string) {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (imageId: string) =>
      bffFetch<void>(`/admin/products/${productId}/images/${imageId}`, { method: 'DELETE' }),
    onSuccess: () => client.invalidateQueries({ queryKey: productKeys.all }),
  });
}
