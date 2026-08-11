import { Controller } from '@nestjs/common';
import { StaffService } from './staff.service';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CreateCashierDto, SetCashierActiveDto } from './dto/staff.dto';

@Controller()
export class StaffController {
    constructor(private readonly staffService:StaffService){ }

    @MessagePattern('staff.getCashiers')
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
