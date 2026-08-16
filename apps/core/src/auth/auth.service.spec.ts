import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { RpcException } from '@nestjs/microservices';
import { AppErrorCode } from '@jagoan-pos/contracts';
import * as argon2 from 'argon2';
import { RedisService } from '@jagoan-pos/redis';
import { cacheKeys } from '@jagoan-pos/shared';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '../generated/prisma/client';
import { Role } from '../generated/prisma/enums';
import { LOGIN_RATE_LIMIT } from './auth.constants';

jest.mock('argon2', () => ({ hash: jest.fn(), verify: jest.fn() }));

const hash = argon2.hash as jest.Mock;
const verify = argon2.verify as jest.Mock;

const tx = {
  merchant: { create: jest.fn() },
  user: { create: jest.fn() },
};

const prisma = {
  $transaction: jest.fn(),
  user: { findUnique: jest.fn() },
};

const jwt = { signAsync: jest.fn() };

const redis = {
  get: jest.fn(),
  getRaw: jest.fn(),
  incrWithTtl: jest.fn(),
  del: jest.fn(),
};

const createdAt = new Date('2026-01-01T00:00:00.000Z');
const updatedAt = new Date('2026-01-02T00:00:00.000Z');

const merchantName = 'Warung Bu Tini';

const userRow = {
  id: 'user-1',
  merchantId: 'merchant-1',
  fullName: 'Bu Tini',
  email: 'butini@example.com',
  role: Role.OWNER,
  isActive: true,
  createdAt,
  updatedAt,
  merchant: { name: merchantName },
};

const userSummary = {
  id: userRow.id,
  merchantId: userRow.merchantId,
  merchantName,
  fullName: userRow.fullName,
  email: userRow.email,
  role: userRow.role,
  isActive: userRow.isActive,
  createdAt: createdAt.toISOString(),
  updatedAt: updatedAt.toISOString(),
};

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

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    jest.clearAllMocks();
    redis.get.mockResolvedValue(null);
    redis.incrWithTtl.mockResolvedValue(1);
    redis.del.mockResolvedValue(undefined);

    prisma.$transaction.mockImplementation((run: (t: typeof tx) => Promise<unknown>) => run(tx));

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwt },
        { provide: RedisService, useValue: redis },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
  });

  describe('registerOwner', () => {
    const dto = {
      merchantName: 'Warung Bu Tini',
      fullName: 'Bu Tini',
      email: 'butini@example.com',
      password: 'correct-horse',
    };

    it('creates the merchant and owner in one transaction and serializes dates', async () => {
      hash.mockResolvedValue('argon2-hash');
      tx.merchant.create.mockResolvedValue({ id: 'merchant-1' });
      tx.user.create.mockResolvedValue(userRow);

      const result = await service.registerOwner(dto);

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(tx.user.create).toHaveBeenCalledWith({
        data: {
          fullName: dto.fullName,
          email: dto.email,
          passwordHash: 'argon2-hash',
          role: Role.OWNER,
          merchantId: 'merchant-1',
        },
        select: expect.any(Object),
      });
      expect(result).toEqual(userSummary);
    });

    it('maps a P2002 unique violation to EMAIL_ALREADY_EXISTS', async () => {
      hash.mockResolvedValue('argon2-hash');
      tx.merchant.create.mockResolvedValue({ id: 'merchant-1' });
      tx.user.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('duplicate', {
          code: 'P2002',
          clientVersion: '7.9.1',
        }),
      );

      await expectRpcError(
        service.registerOwner(dto),
        AppErrorCode.EMAIL_ALREADY_EXISTS,
        'Email already registered',
      );
    });

    it('rethrows unexpected database errors', async () => {
      hash.mockResolvedValue('argon2-hash');
      tx.merchant.create.mockRejectedValue(new Error('connection lost'));

      await expect(service.registerOwner(dto)).rejects.toThrow('connection lost');
    });
  });

  describe('login', () => {
    const dto = { email: 'butini@example.com', password: 'correct-horse' };
    const withHash = { ...userRow, passwordHash: 'argon2-hash' };
    const rateLimitKey = cacheKeys.authLoginFailures(dto.email);

    it('returns a token and the lean user on success and resets failure counter', async () => {
      prisma.user.findUnique.mockResolvedValue(withHash);
      verify.mockResolvedValue(true);
      jwt.signAsync.mockResolvedValue('jwt-token');

      const result = await service.login(dto);

      expect(redis.del).toHaveBeenCalledWith(rateLimitKey);
      expect(jwt.signAsync).toHaveBeenCalledWith({
        sub: withHash.id,
        role: withHash.role,
        merchantId: withHash.merchantId,
      });
      expect(result).toEqual({
        accessToken: 'jwt-token',
        user: {
          id: withHash.id,
          merchantId: withHash.merchantId,
          merchantName,
          fullName: withHash.fullName,
          email: withHash.email,
          role: withHash.role,
          isActive: withHash.isActive,
        },
      });
    });

    // An unknown email and a wrong password must be indistinguishable to the caller.
    it('reports INVALID_CREDENTIALS and increments counter for an unknown email without signing a token', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expectRpcError(
        service.login(dto),
        AppErrorCode.INVALID_CREDENTIALS,
        'Invalid email or password',
      );
      expect(redis.incrWithTtl).toHaveBeenCalledWith(rateLimitKey, LOGIN_RATE_LIMIT.windowSeconds);
      expect(jwt.signAsync).not.toHaveBeenCalled();
    });

    it('reports INVALID_CREDENTIALS and increments counter for a wrong password', async () => {
      prisma.user.findUnique.mockResolvedValue(withHash);
      verify.mockResolvedValue(false);

      await expectRpcError(
        service.login(dto),
        AppErrorCode.INVALID_CREDENTIALS,
        'Invalid email or password',
      );
      expect(redis.incrWithTtl).toHaveBeenCalledWith(rateLimitKey, LOGIN_RATE_LIMIT.windowSeconds);
      expect(jwt.signAsync).not.toHaveBeenCalled();
    });

    it('refuses an inactive user without incrementing failure counter', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...withHash, isActive: false });
      verify.mockResolvedValue(true);

      await expectRpcError(service.login(dto), AppErrorCode.USER_INACTIVE, 'User is inactive');
      expect(redis.incrWithTtl).not.toHaveBeenCalled();
      expect(jwt.signAsync).not.toHaveBeenCalled();
    });

    it('blocks login immediately with AUTH_RATE_LIMITED when failed attempts reach limit', async () => {
      redis.get.mockResolvedValue(LOGIN_RATE_LIMIT.maxFailedAttempts);

      await expectRpcError(
        service.login(dto),
        AppErrorCode.AUTH_RATE_LIMITED,
        'Too many login attempts. Try again later.',
      );

      expect(prisma.user.findUnique).not.toHaveBeenCalled();
      expect(verify).not.toHaveBeenCalled();
    });
  });

  describe('getUserById', () => {
    it('returns the user summary with ISO dates', async () => {
      prisma.user.findUnique.mockResolvedValue(userRow);

      await expect(service.getUserById('user-1')).resolves.toEqual(userSummary);
    });

    // Checkout snapshots merchantName, so the admin case must be null rather
    // than undefined or a crash on the missing relation.
    it('reports a null merchantName for a user with no merchant', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...userRow,
        merchantId: null,
        merchant: null,
        role: Role.GLOBAL_ADMIN,
      });

      await expect(service.getUserById('user-1')).resolves.toEqual({
        ...userSummary,
        merchantId: null,
        merchantName: null,
        role: Role.GLOBAL_ADMIN,
      });
    });

    it('reports USER_NOT_FOUND when the user is missing', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expectRpcError(
        service.getUserById('user-1'),
        AppErrorCode.USER_NOT_FOUND,
        'User not found',
      );
    });

    it('reports USER_INACTIVE for a deactivated user', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...userRow, isActive: false });

      await expectRpcError(
        service.getUserById('user-1'),
        AppErrorCode.USER_INACTIVE,
        'User is inactive',
      );
    });
  });
});
