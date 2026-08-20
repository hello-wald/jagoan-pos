import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type {
  AdjustStockResult,
  AuthUser,
  InventorySummary,
  PaginatedMerchantStock,
} from '@jagoan-pos/contracts';
import { TransactionsClient } from '../../clients/transactions.client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AdjustStockDto, GetMerchantStockQueryDto } from './dto/inventory.dto';

@ApiTags('Inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('OWNER')
@Controller('inventory')
export class InventoryController {
  constructor(private readonly transactions: TransactionsClient) {}

  @Get('summary')
  getSummary(@CurrentUser() user: AuthUser): Promise<InventorySummary> {
    const { merchantId } = requireMerchant(user);
    return this.transactions.send('inventory.getInventorySummary', { merchantId });
  }

  @Get()
  @Roles('OWNER', 'CASHIER')
  getMerchantStock(
    @CurrentUser() user: AuthUser,
    @Query() query: GetMerchantStockQueryDto,
  ): Promise<PaginatedMerchantStock> {
    const { merchantId } = requireMerchant(user);
    const scopedQuery = user.role === 'CASHIER' ? { ...query, activeOnly: true } : query;
    return this.transactions.send('inventory.getMerchantStock', { merchantId, query: scopedQuery });
  }

  @Patch(':productId')
  adjustStock(
    @CurrentUser() user: AuthUser,
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body() dto: AdjustStockDto,
  ): Promise<AdjustStockResult> {
    const { merchantId } = requireMerchant(user);
    return this.transactions.send('inventory.adjustStock', {
      merchantId,
      userId: user.id,
      productId,
      dto,
    });
  }
}

function requireMerchant(user: AuthUser): { merchantId: string } {
  if (!user.merchantId) {
    throw new ForbiddenException('Caller must belong to a merchant');
  }
  return { merchantId: user.merchantId };
}
