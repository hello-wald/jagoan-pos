import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import * as argon2 from 'argon2';
import { AppErrorCode } from '@jagoan-pos/contracts';
import type { CashierListResult, UserSummary } from '@jagoan-pos/contracts';
import { cacheKeys } from '@jagoan-pos/shared';
import { RedisService } from '@jagoan-pos/redis';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '../generated/prisma/enums';
import { Prisma } from '../generated/prisma/client';
import { toUserSummary, userSelect } from '../common/user.mapper';
import { CreateCashierDto, SetCashierActiveDto } from './dto/staff.dto';

@Injectable()
export class StaffService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async getCashiers(merchantId: string): Promise<CashierListResult> {
    const rows = await this.prisma.user.findMany({
      where: { role: Role.CASHIER, merchantId },
      select: userSelect,
      orderBy: { createdAt: 'desc' },
    });

    const data = rows.map(toUserSummary);
    const active = data.filter((cashier) => cashier.isActive).length;

    return {
      data,
      summary: { total: data.length, active, inactive: data.length - active },
    };
  }

  async createCashier(merchantId: string, dto: CreateCashierDto): Promise<UserSummary> {
    const passwordHash = await argon2.hash(dto.password);

    try {
      const cashier = await this.prisma.user.create({
        data: {
          merchantId,
          fullName: dto.fullName,
          email: dto.email,
          passwordHash,
          role: Role.CASHIER,
          isActive: true,
        },
        select: userSelect,
      });

      await this.redis.del(cacheKeys.cashiers(merchantId));

      return toUserSummary(cashier);
    } catch (error) {
      // The unique index on email is the real guard against a concurrent duplicate.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new RpcException({
          code: AppErrorCode.EMAIL_ALREADY_EXISTS,
          message: 'Email already registered',
        });
      }
      throw error;
    }
  }

  async setCashierActive(
    merchantId: string,
    cashierId: string,
    dto: SetCashierActiveDto,
  ): Promise<UserSummary> {
    // Scoped by merchantId so one tenant can never flip another tenant's cashier.
    const result = await this.prisma.user.updateMany({
      where: { id: cashierId, merchantId, role: Role.CASHIER },
      data: { isActive: dto.isActive },
    });

    if (result.count === 0) {
      throw new RpcException({
        code: AppErrorCode.CASHIER_NOT_FOUND,
        message: 'Cashier not found',
      });
    }

    await this.redis.del(cacheKeys.cashiers(merchantId));

    const cashier = await this.prisma.user.findUniqueOrThrow({
      where: { id: cashierId },
      select: userSelect,
    });

    return toUserSummary(cashier);
  }
}
