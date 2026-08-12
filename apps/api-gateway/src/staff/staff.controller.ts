import { Body, Controller, ForbiddenException, Get, Inject, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { CurrentUser } from 'src/auth/decorator/current-user.decorator';
import { Roles } from 'src/auth/decorator/role.decorator';
import { JwtGuard } from 'src/auth/guards/jwt.guard';
import { RolesGuard } from 'src/auth/guards/role.guard';
import { CreateCashierDto, SetCashierActiveDto  } from './dto/staff.dto';
import { ApiBearerAuth } from '@nestjs/swagger';

@Controller('staff')
@ApiBearerAuth()
@UseGuards(JwtGuard, RolesGuard)
@Roles("OWNER")
export class StaffController {
    constructor(@Inject("CORE_SERVICE") private readonly staffService: ClientProxy ){}


    @Get('cashiers')
    getCashiers(@CurrentUser('merchantId') merchantId: string | null){
        if(!merchantId) throw new ForbiddenException('Owner must belong to a merchant')
        return this.staffService.send('staff.getCashiers', {
            merchantId
        })
    }

    @Post('cashiers')
    createCashier(@CurrentUser('merchantId') merchantId: string | null, @Body() dto: CreateCashierDto){
        if (!merchantId) throw new ForbiddenException('Owner must belong to a merchant')

        return this.staffService.send('staff.createCashier', {
            merchantId, 
            dto
        })
    }

    @Patch('cashiers/:cashierId/status')
    setCashierActive(@CurrentUser('merchantId') merchantId: string | null, @Param('cashierId', ParseUUIDPipe) cashierId:string, @Body() dto: SetCashierActiveDto){
        if (!merchantId) throw new ForbiddenException('Owner must belong to a merchant')

        return this.staffService.send('staff.setCashierActive', {
            merchantId, 
            cashierId, 
            dto
        } )
    }




}
