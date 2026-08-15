import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import type { CashierListResult, UserSummary } from '@jagoan-pos/contracts';
import { CoreClient } from '../../clients/core.client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateCashierDto, SetCashierActiveDto } from './dto/staff.dto';

@Controller('staff')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('OWNER')
@ApiBearerAuth()
export class StaffController {
  constructor(private readonly core: CoreClient) {}

  @Get('cashiers')
  getCashiers(@CurrentUser('merchantId') merchantId: string | null): Promise<CashierListResult> {
    return this.core.send('staff.getCashiers', { merchantId: requireMerchant(merchantId) });
  }

  @Post('cashiers')
  createCashier(
    @CurrentUser('merchantId') merchantId: string | null,
    @Body() dto: CreateCashierDto,
  ): Promise<UserSummary> {
    return this.core.send('staff.createCashier', {
      merchantId: requireMerchant(merchantId),
      dto,
    });
  }

  @Patch('cashiers/:cashierId/status')
  setCashierActive(
    @CurrentUser('merchantId') merchantId: string | null,
    @Param('cashierId', ParseUUIDPipe) cashierId: string,
    @Body() dto: SetCashierActiveDto,
  ): Promise<UserSummary> {
    return this.core.send('staff.setCashierActive', {
      merchantId: requireMerchant(merchantId),
      cashierId,
      dto,
    });
  }
}

// merchantId always comes from the verified JWT, never from the request body,
// so one tenant can never address another tenant's staff.
function requireMerchant(merchantId: string | null): string {
  if (!merchantId) throw new ForbiddenException('Owner must belong to a merchant');
  return merchantId;
}
