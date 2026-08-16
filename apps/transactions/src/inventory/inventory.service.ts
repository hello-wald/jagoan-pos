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
import { TransactionsPrismaService } from '../prisma/prisma.service';
import { ProductsClient } from '../clients/products.client';

@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: TransactionsPrismaService,
    private readonly products: ProductsClient,
  ) {}

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
