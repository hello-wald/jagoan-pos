const MAX_PRICE = 2_147_483_647; // mirrors priceSchema in contracts

const idr = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});

const grouped = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 });

export function formatIdr(value: number): string {
  return idr.format(value);
}

/** Groups digits for display while the form holds a plain integer. */
export function formatRupiahDisplay(value: number): string {
  return grouped.format(value);
}

export function parseRupiahInput(raw: string): number | null {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 0) return null;
  const value = Number(digits);
  return Number.isSafeInteger(value) && value <= MAX_PRICE ? value : null;
}
