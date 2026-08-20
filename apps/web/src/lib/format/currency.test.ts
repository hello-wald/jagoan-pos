import { describe, expect, it } from 'vitest';
import { formatIdr, parseRupiahInput } from './currency';

describe('formatIdr', () => {
  it('renders whole rupiah with no decimal part', () => {
    // Non-breaking space and separator style vary by ICU build, so assert on
    // the parts that matter rather than an exact string.
    const out = formatIdr(15000);
    expect(out).toContain('Rp');
    expect(out).toContain('15.000');
    expect(out).not.toContain(',00');
  });

  it('handles zero', () => {
    expect(formatIdr(0)).toContain('0');
  });
});

describe('parseRupiahInput', () => {
  it('strips separators and returns an integer', () => {
    expect(parseRupiahInput('15.000')).toBe(15000);
    expect(parseRupiahInput('Rp 15.000')).toBe(15000);
  });

  it('returns null for input with no digits', () => {
    expect(parseRupiahInput('')).toBeNull();
    expect(parseRupiahInput('abc')).toBeNull();
  });

  it('rejects a value above the schema ceiling when max is provided', () => {
    // priceSchema caps at 2_147_483_647.
    expect(parseRupiahInput('9999999999', 2_147_483_647)).toBeNull();
  });
});
