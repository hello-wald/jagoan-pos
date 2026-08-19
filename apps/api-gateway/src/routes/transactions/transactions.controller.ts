import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthUser, PaginatedSales, Sale } from '@jagoan-pos/contracts';
import { TransactionsClient } from '../../clients/transactions.client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CheckoutDto } from './dto/checkout.dto';
import { ListSalesQueryDto } from './dto/sales-query.dto';

@ApiTags('Transactions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('CASHIER', 'OWNER')
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactions: TransactionsClient) {}

  @Post('checkout')
  @Roles('CASHIER')
  @ApiOperation({ summary: 'Checkout sale transaction' })
  checkout(@CurrentUser() user: AuthUser, @Body() dto: CheckoutDto): Promise<Sale> {
    const { merchantId, merchantName } = requireMerchant(user);

    return this.transactions.send('sales.checkout', {
      ...dto,
      merchantId,
      merchantName,
      cashierId: user.id,
      cashierName: user.fullName,
    });
  }

  @Get()
  @ApiOperation({ summary: 'List sales transaction history with pagination and date filter' })
  listTransactions(
    @CurrentUser() user: AuthUser,
    @Query() query: ListSalesQueryDto,
  ): Promise<PaginatedSales> {
    const { merchantId } = requireMerchant(user);

    // Strict role scoping: Cashier is locked to their own cashierId; Owner sees all merchant transactions.
    const cashierIdFilter = user.role === 'CASHIER' ? user.id : undefined;
    const scopedQuery = applyRoleDateScoping(user, query);

    return this.transactions.send('sales.list', {
      merchantId,
      query: scopedQuery,
      cashierIdFilter,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get transaction receipt details by ID' })
  getTransactionById(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Sale> {
    const { merchantId } = requireMerchant(user);

    // Strict role scoping: Cashier can only view their own transactions; Owner can view all.
    const cashierIdFilter = user.role === 'CASHIER' ? user.id : undefined;

    return this.transactions.send('sales.getById', {
      merchantId,
      id,
      cashierIdFilter,
    });
  }
}

function applyRoleDateScoping(user: AuthUser, query: ListSalesQueryDto): ListSalesQueryDto {
  if (user.role !== 'CASHIER') {
    return query;
  }

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  let startDate = query.startDate;
  if (!startDate) {
    // Default to last 7 days for cashier
    startDate = sevenDaysAgo.toISOString().slice(0, 10);
  } else {
    // Enforce maximum history of 30 days for cashier
    const parsed = new Date(startDate);
    if (parsed < thirtyDaysAgo) {
      startDate = thirtyDaysAgo.toISOString().slice(0, 10);
    }
  }

  return {
    ...query,
    startDate,
  };
}

function requireMerchant(user: AuthUser): { merchantId: string; merchantName: string } {
  if (!user.merchantId || !user.merchantName) {
    throw new ForbiddenException('Caller must belong to a merchant');
  }
  return { merchantId: user.merchantId, merchantName: user.merchantName };
}
