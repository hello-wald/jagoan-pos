import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(join(__dirname, 'tokens.css'), 'utf8');

function tokenValue(name: string): string {
  const match = new RegExp(`--color-${name}:\\s*(#[0-9A-Fa-f]{6})`).exec(css);
  if (!match) throw new Error(`token --color-${name} not found in tokens.css`);
  return match[1];
}

function channel(value: number): number {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  return (
    0.2126 * channel((n >> 16) & 255) +
    0.7152 * channel((n >> 8) & 255) +
    0.0722 * channel(n & 255)
  );
}

export function contrast(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)];
  const [hi, lo] = x > y ? [x, y] : [y, x];
  return (hi + 0.05) / (lo + 0.05);
}

describe('design tokens meet WCAG AA', () => {
  const floors: ReadonlyArray<[string, number]> = [
    ['ink', 17.4],
    ['ink-2', 7.1],
    ['ink-3', 5.1],
    ['accent-deep', 4.8],
    ['danger', 6.3],
    ['warning', 5.0],
    ['success', 4.8],
  ];

  it.each(floors)('%s clears its floor against --color-paper', (name, floor) => {
    expect(contrast(tokenValue(name), tokenValue('paper'))).toBeGreaterThanOrEqual(floor);
  });

  it('gold fill carries a near-black label above AA', () => {
    expect(contrast(tokenValue('accent'), tokenValue('ink'))).toBeGreaterThanOrEqual(9);
  });

  it('gold is never light enough to serve as text on paper', () => {
    expect(contrast(tokenValue('accent'), tokenValue('paper'))).toBeLessThan(4.5);
  });
});
