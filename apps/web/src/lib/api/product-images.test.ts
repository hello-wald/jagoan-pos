import { describe, expect, it } from 'vitest';
import {
  ACCEPTED_IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  MAX_IMAGES_PER_PRODUCT,
  validateImageFile,
} from './product-images';

function fakeFile(type: string, size: number): File {
  const file = new File(['x'], 'foto.jpg', { type });
  // Blob size is derived from the parts, so override it to test the cap
  // without allocating megabytes.
  Object.defineProperty(file, 'size', { value: size });
  return file;
}

describe('validateImageFile', () => {
  it('accepts every content type the contract allows', () => {
    for (const type of ACCEPTED_IMAGE_TYPES) {
      expect(validateImageFile(fakeFile(type, 1024), 0)).toBeNull();
    }
  });

  it('rejects a type the gateway would refuse', () => {
    expect(validateImageFile(fakeFile('image/gif', 1024), 0)).toBe('type');
  });

  it('rejects a file over the size cap but allows one exactly at it', () => {
    expect(validateImageFile(fakeFile('image/png', MAX_IMAGE_BYTES + 1), 0)).toBe('size');
    expect(validateImageFile(fakeFile('image/png', MAX_IMAGE_BYTES), 0)).toBeNull();
  });

  it('reports the count first, since a full product rejects any file', () => {
    // products.service counts pending rows too, so the UI must stop at five.
    expect(validateImageFile(fakeFile('image/gif', 1024), MAX_IMAGES_PER_PRODUCT)).toBe('count');
  });
});
