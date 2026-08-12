import { Controller, UseInterceptors } from '@nestjs/common';
import { StaffService } from './staff.service';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CreateCashierDto, SetCashierActiveDto } from './dto/staff.dto';
import { RedisCacheInterceptor, Cacheable } from '@app-k/redis';
import { redisKeys } from '@app-k/shared';

@Controller()
export class StaffController {
    constructor(private readonly staffService:StaffService){ }

    @MessagePattern('staff.getCashiers')
    @UseInterceptors(RedisCacheInterceptor)
    @Cacheable({
        key: (ctx) => {
            const data = ctx.switchToRpc().getData<{merchantId: string}>()
            const merchantId = typeof data === 'string' ? data: data?.merchantId
            return merchantId ? redisKeys.core.cashiers(merchantId): null
        },
        ttlSeconds: 300
    })
    getCashiers(@Payload('merchantId') merchantId: string) {
        return this.staffService.getCashiers(merchantId);
    }

    @MessagePattern('staff.createCashier')
    createCashier(
        @Payload('merchantId') merchantId: string,
        @Payload('dto') dto: CreateCashierDto,
    ) {
        return this.staffService.createCashier(merchantId, dto);
    }
    @MessagePattern('staff.setCashierActive')
    setCashierActive(
        @Payload('merchantId') merchantId: string,
        @Payload('cashierId') cashierId: string,
        @Payload('dto') dto: SetCashierActiveDto,
        
    ){
        return this.staffService.setCashierActive(merchantId,cashierId,dto)
    }



}
