import { Body, Controller, ForbiddenException, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { AuthUser, Sale } from '@jagoan-pos/contracts';
import { TransactionsClient } from '../../clients/transactions.client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CheckoutDto } from './dto/checkout.dto';

@ApiTags('Transactions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('CASHIER', 'OWNER')
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactions: TransactionsClient) {}

  @Post('checkout')
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
}

function requireMerchant(user: AuthUser): { merchantId: string; merchantName: string } {
  if (!user.merchantId || !user.merchantName) {
    throw new ForbiddenException('Caller must belong to a merchant');
  }
  return { merchantId: user.merchantId, merchantName: user.merchantName };
}
