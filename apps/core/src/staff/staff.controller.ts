import { Controller, UseInterceptors } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { Cacheable, RedisCacheInterceptor } from '@jagoan-pos/redis';
import { cacheKeys } from '@jagoan-pos/shared';
import type { CoreRequest, CoreResponse } from '@jagoan-pos/contracts';
import { StaffService } from './staff.service';
import { CreateCashierDto, SetCashierActiveDto } from './dto/staff.dto';

@Controller()
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @MessagePattern('staff.getCashiers')
  @UseInterceptors(RedisCacheInterceptor)
  @Cacheable({
    key: (ctx) => {
      const { merchantId } = ctx.switchToRpc().getData<CoreRequest<'staff.getCashiers'>>();
      return merchantId ? cacheKeys.cashiers(merchantId) : null;
    },
    ttlSeconds: 300,
  })
  getCashiers(
    @Payload('merchantId') merchantId: string,
  ): Promise<CoreResponse<'staff.getCashiers'>> {
    return this.staffService.getCashiers(merchantId);
  }

  @MessagePattern('staff.createCashier')
  createCashier(
    @Payload('merchantId') merchantId: string,
    @Payload('dto') dto: CreateCashierDto,
  ): Promise<CoreResponse<'staff.createCashier'>> {
    return this.staffService.createCashier(merchantId, dto);
  }

  @MessagePattern('staff.setCashierActive')
  setCashierActive(
    @Payload('merchantId') merchantId: string,
    @Payload('cashierId') cashierId: string,
    @Payload('dto') dto: SetCashierActiveDto,
  ): Promise<CoreResponse<'staff.setCashierActive'>> {
    return this.staffService.setCashierActive(merchantId, cashierId, dto);
  }
}
