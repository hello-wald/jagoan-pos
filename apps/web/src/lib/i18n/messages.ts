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
  // Added after a concurrent products-service PR (commit 7227738) introduced
  // image upload support and these five codes, post-dating this file's
  // original authoring. See SDD ledger Ruling 5.
  [AppErrorCode.PRODUCT_IMAGE_NOT_FOUND]: 'Gambar produk tidak ditemukan.',
  [AppErrorCode.PRODUCT_IMAGE_LIMIT_REACHED]: 'Jumlah gambar produk sudah mencapai batas maksimum.',
  [AppErrorCode.INVALID_PRODUCT_IMAGE]: 'Berkas gambar tidak valid.',
  [AppErrorCode.PRODUCT_IMAGE_NOT_READY]: 'Gambar belum selesai diunggah.',
  [AppErrorCode.STORAGE_ERROR]: 'Terjadi kesalahan penyimpanan. Coba lagi.',
  [AppErrorCode.SKU_ALREADY_EXISTS]: 'SKU ini sudah dipakai produk lain.',
  [AppErrorCode.PERMANENT_DELETE_FORBIDDEN]:
    'Produk tidak bisa dihapus permanen. Nonaktifkan produk ini sebagai gantinya.',
  [AppErrorCode.INSUFFICIENT_STOCK]: 'Stok tidak mencukupi.',
  [AppErrorCode.PRODUCT_INACTIVE]: 'Produk ini sudah tidak aktif.',
  [AppErrorCode.INSUFFICIENT_CASH]: 'Jumlah pembayaran kurang dari total.',
  [AppErrorCode.SALE_NOT_FOUND]: 'Transaksi tidak ditemukan.',
  [AppErrorCode.CHECKOUT_CONFLICT]: 'Transaksi ini sedang diproses. Coba lagi sebentar.',
  [AppErrorCode.AUTH_RATE_LIMITED]: 'Terlalu banyak percobaan. Coba lagi dalam satu menit.',
  [AppErrorCode.AI_TEMPORARILY_UNAVAILABLE]:
    'Layanan AI sedang tidak tersedia atau timeout. Coba lagi sebentar.',
  [AppErrorCode.AI_TOOL_NOT_ALLOWED]: 'Fitur atau alat analitik tidak diizinkan.',
  [AppErrorCode.AI_TOOL_ARGUMENTS_INVALID]: 'Parameter analitik tidak valid.',
  [AppErrorCode.AI_TOOL_CALL_LIMIT_REACHED]:
    'Batas pemanggilan data analitik telah tercapai. Coba ajukan pertanyaan yang lebih spesifik.',
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
