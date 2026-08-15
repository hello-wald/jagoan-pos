import { AppErrorCode, createProductSchema } from '@jagoan-pos/contracts';
import { RpcException } from '@nestjs/microservices';
import { Prisma } from '../generated/prisma/client';
import type { ProductsPrismaService } from '../prisma/prisma.service';
import { ProductsService } from './products.service';

describe('ProductsService', () => {
  const product = {
    id: 'd08a0a1f-833d-4a63-a9de-f40c28000f31',
    name: 'Mineral Water',
    sku: 'WATER-600ML',
    category: 'Beverages',
    price: 5000,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const prisma = {
    product: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  let service: ProductsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ProductsService(prisma as unknown as ProductsPrismaService);
  });

  it.each([0, -1, 12.5])('rejects an invalid product price of %s', (price) => {
    expect(() =>
      createProductSchema.parse({ name: 'Water', sku: 'WATER-600ML', price }),
    ).toThrow();
  });

  it('normalizes SKU before persisting a product', async () => {
    prisma.product.create.mockResolvedValue(product);

    await service.create({
      name: 'Mineral Water',
      sku: ' water-600ml ',
      category: 'Beverages',
      price: 5000,
    });

    expect(prisma.product.create).toHaveBeenCalledWith({
      data: {
        name: 'Mineral Water',
        sku: 'WATER-600ML',
        category: 'Beverages',
        price: 5000,
      },
    });
  });

  it('returns a domain error when a SKU conflicts', async () => {
    prisma.product.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Duplicate SKU', {
        code: 'P2002',
        clientVersion: '7.9.1',
      }),
    );

    await expectProductError(
      service.create({ name: 'Water', sku: 'WATER-600ML', price: 5000 }),
      AppErrorCode.SKU_ALREADY_EXISTS,
      'SKU already exists',
    );
  });

  it('soft-deactivates a product without deleting it', async () => {
    prisma.product.update.mockResolvedValue({ ...product, isActive: false });

    await service.setActive(product.id, false);

    expect(prisma.product.update).toHaveBeenCalledWith({
      where: { id: product.id },
      data: { isActive: false },
    });
  });

  it('rejects permanent deletion and retains the product', async () => {
    prisma.product.findUnique.mockResolvedValue(product);

    await expectProductError(
      service.rejectPermanentDelete(product.id),
      AppErrorCode.PERMANENT_DELETE_FORBIDDEN,
      'Products cannot be permanently deleted; deactivate the product instead',
    );
    expect(prisma.product.update).not.toHaveBeenCalled();
  });
});

async function expectProductError(
  promise: Promise<unknown>,
  code: string,
  message: string,
): Promise<void> {
  await expect(promise).rejects.toBeInstanceOf(RpcException);
  try {
    await promise;
  } catch (error) {
    expect((error as RpcException).getError()).toEqual({ code, message });
  }
}
