import type {
  DashboardInput,
  DashboardTotals,
  DateRangeInput,
  HourlySales,
  MerchantRangeInput,
  PlatformTotals,
  RevenueRange,
  TopProducts,
  TopProductsInput,
} from './report.schema';

export interface ReportsContract {
  'reports.dashboard': { request: DashboardInput; response: DashboardTotals };
  'reports.revenueRange': { request: MerchantRangeInput; response: RevenueRange };
  'reports.topProducts': { request: TopProductsInput; response: TopProducts };
  'reports.hourly': { request: MerchantRangeInput; response: HourlySales };
  'reports.platformTotals': { request: DateRangeInput; response: PlatformTotals };
}

export type ReportsPattern = keyof ReportsContract;
export type ReportsRequest<P extends ReportsPattern> = ReportsContract[P]['request'];
export type ReportsResponse<P extends ReportsPattern> = ReportsContract[P]['response'];
