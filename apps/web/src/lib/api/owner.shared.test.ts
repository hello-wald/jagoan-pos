import { describe, expect, it } from 'vitest';
import {
  buildInventoryQuery,
  buildTransactionsQuery,
  getMonthComparisonRanges,
  getPresetDateRange,
} from './owner.shared';

describe('owner.shared query helpers', () => {
  describe('getPresetDateRange', () => {
    // Fixed date in Asia/Jakarta: 2026-08-19 15:00:00 (UTC: 2026-08-19 08:00:00)
    const mockNow = new Date('2026-08-19T08:00:00.000Z');

    it('generates Asia/Jakarta date range for TODAY', () => {
      const range = getPresetDateRange('TODAY', mockNow);
      expect(range).toEqual({
        from: '2026-08-19',
        to: '2026-08-19',
      });
    });

    it('generates Asia/Jakarta date range for 7D', () => {
      const range = getPresetDateRange('7D', mockNow);
      expect(range).toEqual({
        from: '2026-08-13',
        to: '2026-08-19',
      });
    });

    it('generates Asia/Jakarta date range for 30D', () => {
      const range = getPresetDateRange('30D', mockNow);
      expect(range).toEqual({
        from: '2026-07-21',
        to: '2026-08-19',
      });
    });
  });

  describe('getMonthComparisonRanges', () => {
    // 2026-08-19
    const mockNow = new Date('2026-08-19T08:00:00.000Z');

    it('produces current month and previous month ranges', () => {
      const { current, previous } = getMonthComparisonRanges(mockNow);
      expect(current).toEqual({
        from: '2026-08-01',
        to: '2026-08-19',
      });
      expect(previous).toEqual({
        from: '2026-07-01',
        to: '2026-07-19',
      });
    });
  });

  describe('buildInventoryQuery', () => {
    it('omits blank search values and undefined params', () => {
      const query = buildInventoryQuery({
        page: 1,
        limit: 20,
        search: '   ',
        activeOnly: undefined,
      });
      expect(query).toBe('?page=1&limit=20');
    });

    it('includes trimmed search and activeOnly flag', () => {
      const query = buildInventoryQuery({
        page: 2,
        limit: 10,
        search: 'kopi',
        activeOnly: true,
      });
      expect(query).toBe('?page=2&limit=10&search=kopi&activeOnly=true');
    });
  });

  describe('buildTransactionsQuery', () => {
    it('preserves page, limit, search, startDate, and endDate', () => {
      const query = buildTransactionsQuery({
        page: 1,
        limit: 20,
        search: 'TRX-123',
        startDate: '2026-08-01',
        endDate: '2026-08-19',
      });
      expect(query).toBe('?page=1&limit=20&search=TRX-123&startDate=2026-08-01&endDate=2026-08-19');
    });

    it('omits empty search and date filters when not provided', () => {
      const query = buildTransactionsQuery({
        page: 1,
        limit: 50,
      });
      expect(query).toBe('?page=1&limit=50');
    });
  });
});
