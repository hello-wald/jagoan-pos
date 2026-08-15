import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RpcException } from '@nestjs/microservices';
import * as argon2 from 'argon2';
import { AppErrorCode } from '@jagoan-pos/contracts';
import type { JwtPayload, LoginResult, UserSummary } from '@jagoan-pos/contracts';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '../generated/prisma/enums';
import { Prisma } from '../generated/prisma/client';
import { toUserSummary, userSelect } from '../common/user.mapper';
import { LoginDto, RegisterOwnerDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async registerOwner(dto: RegisterOwnerDto): Promise<UserSummary> {
    const passwordHash = await argon2.hash(dto.password);

    try {
      const owner = await this.prisma.$transaction(async (tx) => {
        const merchant = await tx.merchant.create({ data: { name: dto.merchantName } });

        return tx.user.create({
          data: {
            fullName: dto.fullName,
            email: dto.email,
            passwordHash,
            role: Role.OWNER,
            merchantId: merchant.id,
          },
          select: userSelect,
        });
      });

      return toUserSummary(owner);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new RpcException({
          code: AppErrorCode.EMAIL_ALREADY_EXISTS,
          message: 'Email already registered',
        });
      }
      throw error;
    }
  }

  async login(dto: LoginDto): Promise<LoginResult> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });

    // Same error for an unknown email and a wrong password, so login cannot enumerate accounts.
    if (!user || !(await argon2.verify(user.passwordHash, dto.password))) {
      throw new RpcException({
        code: AppErrorCode.INVALID_CREDENTIALS,
        message: 'Invalid email or password',
      });
    }

    if (!user.isActive) {
      throw new RpcException({ code: AppErrorCode.USER_INACTIVE, message: 'User is inactive' });
    }

    const payload: JwtPayload = {
      sub: user.id,
      role: user.role,
      merchantId: user.merchantId,
    };

    return {
      accessToken: await this.jwt.signAsync(payload),
      user: {
        id: user.id,
        merchantId: user.merchantId,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
      },
    };
  }

  async getUserById(userId: string): Promise<UserSummary> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: userSelect });

    if (!user) {
      throw new RpcException({ code: AppErrorCode.USER_NOT_FOUND, message: 'User not found' });
    }
    if (!user.isActive) {
      throw new RpcException({ code: AppErrorCode.USER_INACTIVE, message: 'User is inactive' });
    }

    return toUserSummary(user);
  }
}
