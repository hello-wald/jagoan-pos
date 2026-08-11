import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateCashierDto, SetCashierActiveDto } from './dto/staff.dto';
import { Role } from 'generated/prisma/enums';
import { RpcException } from '@nestjs/microservices';
import { AuthErrorCode, StaffErrorCode } from '@app-k/shared';
import * as argon2 from 'argon2';
import { Prisma } from 'generated/prisma/client';

@Injectable()
export class StaffService {
    constructor(private readonly prisma: PrismaService){}

    private readonly cashierSelect = {
        id: true,
        merchantId: true,
        fullName: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
    } as const;

    async getCashiers(merchantId:string){
        return this.prisma.user.findMany({
            where: {
                role: Role.CASHIER,
                merchantId, 
            },
            select: this.cashierSelect,
            orderBy: {
                createdAt: 'desc'
            }
        })
    }

    // database unique index email race condition 
    async createCashier(merchantId: string, dto: CreateCashierDto){
        const email = dto.email.trim().toLowerCase()
        const passwordHash = await argon2.hash(dto.password)
        try {
            return await this.prisma.user.create({
                data: {
                    merchantId,
                    fullName: dto.fullName,
                    email,
                    passwordHash, 
                    role: Role.CASHIER,
                    isActive: true
                },
                select: this.cashierSelect
            })
        } catch (error) {
            if(
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === 'P2002'
            ){
                throw new RpcException({
                    code: AuthErrorCode.EMAIL_ALREADY_EXISTS,
                    message: 'Email already registered'
                })
            }
            throw error
        }
    }

    async setCashierActive(merchantId:string, cashierId:string, dto: SetCashierActiveDto){
        const result =  await this.prisma.user.updateMany({
            where: {
                id: cashierId,
                merchantId,
                role: Role.CASHIER
            },
            data: {
                isActive: dto.isActive
            }
        })

        if(result.count === 0){
            throw new RpcException({
                code: StaffErrorCode.CASHIER_NOT_FOUND,
                message: 'Cashier not found',
            })
        }

        return this.prisma.user.findUnique({
            where: {
                id: cashierId
            },
            select: this.cashierSelect
        })

    }
}
