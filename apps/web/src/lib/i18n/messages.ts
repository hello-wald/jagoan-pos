import { AppErrorCode } from '@jagoan-pos/contracts';

const MESSAGES: Record<AppErrorCode, string> = {
  // Deliberately non-enumerating: FRD US-1.1 forbids revealing whether the
  // email exists. Do not split this into separate email/password messages.
  [AppErrorCode.INVALID_CREDENTIALS]: 'Email atau kata sandi salah.',
  [AppErrorCode.EMAIL_ALREADY_EXISTS]: 'Email ini sudah terdaftar.',
  [AppErrorCode.USER_INACTIVE]: 'Akun Anda dinonaktifkan. Hubungi pemilik merchant Anda.',
  [AppErrorCode.USER_NOT_FOUND]: 'Pengguna tidak ditemukan.',
  [AppErrorCode.CASHIER_NOT_FOUND]: 'Kasir tidak ditemukan.',
  [AppErrorCode.PRODUCT_NOT_FOUND]: 'Produk tidak ditemukan.',
  [AppErrorCode.SKU_ALREADY_EXISTS]: 'SKU ini sudah dipakai produk lain.',
  [AppErrorCode.PERMANENT_DELETE_FORBIDDEN]:
    'Produk tidak bisa dihapus permanen. Nonaktifkan produk ini sebagai gantinya.',
  [AppErrorCode.INSUFFICIENT_STOCK]: 'Stok tidak mencukupi.',
  [AppErrorCode.PRODUCT_INACTIVE]: 'Produk ini sudah tidak aktif.',
  [AppErrorCode.INSUFFICIENT_CASH]: 'Jumlah pembayaran kurang dari total.',
  [AppErrorCode.SALE_NOT_FOUND]: 'Transaksi tidak ditemukan.',
  [AppErrorCode.CHECKOUT_CONFLICT]: 'Transaksi ini sedang diproses. Coba lagi sebentar.',
  [AppErrorCode.AUTH_RATE_LIMITED]: 'Terlalu banyak percobaan. Coba lagi dalam satu menit.',
  [AppErrorCode.INTERNAL_ERROR]: 'Terjadi kesalahan. Coba lagi.',
};

export function messageFor(code: AppErrorCode): string {
  return MESSAGES[code] ?? MESSAGES[AppErrorCode.INTERNAL_ERROR];
}

/**
 * Codes that belong on a specific input rather than in a banner or a toast.
 * A toast cannot point at a field, so these must always render inline.
 */
export const FIELD_ERROR_CODES: Partial<Record<AppErrorCode, string>> = {
  [AppErrorCode.EMAIL_ALREADY_EXISTS]: 'email',
  [AppErrorCode.SKU_ALREADY_EXISTS]: 'sku',
};
