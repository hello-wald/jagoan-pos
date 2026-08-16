import { z } from 'zod';

// Reporting days are merchant-local.
export const REPORT_TIME_ZONE = 'Asia/Jakarta';

const isoDate = z.iso.date();

// Refine last, never in a base others extend: Zod rejects .omit()/.extend() on
// a refined schema, and that only throws at module load, not at compile time.
const dateRangeBase = z.object({ from: isoDate, to: isoDate });

const isOrderedRange = (range: { from: string; to: string }): boolean => range.from <= range.to;

const orderedRangeIssue = {
  message: '`from` must not be after `to`',
  path: ['from'],
};

const topProductsBase = dateRangeBase.extend({
  limit: z.coerce.number().int().min(1).max(50).default(10),
  direction: z.enum(['best', 'worst']).default('best'),
});

export const dateRangeSchema = dateRangeBase.refine(isOrderedRange, orderedRangeIssue);

export const merchantRangeSchema = dateRangeBase
  .extend({ merchantId: z.uuid() })
  .refine(isOrderedRange, orderedRangeIssue);

// Gateway-facing: the merchant comes from the JWT, not the query.
export const topProductsQuerySchema = topProductsBase.refine(isOrderedRange, orderedRangeIssue);

// Service-facing, once the gateway has attached the scope.
export const topProductsSchema = topProductsBase
  .extend({ merchantId: z.uuid() })
  .refine(isOrderedRange, orderedRangeIssue);

export const dashboardSchema = z.object({ merchantId: z.uuid() });

export type DateRangeInput = z.infer<typeof dateRangeSchema>;
export type MerchantRangeInput = z.infer<typeof merchantRangeSchema>;
export type TopProductsQueryInput = z.infer<typeof topProductsQuerySchema>;
export type TopProductsInput = z.infer<typeof topProductsSchema>;
export type DashboardInput = z.infer<typeof dashboardSchema>;

// BR-9: reporting lag must be visible. The real last rollup refresh, not the
// request time. Null before the first refresh (UC-4 Alt A).
export type AsOf = { asOf: string | null };

export type DashboardTotals = AsOf & {
  day: string;
  revenue: number;
  transactions: number;
  units: number;
  // revenue / transactions; 0 when there are none.
  averageBasket: number;
};

export type RevenuePoint = {
  day: string;
  revenue: number;
  transactions: number;
  units: number;
};

export type RevenueRange = AsOf & {
  from: string;
  to: string;
  totalRevenue: number;
  totalTransactions: number;
  averageBasket: number;
  days: RevenuePoint[];
};

export type ProductRanking = {
  productId: string;
  productName: string;
  sku: string;
  revenue: number;
  units: number;
  transactions: number;
};

export type TopProducts = AsOf & {
  from: string;
  to: string;
  direction: 'best' | 'worst';
  products: ProductRanking[];
};

export type HourlyPoint = {
  hour: number;
  revenue: number;
  transactions: number;
  units: number;
};

// All 24 hours, zero-filled.
export type HourlySales = AsOf & {
  from: string;
  to: string;
  hours: HourlyPoint[];
};

export type PlatformTotals = AsOf & {
  from: string;
  to: string;
  merchants: number;
  revenue: number;
  transactions: number;
  units: number;
  days: (RevenuePoint & { merchants: number })[];
};
