import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import type { TransactionsResponse } from '@jagoan-pos/contracts';
import { CheckoutDto } from './dto/checkout.dto';
import { SalesService } from './sales.service';

@Controller()
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @MessagePattern('sales.checkout')
  checkout(@Payload() dto: CheckoutDto): Promise<TransactionsResponse<'sales.checkout'>> {
    return this.salesService.checkout(dto);
  }
}
