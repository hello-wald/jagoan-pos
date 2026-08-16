import { AppErrorCode, checkoutRequestSchema } from '@jagoan-pos/contracts';
import { RpcException } from '@nestjs/microservices';
import { Prisma } from '../generated/prisma/client';
import type { ProductsClient } from '../clients/products.client';
import type { TransactionsPrismaService } from '../prisma/prisma.service';
import { SalesService } from './sales.service';

const MERCHANT_ID = '2f1c4a5e-0b8d-4c3a-9f21-6b7d8e9a0c11';
const CASHIER_ID = '7c9e6679-7425-40de-944b-e07fc1f90ae7';
const NOODLE_ID = 'a1111111-1111-4111-8111-111111111111';
const EGG_ID = 'b2222222-2222-4222-8222-222222222222';

const noodle = {
  id: NOODLE_ID,
  name: 'Mie Jagoan Original',
  sku: 'MIE-ORI',
  category: 'Noodles',
  price: 15_000,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const egg = {
  id: EGG_ID,
  name: 'Telur Ceplok',
  sku: 'TOP-EGG',
  category: 'Toppings',
  price: 5_000,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const baseInput = {
  merchantId: MERCHANT_ID,
  merchantName: 'Mie Jagoan Dago',
  cashierId: CASHIER_ID,
  cashierName: 'Kasir Satu',
  idempotencyKey: 'terminal-1:0001',
  cashReceived: 50_000,
  items: [
    { productId: NOODLE_ID, quantity: 2 },
    { productId: EGG_ID, quantity: 1 },
  ],
};

/** Two noodles at 15k plus one egg at 5k. */
const EXPECTED_TOTAL = 35_000;

function saleRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'sale-1',
    merchantId: MERCHANT_ID,
    merchantNameSnapshot: 'Mie Jagoan Dago',
    cashierId: CASHIER_ID,
    cashierNameSnapshot: 'Kasir Satu',
    transactionNumber: 'INV/20260815/0001',
    idempotencyKey: baseInput.idempotencyKey,
    status: 'COMPLETED',
    totalQuantity: 3,
    totalAmount: BigInt(EXPECTED_TOTAL),
    cashReceived: BigInt(50_000),
    changeAmount: BigInt(15_000),
    createdAt: new Date('2026-08-15T04:00:00.000Z'),
    items: [
      {
        id: 'line-1',
        productId: NOODLE_ID,
        productNameSnapshot: noodle.name,
        skuSnapshot: noodle.sku,
        unitPrice: 15_000,
        quantity: 2,
        subtotal: BigInt(30_000),
      },
    ],
    ...overrides,
  };
}

function prismaKnownError(code: string, target?: string[]) {
  return new Prisma.PrismaClientKnownRequestError('conflict', {
    code,
    clientVersion: '7.9.1',
    meta: target ? { target } : undefined,
  });
}

async function expectSaleError(
  promise: Promise<unknown>,
  code: string,
  message: string,
): Promise<void> {
  await expect(promise).rejects.toBeInstanceOf(RpcException);
  await promise.catch((error: unknown) => {
    expect((error as RpcException).getError()).toEqual({ code, message });
  });
}

describe('SalesService', () => {
  const tx = {
    transactionCounter: { upsert: jest.fn() },
    inventory: { update: jest.fn() },
    sale: { create: jest.fn() },
    stockMovement: { createMany: jest.fn() },
    outboxEvent: { create: jest.fn() },
  };

  const prisma = {
    sale: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  };

  const products = { send: jest.fn() };

  let service: SalesService;

  beforeEach(() => {
    jest.clearAllMocks();

    prisma.sale.findUnique.mockResolvedValue(null);
    prisma.$transaction.mockImplementation((run: (t: typeof tx) => Promise<unknown>) => run(tx));
    products.send.mockResolvedValue([noodle, egg]);
    tx.transactionCounter.upsert.mockResolvedValue({ lastSeq: 1 });
    tx.inventory.update.mockResolvedValue({ stockQuantity: 8 });
    tx.sale.create.mockResolvedValue(saleRow());
    tx.stockMovement.createMany.mockResolvedValue({ count: 2 });
    tx.outboxEvent.create.mockResolvedValue({ id: 'outbox-1' });

    service = new SalesService(
      prisma as unknown as TransactionsPrismaService,
      products as unknown as ProductsClient,
    );
  });

  describe('request validation', () => {
    it('rejects a cart that lists the same product twice', () => {
      expect(() =>
        checkoutRequestSchema.parse({
          idempotencyKey: 'k',
          cashReceived: 1_000,
          items: [
            { productId: NOODLE_ID, quantity: 1 },
            { productId: NOODLE_ID, quantity: 2 },
          ],
        }),
      ).toThrow();
    });

    it.each([0, -1, 1.5])('rejects a line quantity of %s', (quantity) => {
      expect(() =>
        checkoutRequestSchema.parse({
          idempotencyKey: 'k',
          cashReceived: 1_000,
          items: [{ productId: NOODLE_ID, quantity }],
        }),
      ).toThrow();
    });

    it('rejects an empty cart', () => {
      expect(() =>
        checkoutRequestSchema.parse({ idempotencyKey: 'k', cashReceived: 0, items: [] }),
      ).toThrow();
    });
  });

  describe('pricing', () => {
    it('totals the sale from catalog prices and records the change due', async () => {
      await service.checkout(baseInput);

      expect(tx.sale.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            totalQuantity: 3,
            totalAmount: BigInt(EXPECTED_TOTAL),
            cashReceived: BigInt(50_000),
            changeAmount: BigInt(15_000),
          }),
        }),
      );
    });

    it('ignores any price the client tries to supply', async () => {
      await service.checkout({
        ...baseInput,
        items: [
          { productId: NOODLE_ID, quantity: 2, unitPrice: 1 },
          { productId: EGG_ID, quantity: 1, unitPrice: 1 },
        ],
      } as never);

      const { data } = tx.sale.create.mock.calls[0][0];
      expect(data.totalAmount).toBe(BigInt(EXPECTED_TOTAL));
      expect(data.items.create).toEqual([
        expect.objectContaining({ unitPrice: 15_000, subtotal: BigInt(30_000) }),
        expect.objectContaining({ unitPrice: 5_000, subtotal: BigInt(5_000) }),
      ]);
    });

    it('snapshots the product name and SKU onto each line', async () => {
      await service.checkout(baseInput);

      const { data } = tx.sale.create.mock.calls[0][0];
      expect(data.items.create).toEqual([
        expect.objectContaining({ productNameSnapshot: noodle.name, skuSnapshot: noodle.sku }),
        expect.objectContaining({ productNameSnapshot: egg.name, skuSnapshot: egg.sku }),
      ]);
    });

    it('resolves the whole cart in a single catalog round trip', async () => {
      await service.checkout(baseInput);

      expect(products.send).toHaveBeenCalledTimes(1);
      expect(products.send).toHaveBeenCalledWith('products.getManyByIds', {
        ids: [NOODLE_ID, EGG_ID],
      });
    });

    it('refuses when cash does not cover the total, before touching the database', async () => {
      await expectSaleError(
        service.checkout({ ...baseInput, cashReceived: 34_999 }),
        AppErrorCode.INSUFFICIENT_CASH,
        'Cash received (34999) does not cover the total (35000)',
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('catalog validation', () => {
    it('rejects a product the catalog does not know', async () => {
      products.send.mockResolvedValue([noodle]);

      await expectSaleError(
        service.checkout(baseInput),
        AppErrorCode.PRODUCT_NOT_FOUND,
        `Product ${EGG_ID} does not exist`,
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('rejects a deactivated product by name', async () => {
      products.send.mockResolvedValue([noodle, { ...egg, isActive: false }]);

      await expectSaleError(
        service.checkout(baseInput),
        AppErrorCode.PRODUCT_INACTIVE,
        'Telur Ceplok is no longer for sale',
      );
    });
  });

  describe('stock', () => {
    it('decrements each line with the quantity guard in the same statement', async () => {
      await service.checkout(baseInput);

      expect(tx.inventory.update).toHaveBeenCalledWith({
        where: {
          merchantId_productId: { merchantId: MERCHANT_ID, productId: NOODLE_ID },
          stockQuantity: { gte: 2 },
        },
        data: { stockQuantity: { decrement: 2 } },
      });
    });

    it('takes inventory locks in product-id order regardless of cart order', async () => {
      await service.checkout({
        ...baseInput,
        items: [
          { productId: EGG_ID, quantity: 1 },
          { productId: NOODLE_ID, quantity: 2 },
        ],
      });

      const lockedIds = tx.inventory.update.mock.calls.map(
        (call) => call[0].where.merchantId_productId.productId,
      );
      expect(lockedIds).toEqual([...lockedIds].sort((a, b) => a.localeCompare(b)));
    });

    it('rejects the whole sale and names the offending line when stock is short', async () => {
      tx.inventory.update
        .mockResolvedValueOnce({ stockQuantity: 8 })
        .mockRejectedValueOnce(prismaKnownError('P2025'));

      await expectSaleError(
        service.checkout(baseInput),
        AppErrorCode.INSUFFICIENT_STOCK,
        'Insufficient stock for Telur Ceplok',
      );
      expect(tx.sale.create).not.toHaveBeenCalled();
      expect(tx.outboxEvent.create).not.toHaveBeenCalled();
    });

    it('writes one SALE movement per line with a negative delta and the new balance', async () => {
      tx.inventory.update
        .mockResolvedValueOnce({ stockQuantity: 8 })
        .mockResolvedValueOnce({ stockQuantity: 3 });

      await service.checkout(baseInput);

      expect(tx.stockMovement.createMany).toHaveBeenCalledWith({
        data: [
          {
            merchantId: MERCHANT_ID,
            productId: NOODLE_ID,
            delta: -2,
            balanceAfter: 8,
            reason: 'SALE',
            actorId: CASHIER_ID,
            saleId: 'sale-1',
          },
          {
            merchantId: MERCHANT_ID,
            productId: EGG_ID,
            delta: -1,
            balanceAfter: 3,
            reason: 'SALE',
            actorId: CASHIER_ID,
            saleId: 'sale-1',
          },
        ],
      });
    });
  });

  describe('outbox', () => {
    it('writes exactly one SALE_COMPLETED event inside the same transaction', async () => {
      await service.checkout(baseInput);

      expect(tx.outboxEvent.create).toHaveBeenCalledTimes(1);
      expect(tx.outboxEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          saleId: 'sale-1',
          merchantId: MERCHANT_ID,
          eventType: 'SALE_COMPLETED',
        }),
      });
    });

    it('carries a JSON-safe, fully denormalized payload so the consumer never calls back', async () => {
      await service.checkout(baseInput);

      const { payload } = tx.outboxEvent.create.mock.calls[0][0].data;
      expect(payload).toMatchObject({
        transactionNumber: 'INV/20260815/0001',
        merchantName: 'Mie Jagoan Dago',
        cashierName: 'Kasir Satu',
        totalAmount: EXPECTED_TOTAL,
        changeAmount: 15_000,
        createdAt: '2026-08-15T04:00:00.000Z',
      });
      expect(payload.items[0]).toMatchObject({ productName: noodle.name, subtotal: 30_000 });
      // BigInt and Date both break JSON.stringify; nothing may survive as either.
      expect(() => JSON.stringify(payload)).not.toThrow();
    });

    it('performs stock, sale, movements and the event in one transaction call', async () => {
      await service.checkout(baseInput);

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });
  });

  describe('idempotency', () => {
    it('replays a known key without writing anything', async () => {
      prisma.sale.findUnique.mockResolvedValue(saleRow());

      const result = await service.checkout(baseInput);

      expect(result.transactionNumber).toBe('INV/20260815/0001');
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(products.send).not.toHaveBeenCalled();
      expect(tx.inventory.update).not.toHaveBeenCalled();
    });

    it('returns the winner when a concurrent request loses on the idempotency index', async () => {
      prisma.$transaction.mockRejectedValue(
        prismaKnownError('P2002', ['merchant_id', 'idempotency_key']),
      );
      prisma.sale.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(saleRow({ transactionNumber: 'INV/20260815/0007' }));

      const result = await service.checkout(baseInput);

      expect(result.transactionNumber).toBe('INV/20260815/0007');
    });

    it('reports a conflict when the collision is on the transaction number', async () => {
      prisma.$transaction.mockRejectedValue(
        prismaKnownError('P2002', ['merchant_id', 'transaction_number']),
      );

      await expectSaleError(
        service.checkout(baseInput),
        AppErrorCode.CHECKOUT_CONFLICT,
        'Checkout collided with a concurrent sale; please retry',
      );
    });

    it('does not swallow an unrelated database failure', async () => {
      prisma.$transaction.mockRejectedValue(new Error('connection lost'));

      await expect(service.checkout(baseInput)).rejects.toThrow('connection lost');
    });
  });

  describe('transaction numbering', () => {
    it('formats the number from the per-merchant daily sequence', async () => {
      tx.transactionCounter.upsert.mockResolvedValue({ lastSeq: 42 });

      await service.checkout(baseInput);

      const { data } = tx.sale.create.mock.calls[0][0];
      expect(data.transactionNumber).toMatch(/^INV\/\d{8}\/0042$/);
    });

    it('increments the counter for the merchant rather than reading it first', async () => {
      await service.checkout(baseInput);

      expect(tx.transactionCounter.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ merchantId: MERCHANT_ID, lastSeq: 1 }),
          update: { lastSeq: { increment: 1 } },
        }),
      );
    });
  });

  describe('response mapping', () => {
    it('flattens snapshots and converts BigInt columns to numbers', async () => {
      const result = await service.checkout(baseInput);

      expect(result).toMatchObject({
        merchantName: 'Mie Jagoan Dago',
        cashierName: 'Kasir Satu',
        totalAmount: EXPECTED_TOTAL,
        cashReceived: 50_000,
        changeAmount: 15_000,
        status: 'COMPLETED',
      });
      expect(result.items[0]).toEqual({
        id: 'line-1',
        productId: NOODLE_ID,
        productName: noodle.name,
        sku: noodle.sku,
        unitPrice: 15_000,
        quantity: 2,
        subtotal: 30_000,
      });
    });
  });
});
