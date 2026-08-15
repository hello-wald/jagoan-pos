import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCashierDto, SetCashierActiveDto } from './dto/staff.dto';
import { Role } from 'generated/prisma/enums';
import { RpcException } from '@nestjs/microservices';
import { AuthErrorCode, redisKeys, StaffErrorCode } from '@jagoan-pos/shared';
import * as argon2 from 'argon2';
import { Prisma } from 'generated/prisma/client';
import { RedisService } from '@jagoan-pos/redis';

@Injectable()
export class StaffService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly redis: RedisService
    ){}

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
        const data = await this.prisma.user.findMany({
            where: {
                role: Role.CASHIER,
                merchantId
            },
            select: this.cashierSelect,
            orderBy: {
                createdAt: 'desc'
            }
        })

        const total = data.length 
        let active = 0

        for (const cashier of data){
            if(cashier.isActive) active++
        }
        const summary = {
            total, 
            active,
            inactive: total - active,
        }

        return {
            data,
            summary
        }
    }

    // database unique index email race condition 
    async createCashier(merchantId: string, dto: CreateCashierDto){
        const email = dto.email.trim().toLowerCase()
        const passwordHash = await argon2.hash(dto.password)
        try {
            const newCashier = await this.prisma.user.create({
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

            await this.redis.del(redisKeys.core.cashiers(merchantId))

            return newCashier
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

        await this.redis.del(redisKeys.core.cashiers(merchantId))

        return this.prisma.user.findUnique({
            where: {
                id: cashierId
            },
            select: this.cashierSelect
        })
    }


}
