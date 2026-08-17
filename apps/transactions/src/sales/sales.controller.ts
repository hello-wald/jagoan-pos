import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import type { TransactionsRequest, TransactionsResponse } from '@jagoan-pos/contracts';
import { CheckoutDto } from './dto/checkout.dto';
import { SalesService } from './sales.service';

@Controller()
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @MessagePattern('sales.checkout')
  checkout(@Payload() dto: CheckoutDto): Promise<TransactionsResponse<'sales.checkout'>> {
    return this.salesService.checkout(dto);
  }

  @MessagePattern('sales.list')
  list(
    @Payload() payload: TransactionsRequest<'sales.list'>,
  ): Promise<TransactionsResponse<'sales.list'>> {
    return this.salesService.list(payload.merchantId, payload.query, payload.cashierIdFilter);
  }

  @MessagePattern('sales.getById')
  getById(
    @Payload() payload: TransactionsRequest<'sales.getById'>,
  ): Promise<TransactionsResponse<'sales.getById'>> {
    return this.salesService.getById(payload.merchantId, payload.id, payload.cashierIdFilter);
  }
}
