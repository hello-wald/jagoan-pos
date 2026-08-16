import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  dashboardSchema,
  dateRangeSchema,
  merchantRangeSchema,
  topProductsSchema,
  type DashboardTotals,
  type HourlySales,
  type PlatformTotals,
  type RevenueRange,
  type TopProducts,
} from '@jagoan-pos/contracts';
import { ReportsService } from './reports.service';

// Re-validated here rather than trusted from the gateway: the merchant scope
// decides whose figures come back, so it is parsed where it is used.
@Controller()
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @MessagePattern('reports.dashboard')
  dashboard(@Payload() payload: unknown): Promise<DashboardTotals> {
    return this.reports.dashboard(dashboardSchema.parse(payload));
  }

  @MessagePattern('reports.revenueRange')
  revenueRange(@Payload() payload: unknown): Promise<RevenueRange> {
    return this.reports.revenueRange(merchantRangeSchema.parse(payload));
  }

  @MessagePattern('reports.topProducts')
  topProducts(@Payload() payload: unknown): Promise<TopProducts> {
    return this.reports.topProducts(topProductsSchema.parse(payload));
  }

  @MessagePattern('reports.hourly')
  hourly(@Payload() payload: unknown): Promise<HourlySales> {
    return this.reports.hourly(merchantRangeSchema.parse(payload));
  }

  @MessagePattern('reports.platformTotals')
  platformTotals(@Payload() payload: unknown): Promise<PlatformTotals> {
    return this.reports.platformTotals(dateRangeSchema.parse(payload));
  }
}
