import type { ClickHouseService } from '../clickhouse/clickhouse.service';
import { ReportsService } from './reports.service';

const MERCHANT = '2f1c4a5e-0b8d-4c3a-9f21-6b7d8e9a0c11';
const RANGE = { merchantId: MERCHANT, from: '2026-08-01', to: '2026-08-03' };

type Call = { query: string; params: Record<string, unknown> };

// Matches on the table each query reads, so tests assert on shaping, not order.
function fakeClickHouse(responses: Record<string, unknown[]>) {
  const calls: Call[] = [];
  const service = {
    query: async (query: string, params: Record<string, unknown> = {}) => {
      calls.push({ query, params });
      const key = Object.keys(responses).find((table) => query.includes(table));
      return key ? responses[key] : [];
    },
  } as unknown as ClickHouseService;
  return { service, calls };
}

const refreshedAt = { view_refreshes: [{ asOf: '2026-08-16 14:05:00' }] };

describe('ReportsService', () => {
  describe('dashboard', () => {
    it('derives average basket from revenue and transactions', async () => {
      const { service } = fakeClickHouse({
        sales_daily: [{ revenue: '90000', transactions: '3', units: '12' }],
        ...refreshedAt,
      });

      const result = await new ReportsService(service).dashboard({ merchantId: MERCHANT });

      expect(result.revenue).toBe(90_000);
      expect(result.transactions).toBe(3);
      expect(result.averageBasket).toBe(30_000);
      expect(result.asOf).toBe('2026-08-16 14:05:00');
    });

    // Untouched, these would concatenate instead of adding.
    it('coerces string-encoded 64-bit integers to numbers', async () => {
      const { service } = fakeClickHouse({
        sales_daily: [{ revenue: '90000', transactions: '3', units: '12' }],
        ...refreshedAt,
      });

      const result = await new ReportsService(service).dashboard({ merchantId: MERCHANT });

      expect(typeof result.revenue).toBe('number');
      expect(typeof result.units).toBe('number');
    });

    it('returns zeroes rather than throwing when the merchant has no sales today', async () => {
      const { service } = fakeClickHouse({ ...refreshedAt });

      const result = await new ReportsService(service).dashboard({ merchantId: MERCHANT });

      expect(result).toMatchObject({ revenue: 0, transactions: 0, averageBasket: 0 });
    });

    it('reports asOf as null before the first refresh instead of inventing a time', async () => {
      const { service } = fakeClickHouse({ sales_daily: [], view_refreshes: [{ asOf: null }] });

      const result = await new ReportsService(service).dashboard({ merchantId: MERCHANT });

      expect(result.asOf).toBeNull();
    });

    it('scopes the query to the requested merchant', async () => {
      const { service, calls } = fakeClickHouse({ ...refreshedAt });

      await new ReportsService(service).dashboard({ merchantId: MERCHANT });

      const [dashboardCall] = calls;
      expect(dashboardCall.params.merchantId).toBe(MERCHANT);
      expect(dashboardCall.query).toContain('{merchantId:UUID}');
      expect(dashboardCall.query).not.toContain(MERCHANT);
    });
  });

  describe('revenueRange', () => {
    it('totals the range and derives one basket figure across it', async () => {
      const { service } = fakeClickHouse({
        sales_daily: [
          { dayLabel: '2026-08-01', revenue: '10000', transactions: '1', units: '2' },
          { dayLabel: '2026-08-02', revenue: '20000', transactions: '3', units: '5' },
        ],
        ...refreshedAt,
      });

      const result = await new ReportsService(service).revenueRange(RANGE);

      expect(result.totalRevenue).toBe(30_000);
      expect(result.totalTransactions).toBe(4);
      // 30000/4, not the mean of the daily baskets (8333).
      expect(result.averageBasket).toBe(7_500);
      expect(result.days).toHaveLength(2);
    });

    it('returns an empty series for a range with no sales', async () => {
      const { service } = fakeClickHouse({ ...refreshedAt });

      const result = await new ReportsService(service).revenueRange(RANGE);

      expect(result).toMatchObject({ totalRevenue: 0, totalTransactions: 0, averageBasket: 0 });
      expect(result.days).toEqual([]);
    });
  });

  describe('topProducts', () => {
    it('orders descending for best sellers', async () => {
      const { service, calls } = fakeClickHouse({ product_daily: [], ...refreshedAt });

      await new ReportsService(service).topProducts({ ...RANGE, limit: 5, direction: 'best' });

      expect(calls[0].query).toContain('ORDER BY revenue DESC');
      expect(calls[0].params.limit).toBe(5);
    });

    it('orders ascending for worst sellers', async () => {
      const { service, calls } = fakeClickHouse({ product_daily: [], ...refreshedAt });

      await new ReportsService(service).topProducts({ ...RANGE, limit: 5, direction: 'worst' });

      expect(calls[0].query).toContain('ORDER BY revenue ASC');
    });

    it('groups by product id so a renamed product is not split in two', async () => {
      const { service, calls } = fakeClickHouse({ product_daily: [], ...refreshedAt });

      await new ReportsService(service).topProducts({ ...RANGE, limit: 5, direction: 'best' });

      expect(calls[0].query).toContain('GROUP BY product_id');
      expect(calls[0].query).toContain('argMax(product_name, day)');
    });
  });

  describe('hourly', () => {
    it('zero-fills all 24 hours so a quiet hour is a trough, not a gap', async () => {
      const { service } = fakeClickHouse({
        sales_hourly: [{ hour: 12, revenue: '5000', transactions: '2', units: '3' }],
        ...refreshedAt,
      });

      const result = await new ReportsService(service).hourly(RANGE);

      expect(result.hours).toHaveLength(24);
      expect(result.hours[0]).toEqual({ hour: 0, revenue: 0, transactions: 0, units: 0 });
      expect(result.hours[12]).toEqual({ hour: 12, revenue: 5000, transactions: 2, units: 3 });
      expect(result.hours.map((point) => point.hour)).toEqual(
        Array.from({ length: 24 }, (_unused, hour) => hour),
      );
    });
  });

  describe('platformTotals', () => {
    // Summing per-day merchants would multiply one merchant trading daily.
    it('recomputes distinct merchants for the range instead of summing days', async () => {
      const { service } = fakeClickHouse({
        platform_daily: [
          {
            dayLabel: '2026-08-01',
            merchants: '2',
            revenue: '10000',
            transactions: '4',
            units: '9',
          },
          {
            dayLabel: '2026-08-02',
            merchants: '2',
            revenue: '20000',
            transactions: '6',
            units: '11',
          },
        ],
        sales_daily: [{ merchants: '3' }],
        ...refreshedAt,
      });

      const result = await new ReportsService(service).platformTotals({
        from: '2026-08-01',
        to: '2026-08-02',
      });

      expect(result.merchants).toBe(3);
      expect(result.revenue).toBe(30_000);
      expect(result.transactions).toBe(10);
    });
  });
});
