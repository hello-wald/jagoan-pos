import { Controller, ForbiddenException, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type {
  AuthUser,
  DashboardTotals,
  HourlySales,
  PlatformTotals,
  RevenueRange,
  TopProducts,
} from '@jagoan-pos/contracts';
import { ReportsClient } from '../../clients/reports.client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { DateRangeDto, TopProductsQueryDto } from './dto/report.dto';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsClient) {}

  @Get('dashboard')
  @Roles('OWNER')
  dashboard(@CurrentUser() user: AuthUser): Promise<DashboardTotals> {
    return this.reports.send('reports.dashboard', { merchantId: requireMerchant(user) });
  }

  @Get('revenue')
  @Roles('OWNER')
  revenue(@CurrentUser() user: AuthUser, @Query() query: DateRangeDto): Promise<RevenueRange> {
    return this.reports.send('reports.revenueRange', {
      ...query,
      merchantId: requireMerchant(user),
    });
  }

  @Get('top-products')
  @Roles('OWNER')
  topProducts(
    @CurrentUser() user: AuthUser,
    @Query() query: TopProductsQueryDto,
  ): Promise<TopProducts> {
    return this.reports.send('reports.topProducts', {
      ...query,
      merchantId: requireMerchant(user),
    });
  }

  @Get('hourly')
  @Roles('OWNER')
  hourly(@CurrentUser() user: AuthUser, @Query() query: DateRangeDto): Promise<HourlySales> {
    return this.reports.send('reports.hourly', { ...query, merchantId: requireMerchant(user) });
  }

  @Get('platform')
  @Roles('GLOBAL_ADMIN')
  platform(@Query() query: DateRangeDto): Promise<PlatformTotals> {
    return this.reports.send('reports.platformTotals', query);
  }
}

function requireMerchant(user: AuthUser): string {
  if (!user.merchantId) {
    throw new ForbiddenException('Caller must belong to a merchant');
  }
  return user.merchantId;
}
