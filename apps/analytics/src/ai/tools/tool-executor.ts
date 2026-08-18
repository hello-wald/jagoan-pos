import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RpcException } from '@nestjs/microservices';
import type { z } from 'zod';
import {
  AppErrorCode,
  type DashboardTotals,
  type HourlySales,
  type RevenueRange,
  type TopProducts,
} from '@jagoan-pos/contracts';
import type { AnalyticsEnv } from '../../config/env.schema';
import { ReportsClient } from '../../clients/reports.client';
import { rangeArgsSchema, topProductsArgsSchema } from '../ai.schema';
import type { AnalyticsToolName } from './tool-registry';

export type ToolContext = {
  merchantId: string;
};

export type ToolData = DashboardTotals | RevenueRange | TopProducts | HourlySales;

export type ToolExecutionResult = {
  data: ToolData;
  asOf: string | null;
};

@Injectable()
export class ToolExecutor {
  private readonly maxRangeDays: number;

  constructor(
    private readonly reports: ReportsClient,
    config: ConfigService<AnalyticsEnv, true>,
  ) {
    this.maxRangeDays = config.get('AI_MAX_RANGE_DAYS', { infer: true });
  }

  async execute(
    name: string,
    rawArgs: unknown,
    context: ToolContext,
  ): Promise<ToolExecutionResult> {
    switch (name as AnalyticsToolName) {
      case 'getDashboardSummary': {
        const result = await this.reports.send('reports.dashboard', {
          merchantId: context.merchantId,
        });
        return { data: result, asOf: result.asOf };
      }

      case 'getRevenueRange': {
        const parsed = this.parseArgs(rangeArgsSchema, rawArgs);
        this.validateDateRange(parsed.from, parsed.to);
        const result = await this.reports.send('reports.revenueRange', {
          merchantId: context.merchantId,
          from: parsed.from,
          to: parsed.to,
        });
        return { data: result, asOf: result.asOf };
      }

      case 'getTopProducts': {
        const parsed = this.parseArgs(topProductsArgsSchema, rawArgs);
        this.validateDateRange(parsed.from, parsed.to);
        const result = await this.reports.send('reports.topProducts', {
          merchantId: context.merchantId,
          from: parsed.from,
          to: parsed.to,
          direction: parsed.direction,
          limit: parsed.limit,
        });
        return { data: result, asOf: result.asOf };
      }

      case 'getHourlySales': {
        const parsed = this.parseArgs(rangeArgsSchema, rawArgs);
        this.validateDateRange(parsed.from, parsed.to);
        const result = await this.reports.send('reports.hourly', {
          merchantId: context.merchantId,
          from: parsed.from,
          to: parsed.to,
        });
        return { data: result, asOf: result.asOf };
      }

      default:
        throw new RpcException({
          code: AppErrorCode.AI_TOOL_NOT_ALLOWED,
          message: `Tool '${name}' is not allowed or does not exist.`,
        });
    }
  }

  private parseArgs<T>(schema: z.ZodSchema<T>, rawArgs: unknown): T {
    const parsed = schema.safeParse(rawArgs);
    if (!parsed.success) {
      const issue = parsed.error.issues[0]?.message ?? 'Invalid tool arguments';
      throw new RpcException({
        code: AppErrorCode.AI_TOOL_ARGUMENTS_INVALID,
        message: issue,
      });
    }
    return parsed.data;
  }

  private validateDateRange(fromStr: string, toStr: string): void {
    const from = new Date(fromStr);
    const to = new Date(toStr);

    if (from > to) {
      throw new RpcException({
        code: AppErrorCode.AI_TOOL_ARGUMENTS_INVALID,
        message: `'from' date (${fromStr}) cannot be after 'to' date (${toStr}).`,
      });
    }

    const diffDays = Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    if (diffDays > this.maxRangeDays) {
      throw new RpcException({
        code: AppErrorCode.AI_TOOL_ARGUMENTS_INVALID,
        message: `Date range exceeds maximum allowed limit of ${this.maxRangeDays} days.`,
      });
    }
  }
}
