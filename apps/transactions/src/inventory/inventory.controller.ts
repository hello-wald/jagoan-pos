import { Controller } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { TransactionsRequest, TransactionsResponse } from '@jagoan-pos/contracts';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @MessagePattern('inventory.getMerchantStock')
  getMerchantStock(
    @Payload() data: TransactionsRequest<'inventory.getMerchantStock'>,
  ): Promise<TransactionsResponse<'inventory.getMerchantStock'>> {
    return this.inventoryService.getMerchantStock(data.merchantId, data.query);
  }

  @MessagePattern('inventory.adjustStock')
  adjustStock(
    @Payload() data: TransactionsRequest<'inventory.adjustStock'>,
  ): Promise<TransactionsResponse<'inventory.adjustStock'>> {
    return this.inventoryService.adjustStock(
      data.merchantId,
      data.userId,
      data.productId,
      data.dto,
    );
  }

  @MessagePattern('inventory.getInventorySummary')
  getInventorySummary(
    @Payload() data: TransactionsRequest<'inventory.getInventorySummary'>,
  ): Promise<TransactionsResponse<'inventory.getInventorySummary'>> {
    return this.inventoryService.getInventorySummary(data.merchantId);
  }
}
