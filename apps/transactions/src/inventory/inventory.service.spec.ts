import {
  AppErrorCode,
  adjustStockSchema,
  getMerchantStockQuerySchema,
} from '@jagoan-pos/contracts';
import { RpcException } from '@nestjs/microservices';
import { Prisma } from '../generated/prisma/client';
import type { ProductsClient } from '../clients/products.client';
import type { TransactionsPrismaService } from '../prisma/prisma.service';
import { InventoryService } from './inventory.service';

const MERCHANT_ID = '11111111-1111-1111-1111-111111111111';
const USER_ID = '99999999-9999-9999-9999-999999999999';
const PRODUCT_1_ID = '22222222-2222-2222-2222-222222222222';
const PRODUCT_2_ID = '33333333-3333-3333-3333-333333333333';

const mockProduct1 = {
  id: PRODUCT_1_ID,
  name: 'Kopi Susu',
  sku: 'KOP-001',
  category: 'Beverages',
  price: 18_000,
  isActive: true,
  createdAt: new Date('2026-08-01T00:00:00.000Z'),
  updatedAt: new Date('2026-08-01T00:00:00.000Z'),
};

const mockProduct2 = {
  id: PRODUCT_2_ID,
  name: 'Roti Bakar',
  sku: 'ROT-001',
  category: 'Food',
  price: 15_000,
  isActive: true,
  createdAt: new Date('2026-08-01T00:00:00.000Z'),
  updatedAt: new Date('2026-08-01T00:00:00.000Z'),
};

describe('InventoryService', () => {
  let service: InventoryService;

  const tx = {
    $executeRaw: jest.fn(),
    $queryRaw: jest.fn(),
    inventory: {
      update: jest.fn(),
    },
    stockMovement: {
      create: jest.fn(),
      createMany: jest.fn(),
    },
  };

  const prisma = {
    inventory: {
      findMany: jest.fn(),
    },
    $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
  };

  const products = {
    send: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new InventoryService(
      prisma as unknown as TransactionsPrismaService,
      products as unknown as ProductsClient,
    );
  });

  // ==========================================
  // 1. GET INVENTORY SUMMARY TESTS
  // ==========================================
  describe('getInventorySummary', () => {
    it('should calculate KPI summary correctly including unconfigured products', async () => {
      products.send.mockResolvedValueOnce({
        data: [mockProduct1],
        meta: { total: 5, page: 1, pageSize: 1 },
      });

      prisma.inventory.findMany.mockResolvedValueOnce([
        { stockQuantity: 50 }, // Normal stock
        { stockQuantity: 5 }, // Low stock (<= 10)
        { stockQuantity: 0 }, // Out of stock
      ]);

      const summary = await service.getInventorySummary(MERCHANT_ID);

      expect(products.send).toHaveBeenCalledWith('products.list', {
        page: 1,
        pageSize: 1,
      });

      expect(summary).toEqual({
        totalProducts: 5,
        totalStockUnits: 55,
        lowStockCount: 1,
        outOfStockCount: 3, // 1 (0 stock) + 2 (unconfigured: 5 total - 3 rows)
      });
    });
  });

  // ==========================================
  // 2. GET MERCHANT STOCK TESTS
  // ==========================================
  describe('getMerchantStock', () => {
    it('should return paginated stock data with lazy fallback 0 and isActive flag', async () => {
      products.send.mockResolvedValueOnce({
        data: [mockProduct1, mockProduct2],
        meta: { total: 2, page: 1, pageSize: 10, totalPages: 1 },
      });

      prisma.inventory.findMany.mockResolvedValueOnce([
        {
          productId: PRODUCT_1_ID,
          stockQuantity: 45,
          updatedAt: new Date('2026-08-16T10:00:00.000Z'),
        },
      ]);

      const result = await service.getMerchantStock(MERCHANT_ID, { page: 1, limit: 10 });

      expect(products.send).toHaveBeenCalledWith('products.list', {
        page: 1,
        pageSize: 10,
        query: undefined,
        activeOnly: undefined,
      });

      expect(result.data).toHaveLength(2);
      expect(result.data[0]).toEqual({
        productId: PRODUCT_1_ID,
        name: 'Kopi Susu',
        sku: 'KOP-001',
        currentPrice: 18_000,
        stockQuantity: 45,
        isActive: true,
        updatedAt: '2026-08-16T10:00:00.000Z',
      });

      // Lazy fallback 0 for product 2
      expect(result.data[1]).toEqual({
        productId: PRODUCT_2_ID,
        name: 'Roti Bakar',
        sku: 'ROT-001',
        currentPrice: 15_000,
        stockQuantity: 0,
        isActive: true,
        updatedAt: '2026-08-01T00:00:00.000Z',
      });

      expect(result.meta).toEqual({
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });

    it('should pass search filter and activeOnly filter query to products service', async () => {
      products.send.mockResolvedValueOnce({
        data: [mockProduct1],
        meta: { total: 1, page: 1, pageSize: 10, totalPages: 1 },
      });
      prisma.inventory.findMany.mockResolvedValueOnce([]);

      await service.getMerchantStock(MERCHANT_ID, {
        page: 1,
        limit: 10,
        search: 'Kopi',
        activeOnly: true,
      });

      expect(products.send).toHaveBeenCalledWith('products.list', {
        page: 1,
        pageSize: 10,
        query: 'Kopi',
        activeOnly: true,
      });
    });
  });

  // ==========================================
  // 3. ADJUST STOCK TESTS
  // ==========================================
  describe('adjustStock', () => {
    it('should update stock and create StockMovement ledger when delta != 0', async () => {
      products.send.mockResolvedValueOnce(mockProduct1);

      tx.$executeRaw.mockResolvedValueOnce(1);
      tx.$queryRaw.mockResolvedValueOnce([{ stock_quantity: 20 }]);

      const updatedInventory = {
        id: 'inv-1',
        merchantId: MERCHANT_ID,
        productId: PRODUCT_1_ID,
        stockQuantity: 50,
        updatedAt: new Date('2026-08-16T12:00:00.000Z'),
      };
      tx.inventory.update.mockResolvedValueOnce(updatedInventory);

      const result = await service.adjustStock(MERCHANT_ID, USER_ID, PRODUCT_1_ID, {
        stockQuantity: 50,
      });

      expect(tx.$executeRaw).toHaveBeenCalled();
      expect(tx.$queryRaw).toHaveBeenCalled();
      expect(tx.stockMovement.create).toHaveBeenCalledWith({
        data: {
          merchantId: MERCHANT_ID,
          productId: PRODUCT_1_ID,
          delta: 30, // 50 - 20
          balanceAfter: 50,
          reason: 'ADJUSTMENT',
          actorId: USER_ID,
        },
      });

      expect(result).toEqual({
        id: 'inv-1',
        merchantId: MERCHANT_ID,
        productId: PRODUCT_1_ID,
        productName: 'Kopi Susu',
        sku: 'KOP-001',
        currentPrice: 18_000,
        stockQuantity: 50,
        updatedAt: '2026-08-16T12:00:00.000Z',
      });
    });

    it('should not create StockMovement if stockQuantity did not change (delta = 0)', async () => {
      products.send.mockResolvedValueOnce(mockProduct1);

      tx.$executeRaw.mockResolvedValueOnce(1);
      tx.$queryRaw.mockResolvedValueOnce([{ stock_quantity: 50 }]);

      tx.inventory.update.mockResolvedValueOnce({
        id: 'inv-1',
        merchantId: MERCHANT_ID,
        productId: PRODUCT_1_ID,
        stockQuantity: 50,
        updatedAt: new Date('2026-08-16T12:00:00.000Z'),
      });

      await service.adjustStock(MERCHANT_ID, USER_ID, PRODUCT_1_ID, { stockQuantity: 50 });

      expect(tx.stockMovement.create).not.toHaveBeenCalled();
    });

    it('should allow setting stockQuantity = 0 on inactive product for warehouse writeoff', async () => {
      products.send.mockResolvedValueOnce({ ...mockProduct1, isActive: false });

      tx.$executeRaw.mockResolvedValueOnce(1);
      tx.$queryRaw.mockResolvedValueOnce([{ stock_quantity: 5 }]);

      const updatedInventory = {
        id: 'inv-1',
        merchantId: MERCHANT_ID,
        productId: PRODUCT_1_ID,
        stockQuantity: 0,
        updatedAt: new Date('2026-08-16T12:00:00.000Z'),
      };
      tx.inventory.update.mockResolvedValueOnce(updatedInventory);

      const result = await service.adjustStock(MERCHANT_ID, USER_ID, PRODUCT_1_ID, {
        stockQuantity: 0,
      });

      expect(result.stockQuantity).toBe(0);
      expect(tx.stockMovement.create).toHaveBeenCalledWith({
        data: {
          merchantId: MERCHANT_ID,
          productId: PRODUCT_1_ID,
          delta: -5,
          balanceAfter: 0,
          reason: 'ADJUSTMENT',
          actorId: USER_ID,
        },
      });
    });

    it('should throw PRODUCT_INACTIVE when attempting to add stock (> 0) to inactive product', async () => {
      products.send.mockResolvedValueOnce({ ...mockProduct1, isActive: false });

      await expect(
        service.adjustStock(MERCHANT_ID, USER_ID, PRODUCT_1_ID, { stockQuantity: 10 }),
      ).rejects.toBeInstanceOf(RpcException);
    });

    it('should throw PRODUCT_NOT_FOUND when product does not exist in catalog', async () => {
      products.send.mockRejectedValueOnce(new RpcException('Not found'));

      await expect(
        service.adjustStock(MERCHANT_ID, USER_ID, PRODUCT_1_ID, { stockQuantity: 10 }),
      ).rejects.toBeInstanceOf(RpcException);
    });
  });

  // ==========================================
  // 4. CHECKOUT PARTICIPATION TESTS
  // ==========================================
  // These run inside SalesService's transaction rather than owning one.
  describe('decrementForSale', () => {
    const lines = [
      { productId: PRODUCT_1_ID, productNameSnapshot: 'Kopi Susu', quantity: 2 },
      { productId: PRODUCT_2_ID, productNameSnapshot: 'Roti Bakar', quantity: 1 },
    ];

    it('decrements each line with the quantity guard in the same statement', async () => {
      tx.inventory.update.mockResolvedValue({ stockQuantity: 8 });

      await service.decrementForSale(tx as never, MERCHANT_ID, lines);

      expect(tx.inventory.update).toHaveBeenCalledWith({
        where: {
          merchantId_productId: { merchantId: MERCHANT_ID, productId: PRODUCT_1_ID },
          stockQuantity: { gte: 2 },
        },
        data: { stockQuantity: { decrement: 2 } },
      });
    });

    it('uses the transaction it is handed and never opens its own', async () => {
      tx.inventory.update.mockResolvedValue({ stockQuantity: 8 });

      await service.decrementForSale(tx as never, MERCHANT_ID, lines);

      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('takes inventory locks in product-id order regardless of cart order', async () => {
      tx.inventory.update.mockResolvedValue({ stockQuantity: 8 });

      await service.decrementForSale(tx as never, MERCHANT_ID, [...lines].reverse());

      const lockedIds = tx.inventory.update.mock.calls.map(
        (call) =>
          (call[0] as { where: { merchantId_productId: { productId: string } } }).where
            .merchantId_productId.productId,
      );
      expect(lockedIds).toEqual([...lockedIds].sort((a, b) => a.localeCompare(b)));
    });

    it('returns the post-decrement balance per product', async () => {
      tx.inventory.update
        .mockResolvedValueOnce({ stockQuantity: 8 })
        .mockResolvedValueOnce({ stockQuantity: 3 });

      const balances = await service.decrementForSale(tx as never, MERCHANT_ID, lines);

      expect(balances.get(PRODUCT_1_ID)).toBe(8);
      expect(balances.get(PRODUCT_2_ID)).toBe(3);
    });

    it('names the offending line when stock is short', async () => {
      tx.inventory.update.mockResolvedValueOnce({ stockQuantity: 8 }).mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError('not found', {
          code: 'P2025',
          clientVersion: '7.9.1',
        }),
      );

      const promise = service.decrementForSale(tx as never, MERCHANT_ID, lines);

      await expect(promise).rejects.toBeInstanceOf(RpcException);
      await promise.catch((error: unknown) => {
        expect((error as RpcException).getError()).toEqual({
          code: AppErrorCode.INSUFFICIENT_STOCK,
          message: 'Insufficient stock for Roti Bakar',
        });
      });
    });

    it('does not swallow an unrelated database failure', async () => {
      tx.inventory.update.mockRejectedValue(new Error('connection reset'));

      await expect(service.decrementForSale(tx as never, MERCHANT_ID, lines)).rejects.toThrow(
        'connection reset',
      );
    });
  });

  describe('recordSaleMovements', () => {
    it('writes one SALE movement per line with a negative delta and the new balance', async () => {
      await service.recordSaleMovements(tx as never, {
        merchantId: MERCHANT_ID,
        saleId: 'sale-1',
        actorId: USER_ID,
        lines: [
          { productId: PRODUCT_1_ID, productNameSnapshot: 'Kopi Susu', quantity: 2 },
          { productId: PRODUCT_2_ID, productNameSnapshot: 'Roti Bakar', quantity: 1 },
        ],
        balances: new Map([
          [PRODUCT_1_ID, 8],
          [PRODUCT_2_ID, 3],
        ]),
      });

      expect(tx.stockMovement.createMany).toHaveBeenCalledWith({
        data: [
          {
            merchantId: MERCHANT_ID,
            productId: PRODUCT_1_ID,
            delta: -2,
            balanceAfter: 8,
            reason: 'SALE',
            actorId: USER_ID,
            saleId: 'sale-1',
          },
          {
            merchantId: MERCHANT_ID,
            productId: PRODUCT_2_ID,
            delta: -1,
            balanceAfter: 3,
            reason: 'SALE',
            actorId: USER_ID,
            saleId: 'sale-1',
          },
        ],
      });
    });
  });

  describe('Schema Validations', () => {
    it('should validate adjustStockSchema correctly', () => {
      expect(adjustStockSchema.safeParse({ stockQuantity: 10 }).success).toBe(true);
      expect(adjustStockSchema.safeParse({ stockQuantity: 0 }).success).toBe(true);
      expect(adjustStockSchema.safeParse({ stockQuantity: -5 }).success).toBe(false);
      expect(adjustStockSchema.safeParse({ stockQuantity: 1.5 }).success).toBe(false);
    });

    it('should validate getMerchantStockQuerySchema with defaults', () => {
      const parsed = getMerchantStockQuerySchema.parse({});
      expect(parsed.page).toBe(1);
      expect(parsed.limit).toBe(10);
    });
  });
});
