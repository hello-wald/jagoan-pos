import { Test, TestingModule } from '@nestjs/testing';
import { StaffService } from './staff.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { Role } from 'generated/prisma/enums';
import { Prisma } from 'generated/prisma/client';
import { RpcException } from '@nestjs/microservices';
import { AuthErrorCode, StaffErrorCode } from '@app-k/shared';
import * as argon2 from 'argon2';

jest.mock('argon2', () => ({
  hash: jest.fn(),
}));

type MockPrismaService = {
  user: {
    findMany: jest.Mock;
    create: jest.Mock;
    updateMany: jest.Mock;
    findUnique: jest.Mock;
  };
};

describe('StaffService', () => {
  let service: StaffService;
  let prismaService: MockPrismaService;

  const mockPrismaService: MockPrismaService = {
    user: {
      findMany: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StaffService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<StaffService>(StaffService);
    prismaService = module.get<MockPrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getCashiers', () => {
    const merchantId = 'merchant-123';

    it('should return list of cashiers for given merchantId', async () => {
      const mockCashiers = [
        {
          id: 'cashier-1',
          merchantId,
          fullName: 'John Cashier',
          email: 'john@example.com',
          role: Role.CASHIER,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrismaService.user.findMany.mockResolvedValue(mockCashiers);

      const result = await service.getCashiers(merchantId);

      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith({
        where: {
          role: Role.CASHIER,
          merchantId,
        },
        select: expect.any(Object),
        orderBy: {
          createdAt: 'desc',
        },
      });
      expect(result).toEqual(mockCashiers);
    });

    it('should return an empty array if merchant has no cashiers', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([]);

      const result = await service.getCashiers(merchantId);

      expect(result).toEqual([]);
      expect(mockPrismaService.user.findMany).toHaveBeenCalledTimes(1);
    });
  });

  describe('createCashier', () => {
    const merchantId = 'merchant-123';
    const dto = {
      fullName: 'Jane Doe',
      email: '  Jane.Doe@EXAMPLE.com  ',
      password: 'StrongPassword123!',
    };
    const hashedPassword = 'argon2_hashed_password';

    it('should normalize email, hash password, and create cashier successfully', async () => {
      (argon2.hash as jest.Mock).mockResolvedValue(hashedPassword);

      const createdCashier = {
        id: 'cashier-new',
        merchantId,
        fullName: dto.fullName,
        email: 'jane.doe@example.com',
        role: Role.CASHIER,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.create.mockResolvedValue(createdCashier);

      const result = await service.createCashier(merchantId, dto);

      expect(argon2.hash).toHaveBeenCalledWith(dto.password);
      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: {
          merchantId,
          fullName: dto.fullName,
          email: 'jane.doe@example.com',
          passwordHash: hashedPassword,
          role: Role.CASHIER,
          isActive: true,
        },
        select: expect.any(Object),
      });
      expect(result).toEqual(createdCashier);
    });

    it('should throw RpcException with EMAIL_ALREADY_EXISTS when Prisma throws P2002 error', async () => {
      (argon2.hash as jest.Mock).mockResolvedValue(hashedPassword);

      const prismaP2002Error = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed on the fields: (`email`)',
        {
          code: 'P2002',
          clientVersion: '7.9.1',
        },
      );

      mockPrismaService.user.create.mockRejectedValue(prismaP2002Error);

      await expect(service.createCashier(merchantId, dto)).rejects.toThrow(
        RpcException,
      );

      try {
        await service.createCashier(merchantId, dto);
      } catch (error: unknown) {
        expect(error).toBeInstanceOf(RpcException);
        const rpcError = error as RpcException;
        expect(rpcError.getError()).toEqual({
          code: AuthErrorCode.EMAIL_ALREADY_EXISTS,
          message: 'Email already registered',
        });
      }
    });

    it('should rethrow unexpected errors directly', async () => {
      (argon2.hash as jest.Mock).mockResolvedValue(hashedPassword);

      const unexpectedError = new Error('Database connection failed');
      mockPrismaService.user.create.mockRejectedValue(unexpectedError);

      await expect(service.createCashier(merchantId, dto)).rejects.toThrow(
        'Database connection failed',
      );
    });
  });

  describe('setCashierActive', () => {
    const merchantId = 'merchant-123';
    const cashierId = 'cashier-456';
    const dto = { isActive: false };

    it('should update status and return updated cashier data', async () => {
      mockPrismaService.user.updateMany.mockResolvedValue({ count: 1 });

      const updatedCashier = {
        id: cashierId,
        merchantId,
        fullName: 'John Cashier',
        email: 'john@example.com',
        role: Role.CASHIER,
        isActive: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.findUnique.mockResolvedValue(updatedCashier);

      const result = await service.setCashierActive(merchantId, cashierId, dto);

      expect(mockPrismaService.user.updateMany).toHaveBeenCalledWith({
        where: {
          id: cashierId,
          merchantId,
          role: Role.CASHIER,
        },
        data: {
          isActive: false,
        },
      });
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: cashierId },
        select: expect.any(Object),
      });
      expect(result).toEqual(updatedCashier);
    });

    it('should throw RpcException with CASHIER_NOT_FOUND when updateMany count is 0', async () => {
      mockPrismaService.user.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.setCashierActive(merchantId, cashierId, dto),
      ).rejects.toThrow(RpcException);

      try {
        await service.setCashierActive(merchantId, cashierId, dto);
      } catch (error: unknown) {
        expect(error).toBeInstanceOf(RpcException);
        const rpcError = error as RpcException;
        expect(rpcError.getError()).toEqual({
          code: StaffErrorCode.CASHIER_NOT_FOUND,
          message: 'Cashier not found',
        });
      }

      expect(mockPrismaService.user.findUnique).not.toHaveBeenCalled();
    });
  });
});
