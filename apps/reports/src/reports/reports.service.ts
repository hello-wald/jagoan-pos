import { Injectable } from '@nestjs/common';
import {
  REPORT_TIME_ZONE,
  type DashboardInput,
  type DashboardTotals,
  type DateRangeInput,
  type HourlyPoint,
  type HourlySales,
  type MerchantRangeInput,
  type PlatformTotals,
  type ProductRanking,
  type RevenuePoint,
  type RevenueRange,
  type TopProducts,
  type TopProductsInput,
} from '@jagoan-pos/contracts';
import { ClickHouseService } from '../clickhouse/clickhouse.service';

// asOf comes from each view's last successful refresh, not the request time.
const SOURCE_VIEW = {
  daily: 'sales_daily_mv',
  hourly: 'sales_hourly_mv',
  product: 'product_daily_mv',
  platform: 'platform_daily_mv',
} as const;

const HOURS_IN_DAY = 24;

// ClickHouse sends 64-bit integers as JSON strings.
const toNumber = (value: unknown): number => Number(value ?? 0);

// Derived, never stored: summing stored ratios is wrong.
const basket = (revenue: number, transactions: number): number =>
  transactions === 0 ? 0 : Math.round(revenue / transactions);

@Injectable()
export class ReportsService {
  constructor(private readonly clickhouse: ClickHouseService) {}

  // US-5.1
  async dashboard(input: DashboardInput): Promise<DashboardTotals> {
    const day = this.today();
    const [row] = await this.clickhouse.query<{
      revenue: string;
      transactions: string;
      units: string;
    }>(
      `SELECT revenue, transactions, units
         FROM sales_daily
        WHERE merchant_id = {merchantId:UUID} AND day = {day:Date}`,
      { merchantId: input.merchantId, day },
    );

    const revenue = toNumber(row?.revenue);
    const transactions = toNumber(row?.transactions);
    return {
      day,
      revenue,
      transactions,
      units: toNumber(row?.units),
      averageBasket: basket(revenue, transactions),
      asOf: await this.asOf(SOURCE_VIEW.daily),
    };
  }

  // US-5.2
  async revenueRange(input: MerchantRangeInput): Promise<RevenueRange> {
    // Aliased `dayLabel`: shadowing `day` makes WHERE compare String to Date.
    const rows = await this.clickhouse.query<{
      dayLabel: string;
      revenue: string;
      transactions: string;
      units: string;
    }>(
      `SELECT toString(day) AS dayLabel, revenue, transactions, units
         FROM sales_daily
        WHERE merchant_id = {merchantId:UUID}
          AND day BETWEEN {from:Date} AND {to:Date}
        ORDER BY day`,
      { merchantId: input.merchantId, from: input.from, to: input.to },
    );

    const days: RevenuePoint[] = rows.map((row) => ({
      day: row.dayLabel,
      revenue: toNumber(row.revenue),
      transactions: toNumber(row.transactions),
      units: toNumber(row.units),
    }));

    // The per-day series is needed anyway, so a second aggregate query buys nothing.
    const totalRevenue = days.reduce((sum, point) => sum + point.revenue, 0);
    const totalTransactions = days.reduce((sum, point) => sum + point.transactions, 0);

    return {
      from: input.from,
      to: input.to,
      totalRevenue,
      totalTransactions,
      averageBasket: basket(totalRevenue, totalTransactions),
      days,
      asOf: await this.asOf(SOURCE_VIEW.daily),
    };
  }

  // US-5.3
  async topProducts(input: TopProductsInput): Promise<TopProducts> {
    // By product_id so a mid-period rename stays one row.
    const rows = await this.clickhouse.query<{
      productId: string;
      productName: string;
      sku: string;
      revenue: string;
      units: string;
      transactions: string;
    }>(
      `SELECT toString(product_id)         AS productId,
              argMax(product_name, day)    AS productName,
              argMax(sku, day)             AS sku,
              sum(revenue)                 AS revenue,
              sum(units)                   AS units,
              sum(transactions)            AS transactions
         FROM product_daily
        WHERE merchant_id = {merchantId:UUID}
          AND day BETWEEN {from:Date} AND {to:Date}
        GROUP BY product_id
        ORDER BY revenue ${input.direction === 'worst' ? 'ASC' : 'DESC'}, productName ASC
        LIMIT {limit:UInt32}`,
      { merchantId: input.merchantId, from: input.from, to: input.to, limit: input.limit },
    );

    const products: ProductRanking[] = rows.map((row) => ({
      productId: row.productId,
      productName: row.productName,
      sku: row.sku,
      revenue: toNumber(row.revenue),
      units: toNumber(row.units),
      transactions: toNumber(row.transactions),
    }));

    return {
      from: input.from,
      to: input.to,
      direction: input.direction,
      products,
      asOf: await this.asOf(SOURCE_VIEW.product),
    };
  }

  // US-5.4
  async hourly(input: MerchantRangeInput): Promise<HourlySales> {
    const rows = await this.clickhouse.query<{
      hour: number;
      revenue: string;
      transactions: string;
      units: string;
    }>(
      `SELECT hour,
              sum(revenue)      AS revenue,
              sum(transactions) AS transactions,
              sum(units)        AS units
         FROM sales_hourly
        WHERE merchant_id = {merchantId:UUID}
          AND day BETWEEN {from:Date} AND {to:Date}
        GROUP BY hour`,
      { merchantId: input.merchantId, from: input.from, to: input.to },
    );

    // Zero-filled so a quiet hour is a trough, not a gap the chart closes over.
    const byHour = new Map(rows.map((row) => [Number(row.hour), row]));
    const hours: HourlyPoint[] = Array.from({ length: HOURS_IN_DAY }, (_unused, hour) => {
      const row = byHour.get(hour);
      return {
        hour,
        revenue: toNumber(row?.revenue),
        transactions: toNumber(row?.transactions),
        units: toNumber(row?.units),
      };
    });

    return { from: input.from, to: input.to, hours, asOf: await this.asOf(SOURCE_VIEW.hourly) };
  }

  // US-5.5 — platform-wide, deliberately not merchant-scoped.
  async platformTotals(input: DateRangeInput): Promise<PlatformTotals> {
    const rows = await this.clickhouse.query<{
      dayLabel: string;
      merchants: string;
      revenue: string;
      transactions: string;
      units: string;
    }>(
      `SELECT toString(day) AS dayLabel, merchants, revenue, transactions, units
         FROM platform_daily
        WHERE day BETWEEN {from:Date} AND {to:Date}
        ORDER BY day`,
      { from: input.from, to: input.to },
    );

    const days = rows.map((row) => ({
      day: row.dayLabel,
      merchants: toNumber(row.merchants),
      revenue: toNumber(row.revenue),
      transactions: toNumber(row.transactions),
      units: toNumber(row.units),
    }));

    // Distinct counts cannot be summed across days; recompute for the range.
    const [distinct] = await this.clickhouse.query<{ merchants: string }>(
      `SELECT uniqExact(merchant_id) AS merchants
         FROM sales_daily
        WHERE day BETWEEN {from:Date} AND {to:Date}`,
      { from: input.from, to: input.to },
    );

    return {
      from: input.from,
      to: input.to,
      merchants: toNumber(distinct?.merchants),
      revenue: days.reduce((sum, point) => sum + point.revenue, 0),
      transactions: days.reduce((sum, point) => sum + point.transactions, 0),
      units: days.reduce((sum, point) => sum + point.units, 0),
      days,
      asOf: await this.asOf(SOURCE_VIEW.platform),
    };
  }

  // Null until the first refresh (UC-4 Alt A); last_success_time is Nullable.
  private async asOf(view: string): Promise<string | null> {
    const [row] = await this.clickhouse.query<{ asOf: string | null }>(
      `SELECT toString(last_success_time) AS asOf
         FROM system.view_refreshes
        WHERE database = currentDatabase() AND view = {view:String}`,
      { view },
    );
    return row?.asOf ?? null;
  }

  // Local day, matching how checkout books transaction dates.
  private today(): string {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: REPORT_TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  }
}
