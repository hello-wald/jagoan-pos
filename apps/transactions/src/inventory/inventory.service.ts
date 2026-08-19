import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import {
  AppErrorCode,
  type AdjustStockInput,
  type AdjustStockResult,
  type GetMerchantStockQueryInput,
  type InventorySummary,
  type PaginatedMerchantStock,
} from '@jagoan-pos/contracts';
import { Prisma } from '../generated/prisma/client';
import { TransactionsPrismaService } from '../prisma/prisma.service';
import { ProductsClient } from '../clients/products.client';

/** The part of a resolved cart line that stock movement needs. */
export type SaleStockLine = {
  productId: string;
  productNameSnapshot: string;
  quantity: number;
};

@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: TransactionsPrismaService,
    private readonly products: ProductsClient,
  ) {}

  /**
   * Decrements every line inside the *caller's* transaction, so the stock write
   * commits with the sale or not at all. This must never open a transaction of
   * its own: that would put the decrement on a separate connection, where it
   * would survive a sale that later fails.
   */
  async decrementForSale(
    tx: Prisma.TransactionClient,
    merchantId: string,
    lines: SaleStockLine[],
  ): Promise<Map<string, number>> {
    const balances = new Map<string, number>();

    for (const line of this.orderForLocking(lines)) {
      balances.set(line.productId, await this.decrementLine(tx, merchantId, line));
    }

    return balances;
  }

  /**
   * The `SALE` half of the ledger. Balances come from `decrementForSale`, which
   * is what keeps a movement's `balanceAfter` equal to the row it was read from.
   */
  async recordSaleMovements(
    tx: Prisma.TransactionClient,
    params: {
      merchantId: string;
      saleId: string;
      actorId: string;
      lines: SaleStockLine[];
      balances: Map<string, number>;
    },
  ): Promise<void> {
    await tx.stockMovement.createMany({
      data: this.orderForLocking(params.lines).map((line) => ({
        merchantId: params.merchantId,
        productId: line.productId,
        delta: -line.quantity,
        balanceAfter: params.balances.get(line.productId) ?? 0,
        reason: 'SALE' as const,
        actorId: params.actorId,
        saleId: params.saleId,
      })),
    });
  }

  /**
   * Concurrent carts that take inventory locks in different orders deadlock.
   * Every writer of `inventories` inherits the ordering by going through here.
   */
  private orderForLocking<T extends { productId: string }>(lines: T[]): T[] {
    return [...lines].sort((a, b) => a.productId.localeCompare(b.productId));
  }

  private async decrementLine(
    tx: Prisma.TransactionClient,
    merchantId: string,
    line: SaleStockLine,
  ): Promise<number> {
    try {
      const updated = await tx.inventory.update({
        where: {
          merchantId_productId: { merchantId, productId: line.productId },
          stockQuantity: { gte: line.quantity },
        },
        data: { stockQuantity: { decrement: line.quantity } },
      });
      return updated.stockQuantity;
    } catch (error) {
      // P2025 covers both "never stocked" and "not enough left".
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new RpcException({
          code: AppErrorCode.INSUFFICIENT_STOCK,
          message: `Insufficient stock for ${line.productNameSnapshot}`,
        });
      }
      throw error;
    }
  }

  async getInventorySummary(merchantId: string): Promise<InventorySummary> {
    const [catalog, allMerchantInventories] = await Promise.all([
      this.products.send('products.list', { page: 1, pageSize: 1}),
      this.prisma.inventory.findMany({
        where: { merchantId },
        select: { stockQuantity: true },
      }),
    ]);

    const totalProducts = catalog.meta.total;
    let totalStockUnits = 0;
    let lowStockCount = 0;
    let outOfStockWithRow = 0;

    for (const inv of allMerchantInventories) {
      totalStockUnits += inv.stockQuantity;
      if (inv.stockQuantity === 0) {
        outOfStockWithRow++;
      } else if (inv.stockQuantity <= 10) {
        lowStockCount++;
      }
    }

    const unconfiguredProducts = Math.max(0, totalProducts - allMerchantInventories.length);
    const outOfStockCount = outOfStockWithRow + unconfiguredProducts;

    return {
      totalProducts,
      totalStockUnits,
      lowStockCount,
      outOfStockCount,
    };
  }

  async getMerchantStock(
    merchantId: string,
    query: GetMerchantStockQueryInput,
  ): Promise<PaginatedMerchantStock> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const catalog = await this.products.send('products.list', {
      page,
      pageSize: limit,
      query: query.search,
      activeOnly: query.activeOnly,
    });

    const productIds = catalog.data.map((p) => p.id);

    const inventories = await this.prisma.inventory.findMany({
      where: {
        merchantId,
        productId: { in: productIds },
      },
    });

    const inventoryMap = new Map(inventories.map((inv) => [inv.productId, inv]));

    return {
      data: catalog.data.map((p) => {
        const inv = inventoryMap.get(p.id);
        return {
          productId: p.id,
          name: p.name,
          sku: p.sku,
          imageUrl: p.images[0]?.url ?? null,
          currentPrice: p.price,
          stockQuantity: inv?.stockQuantity ?? 0,
          isActive: p.isActive,
          updatedAt: inv?.updatedAt
            ? new Date(inv.updatedAt).toISOString()
            : new Date(p.updatedAt).toISOString(),
        };
      }),
      meta: {
        total: catalog.meta.total,
        page: catalog.meta.page,
        limit: catalog.meta.pageSize,
        totalPages: Math.ceil(catalog.meta.total / catalog.meta.pageSize),
      },
    };
  }

  async adjustStock(
    merchantId: string,
    userId: string,
    productId: string,
    dto: AdjustStockInput,
  ): Promise<AdjustStockResult> {
    const product = await this.products.send('products.getById', { id: productId });
    if (!product) {
      throw new RpcException({
        code: AppErrorCode.PRODUCT_NOT_FOUND,
        message: 'Product not found in catalog',
      });
    }

    if (!product.isActive && dto.stockQuantity !== 0) {
      throw new RpcException({
        code: AppErrorCode.PRODUCT_INACTIVE,
        message: 'Cannot add stock to an inactive product. Only stock = 0 is allowed.',
      });
    }

    const inventory = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        INSERT INTO inventories (id, merchant_id, product_id, stock_quantity, created_at, updated_at)
        VALUES (gen_random_uuid(), ${merchantId}::uuid, ${productId}::uuid, 0, NOW(), NOW())
        ON CONFLICT (merchant_id, product_id) DO NOTHING
      `;

      const [current] = await tx.$queryRaw<Array<{ stock_quantity: number }>>`
        SELECT stock_quantity FROM inventories
        WHERE merchant_id = ${merchantId}::uuid AND product_id = ${productId}::uuid
        FOR UPDATE
      `;

      const previousStock = current?.stock_quantity ?? 0;
      const delta = dto.stockQuantity - previousStock;

      const updated = await tx.inventory.update({
        where: { merchantId_productId: { merchantId, productId } },
        data: { stockQuantity: dto.stockQuantity },
      });

      if (delta !== 0) {
        await tx.stockMovement.create({
          data: {
            merchantId,
            productId,
            delta,
            balanceAfter: dto.stockQuantity,
            reason: 'ADJUSTMENT',
            actorId: userId,
          },
        });
      }

      return updated;
    });

    return {
      id: inventory.id,
      merchantId: inventory.merchantId,
      productId: inventory.productId,
      productName: product.name,
      sku: product.sku,
      currentPrice: product.price,
      stockQuantity: inventory.stockQuantity,
      updatedAt: new Date(inventory.updatedAt).toISOString(),
    };
  }
}
