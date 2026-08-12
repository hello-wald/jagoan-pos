import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { Role } from 'generated/prisma/enums';
import { Prisma } from 'generated/prisma/client';
import { RpcException } from '@nestjs/microservices';
import { AuthErrorCode } from '@app-k/shared';
import * as argon2 from 'argon2';

jest.mock('argon2', () => ({
  hash: jest.fn(),
  verify: jest.fn(),
}));

type MockTx = {
  merchant: {
    create: jest.Mock;
  };
  user: {
    create: jest.Mock;
  };
};

type MockPrismaService = {
  $transaction: jest.Mock;
  user: {
    findUnique: jest.Mock;
  };
};

type MockJwtService = {
  signAsync: jest.Mock;
};

describe('AuthService', () => {
  let service: AuthService;
  let prismaService: MockPrismaService;
  let jwtService: MockJwtService;

  const mockTx: MockTx = {
    merchant: {
      create: jest.fn(),
    },
    user: {
      create: jest.fn(),
    },
  };

  const mockPrismaService: MockPrismaService = {
    $transaction: jest.fn(),
    user: {
      findUnique: jest.fn(),
    },
  };

  const mockJwtService: MockJwtService = {
    signAsync: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    mockPrismaService.$transaction.mockImplementation(
      (callback: (tx: MockTx) => Promise<unknown>) => callback(mockTx),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prismaService = module.get<MockPrismaService>(PrismaService);
    jwtService = module.get<MockJwtService>(JwtService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('registerOwner', () => {
    const dto = {
      fullName: 'John Owner',
      email: '  John.Owner@EXAMPLE.com  ',
      password: 'SecurePassword123!',
      merchantName: 'John Store',
    };
    const hashedPassword = 'argon2_hashed_password';
    const merchantId = 'merchant-uuid-123';

    it('should normalize email, hash password, and create merchant and owner user in transaction', async () => {
      (argon2.hash as jest.Mock).mockResolvedValue(hashedPassword);

      const createdMerchant = {
        id: merchantId,
        name: dto.merchantName,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const createdUser = {
        id: 'user-uuid-123',
        merchantId,
        fullName: dto.fullName,
        email: 'john.owner@example.com',
        role: Role.OWNER,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockTx.merchant.create.mockResolvedValue(createdMerchant);
      mockTx.user.create.mockResolvedValue(createdUser);

      const result = await service.registerOwner(dto);

      expect(argon2.hash).toHaveBeenCalledWith(dto.password);
      expect(mockPrismaService.$transaction).toHaveBeenCalledTimes(1);
      expect(mockTx.merchant.create).toHaveBeenCalledWith({
        data: {
          name: dto.merchantName,
        },
      });
      expect(mockTx.user.create).toHaveBeenCalledWith({
        data: {
          fullName: dto.fullName,
          email: 'john.owner@example.com',
          passwordHash: hashedPassword,
          role: Role.OWNER,
          merchantId,
        },
        select: expect.any(Object),
      });
      expect(result).toEqual(createdUser);
    });

    it('should throw RpcException with EMAIL_ALREADY_EXISTS when tx.user.create throws P2002 error', async () => {
      (argon2.hash as jest.Mock).mockResolvedValue(hashedPassword);

      const createdMerchant = {
        id: merchantId,
        name: dto.merchantName,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockTx.merchant.create.mockResolvedValue(createdMerchant);

      const prismaP2002Error = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed on the fields: (`email`)',
        {
          code: 'P2002',
          clientVersion: '7.9.1',
        },
      );
      mockTx.user.create.mockRejectedValue(prismaP2002Error);

      await expect(service.registerOwner(dto)).rejects.toThrow(RpcException);

      try {
        await service.registerOwner(dto);
      } catch (error: unknown) {
        expect(error).toBeInstanceOf(RpcException);
        const rpcError = error as RpcException;
        expect(rpcError.getError()).toEqual({
          code: AuthErrorCode.EMAIL_ALREADY_EXISTS,
          message: 'Email already registered',
        });
      }
    });

    it('should rethrow unexpected database errors from transaction', async () => {
      (argon2.hash as jest.Mock).mockResolvedValue(hashedPassword);

      const unexpectedError = new Error('Database connection lost');
      mockTx.merchant.create.mockRejectedValue(unexpectedError);

      await expect(service.registerOwner(dto)).rejects.toThrow(
        'Database connection lost',
      );
    });
  });

  describe('login', () => {
    const dto = {
      email: '  Owner.Login@EXAMPLE.com  ',
      password: 'CorrectPassword123!',
    };
    const normalizedEmail = 'owner.login@example.com';
    const mockUser = {
      id: 'user-123',
      merchantId: 'merchant-123',
      fullName: 'Owner Login',
      email: normalizedEmail,
      passwordHash: 'argon2_hashed_password',
      role: Role.OWNER,
      isActive: true,
    };
    const mockToken = 'mock_jwt_access_token';

    it('should normalize email, verify password, generate token, and return response on happy path', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      (argon2.verify as jest.Mock).mockResolvedValue(true);
      mockJwtService.signAsync.mockResolvedValue(mockToken);

      const result = await service.login(dto);

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: normalizedEmail },
      });
      expect(argon2.verify).toHaveBeenCalledWith(
        mockUser.passwordHash,
        dto.password,
      );
      expect(mockJwtService.signAsync).toHaveBeenCalledWith({
        sub: mockUser.id,
        role: mockUser.role,
        merchantId: mockUser.merchantId,
      });
      expect(result).toEqual({
        accessToken: mockToken,
        user: {
          id: mockUser.id,
          merchantId: mockUser.merchantId,
          fullName: mockUser.fullName,
          email: mockUser.email,
          role: mockUser.role,
          isActive: mockUser.isActive,
        },
      });
    });

    it('should throw RpcException with INVALID_CREDENTIALS when user is not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.login(dto)).rejects.toThrow(RpcException);

      try {
        await service.login(dto);
      } catch (error: unknown) {
        expect(error).toBeInstanceOf(RpcException);
        const rpcError = error as RpcException;
        expect(rpcError.getError()).toEqual({
          code: AuthErrorCode.INVALID_CREDENTIALS,
          message: 'Invalid email or password',
        });
      }

      expect(argon2.verify).not.toHaveBeenCalled();
      expect(mockJwtService.signAsync).not.toHaveBeenCalled();
    });

    it('should throw RpcException with INVALID_CREDENTIALS when password is invalid', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      (argon2.verify as jest.Mock).mockResolvedValue(false);

      await expect(service.login(dto)).rejects.toThrow(RpcException);

      try {
        await service.login(dto);
      } catch (error: unknown) {
        expect(error).toBeInstanceOf(RpcException);
        const rpcError = error as RpcException;
        expect(rpcError.getError()).toEqual({
          code: AuthErrorCode.INVALID_CREDENTIALS,
          message: 'Invalid email or password',
        });
      }

      expect(mockJwtService.signAsync).not.toHaveBeenCalled();
    });

    it('should throw RpcException with USER_INACTIVE when user account is inactive', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        isActive: false,
      });
      (argon2.verify as jest.Mock).mockResolvedValue(true);

      await expect(service.login(dto)).rejects.toThrow(RpcException);

      try {
        await service.login(dto);
      } catch (error: unknown) {
        expect(error).toBeInstanceOf(RpcException);
        const rpcError = error as RpcException;
        expect(rpcError.getError()).toEqual({
          code: AuthErrorCode.USER_INACTIVE,
          message: 'User is inactive',
        });
      }

      expect(mockJwtService.signAsync).not.toHaveBeenCalled();
    });
  });

  describe('getUserById', () => {
    const userId = 'user-123';
    const mockUser = {
      id: userId,
      merchantId: 'merchant-123',
      fullName: 'Owner User',
      email: 'owner@example.com',
      role: Role.OWNER,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should return user data when user exists and is active', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getUserById(userId);

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
        select: expect.any(Object),
      });
      expect(result).toEqual(mockUser);
    });

    it('should throw RpcException with USER_NOT_FOUND when user is not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.getUserById(userId)).rejects.toThrow(RpcException);

      try {
        await service.getUserById(userId);
      } catch (error: unknown) {
        expect(error).toBeInstanceOf(RpcException);
        const rpcError = error as RpcException;
        expect(rpcError.getError()).toEqual({
          code: AuthErrorCode.USER_NOT_FOUND,
          message: 'User not found',
        });
      }
    });

    it('should throw RpcException with USER_INACTIVE when user is inactive', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        isActive: false,
      });

      await expect(service.getUserById(userId)).rejects.toThrow(RpcException);

      try {
        await service.getUserById(userId);
      } catch (error: unknown) {
        expect(error).toBeInstanceOf(RpcException);
        const rpcError = error as RpcException;
        expect(rpcError.getError()).toEqual({
          code: AuthErrorCode.USER_INACTIVE,
          message: 'User is inactive',
        });
      }
    });
  });
});
