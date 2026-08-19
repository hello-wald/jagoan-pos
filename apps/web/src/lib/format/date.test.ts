import { describe, expect, it } from 'vitest';
import { formatDateWib, formatDateTimeWib, parseUtcDate } from './date';

describe('Date formatting helpers', () => {
  describe('parseUtcDate', () => {
    it('parses bare ClickHouse UTC timestamp string', () => {
      // 09:10 UTC should be 16:10 WIB (UTC+7)
      const date = parseUtcDate('2026-08-19 09:10:00');
      expect(date.toISOString()).toBe('2026-08-19T09:10:00.000Z');
    });

    it('parses standard ISO-8601 string with Z', () => {
      const date = parseUtcDate('2026-08-19T09:10:00.000Z');
      expect(date.toISOString()).toBe('2026-08-19T09:10:00.000Z');
    });

    it('handles Date instances directly', () => {
      const input = new Date('2026-08-19T09:10:00.000Z');
      const date = parseUtcDate(input);
      expect(date.getTime()).toBe(input.getTime());
    });
  });

  describe('formatDateTimeWib', () => {
    it('formats UTC time correctly into Asia/Jakarta (WIB) with 7 hours offset', () => {
      // 09:10 UTC -> 16.10 WIB
      const formatted = formatDateTimeWib('2026-08-19 09:10:00');
      expect(formatted).toMatch(/19 Agu 2026/);
      expect(formatted).toMatch(/16[.:]10/);
    });

    it('returns empty string or null for null/undefined input', () => {
      expect(formatDateTimeWib(null)).toBeNull();
      expect(formatDateTimeWib(undefined)).toBeNull();
    });
  });

  describe('formatDateWib', () => {
    it('formats date into Indonesian format in WIB', () => {
      const formatted = formatDateWib('2026-08-19T09:10:00.000Z');
      expect(formatted).toMatch(/19 Agu 2026/);
    });
  });
});
