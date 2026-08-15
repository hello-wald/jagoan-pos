import { Test } from '@nestjs/testing';
import { RpcException } from '@nestjs/microservices';
import { AppErrorCode } from '@jagoan-pos/contracts';
import { cacheKeys } from '@jagoan-pos/shared';
import { RedisService } from '@jagoan-pos/redis';
import * as argon2 from 'argon2';
import { StaffService } from './staff.service';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '../generated/prisma/client';
import { Role } from '../generated/prisma/enums';

jest.mock('argon2', () => ({ hash: jest.fn() }));

const hash = argon2.hash as jest.Mock;

const prisma = {
  user: {
    findMany: jest.fn(),
    create: jest.fn(),
    updateMany: jest.fn(),
    findUniqueOrThrow: jest.fn(),
  },
};

const redis = { get: jest.fn(), set: jest.fn(), del: jest.fn() };

const merchantId = 'merchant-1';
const createdAt = new Date('2026-01-01T00:00:00.000Z');
const updatedAt = new Date('2026-01-02T00:00:00.000Z');

function cashierRow(overrides: Partial<{ id: string; isActive: boolean }> = {}) {
  return {
    id: 'cashier-1',
    merchantId,
    fullName: 'Kasir Satu',
    email: 'kasir1@example.com',
    role: Role.CASHIER,
    isActive: true,
    createdAt,
    updatedAt,
    ...overrides,
  };
}

function asSummary(row: ReturnType<typeof cashierRow>) {
  return { ...row, createdAt: createdAt.toISOString(), updatedAt: updatedAt.toISOString() };
}

async function expectRpcError(
  promise: Promise<unknown>,
  code: string,
  message: string,
): Promise<void> {
  await expect(promise).rejects.toBeInstanceOf(RpcException);
  await promise.catch((error: unknown) => {
    expect((error as RpcException).getError()).toEqual({ code, message });
  });
}

describe('StaffService', () => {
  let service: StaffService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        StaffService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redis },
      ],
    }).compile();

    service = moduleRef.get(StaffService);
  });

  describe('getCashiers', () => {
    it('scopes the query to the merchant and counts active vs inactive', async () => {
      prisma.user.findMany.mockResolvedValue([
        cashierRow(),
        cashierRow({ id: 'cashier-2', isActive: false }),
      ]);

      const result = await service.getCashiers(merchantId);

      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: { role: Role.CASHIER, merchantId },
        select: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
      expect(result.summary).toEqual({ total: 2, active: 1, inactive: 1 });
      expect(result.data[0]).toEqual(asSummary(cashierRow()));
    });

    it('returns a zeroed summary when the merchant has no cashiers', async () => {
      prisma.user.findMany.mockResolvedValue([]);

      await expect(service.getCashiers(merchantId)).resolves.toEqual({
        data: [],
        summary: { total: 0, active: 0, inactive: 0 },
      });
    });
  });

  describe('createCashier', () => {
    const dto = { fullName: 'Kasir Satu', email: 'kasir1@example.com', password: 'correct-horse' };

    it('hashes the password, creates the cashier and invalidates the list cache', async () => {
      hash.mockResolvedValue('argon2-hash');
      prisma.user.create.mockResolvedValue(cashierRow());

      const result = await service.createCashier(merchantId, dto);

      expect(hash).toHaveBeenCalledWith(dto.password);
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          merchantId,
          fullName: dto.fullName,
          email: dto.email,
          passwordHash: 'argon2-hash',
          role: Role.CASHIER,
          isActive: true,
        },
        select: expect.any(Object),
      });
      expect(redis.del).toHaveBeenCalledWith(cacheKeys.cashiers(merchantId));
      expect(result).toEqual(asSummary(cashierRow()));
    });

    it('maps P2002 to EMAIL_ALREADY_EXISTS and leaves the cache intact', async () => {
      hash.mockResolvedValue('argon2-hash');
      prisma.user.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('duplicate', {
          code: 'P2002',
          clientVersion: '7.9.1',
        }),
      );

      await expectRpcError(
        service.createCashier(merchantId, dto),
        AppErrorCode.EMAIL_ALREADY_EXISTS,
        'Email already registered',
      );
      expect(redis.del).not.toHaveBeenCalled();
    });

    it('rethrows unexpected errors and leaves the cache intact', async () => {
      hash.mockResolvedValue('argon2-hash');
      prisma.user.create.mockRejectedValue(new Error('connection lost'));

      await expect(service.createCashier(merchantId, dto)).rejects.toThrow('connection lost');
      expect(redis.del).not.toHaveBeenCalled();
    });
  });

  describe('setCashierActive', () => {
    const cashierId = 'cashier-1';

    it('updates within the merchant scope, invalidates the cache and returns the row', async () => {
      prisma.user.updateMany.mockResolvedValue({ count: 1 });
      prisma.user.findUniqueOrThrow.mockResolvedValue(cashierRow({ isActive: false }));

      const result = await service.setCashierActive(merchantId, cashierId, { isActive: false });

      expect(prisma.user.updateMany).toHaveBeenCalledWith({
        where: { id: cashierId, merchantId, role: Role.CASHIER },
        data: { isActive: false },
      });
      expect(redis.del).toHaveBeenCalledWith(cacheKeys.cashiers(merchantId));
      expect(result).toEqual(asSummary(cashierRow({ isActive: false })));
    });

    // count === 0 also covers a cashier that belongs to another merchant.
    it('reports CASHIER_NOT_FOUND and skips the cache when nothing matched', async () => {
      prisma.user.updateMany.mockResolvedValue({ count: 0 });

      await expectRpcError(
        service.setCashierActive(merchantId, cashierId, { isActive: false }),
        AppErrorCode.CASHIER_NOT_FOUND,
        'Cashier not found',
      );
      expect(redis.del).not.toHaveBeenCalled();
      expect(prisma.user.findUniqueOrThrow).not.toHaveBeenCalled();
    });
  });
});
