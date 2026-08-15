import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import {
  AppErrorCode,
  SALE_COMPLETED_EVENT,
  type CheckoutInput,
  type CheckoutItemInput,
  type Sale,
} from '@jagoan-pos/contracts';
import { Prisma } from '../generated/prisma/client';
import { TransactionsPrismaService } from '../prisma/prisma.service';
import { ProductsClient } from '../clients/products.client';

/** Daily numbering -> WIB. */
const BOOK_TIME_ZONE = 'Asia/Jakarta';

/** A cart line, price resolved server-side. */
type ResolvedLine = {
  productId: string;
  productNameSnapshot: string;
  skuSnapshot: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
};

const saleWithItems = {
  include: { items: { orderBy: { productNameSnapshot: 'asc' } } },
} satisfies Prisma.SaleDefaultArgs;

type SaleWithItems = Prisma.SaleGetPayload<typeof saleWithItems>;
type SaleLineRow = SaleWithItems['items'][number];

@Injectable()
export class SalesService {
  constructor(
    private readonly prisma: TransactionsPrismaService,
    private readonly products: ProductsClient,
  ) {}

  async checkout(input: CheckoutInput): Promise<Sale> {
    const replay = await this.findByIdempotencyKey(input.merchantId, input.idempotencyKey);
    if (replay) return this.toSale(replay);

    const lines = await this.resolveLines(input.items);
    const totalAmount = lines.reduce((sum, line) => sum + line.subtotal, 0);
    const totalQuantity = lines.reduce((sum, line) => sum + line.quantity, 0);

    if (input.cashReceived < totalAmount) {
      throw this.rpcError(
        AppErrorCode.INSUFFICIENT_CASH,
        `Cash received (${input.cashReceived}) does not cover the total (${totalAmount})`,
      );
    }

    try {
      const sale = await this.prisma.$transaction(
        (tx) => this.commitSale(tx, input, lines, totalAmount, totalQuantity),
        { maxWait: 5_000, timeout: 10_000 },
      );
      return this.toSale(sale);
    } catch (error) {
      return this.recoverFromWriteConflict(error, input);
    }
  }

  /** Stock, sale, movements and the outbox event all land together or not at all (FRD §7.1). */
  private async commitSale(
    tx: Prisma.TransactionClient,
    input: CheckoutInput,
    lines: ResolvedLine[],
    totalAmount: number,
    totalQuantity: number,
  ): Promise<SaleWithItems> {
    const transactionNumber = await this.nextTransactionNumber(tx, input.merchantId);

    // Concurrent carts must take inventory locks in the same order or they deadlock.
    const ordered = [...lines].sort((a, b) => a.productId.localeCompare(b.productId));

    const balanceAfter = new Map<string, number>();
    for (const line of ordered) {
      balanceAfter.set(line.productId, await this.decrementStock(tx, input.merchantId, line));
    }

    const sale = await tx.sale.create({
      data: {
        merchantId: input.merchantId,
        merchantNameSnapshot: input.merchantName,
        cashierId: input.cashierId,
        cashierNameSnapshot: input.cashierName,
        transactionNumber,
        idempotencyKey: input.idempotencyKey,
        totalQuantity,
        totalAmount: BigInt(totalAmount),
        cashReceived: BigInt(input.cashReceived),
        changeAmount: BigInt(input.cashReceived - totalAmount),
        items: {
          create: lines.map((line) => ({
            productId: line.productId,
            productNameSnapshot: line.productNameSnapshot,
            skuSnapshot: line.skuSnapshot,
            unitPrice: line.unitPrice,
            quantity: line.quantity,
            subtotal: BigInt(line.subtotal),
          })),
        },
      },
      ...saleWithItems,
    });

    await tx.stockMovement.createMany({
      data: ordered.map((line) => ({
        merchantId: input.merchantId,
        productId: line.productId,
        delta: -line.quantity,
        balanceAfter: balanceAfter.get(line.productId) ?? 0,
        reason: 'SALE' as const,
        actorId: input.cashierId,
        saleId: sale.id,
      })),
    });

    await tx.outboxEvent.create({
      data: {
        aggregateType: 'sale',
        aggregateId: sale.id,
        merchantId: input.merchantId,
        eventType: SALE_COMPLETED_EVENT,
        payload: this.buildEventPayload(sale),
      },
    });

    return sale;
  }

  private async decrementStock(
    tx: Prisma.TransactionClient,
    merchantId: string,
    line: ResolvedLine,
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
        throw this.rpcError(
          AppErrorCode.INSUFFICIENT_STOCK,
          `Insufficient stock for ${line.productNameSnapshot}`,
        );
      }
      throw error;
    }
  }

  /** Gap-free per merchant per day; the counter row lock serializes the sequence. */
  private async nextTransactionNumber(
    tx: Prisma.TransactionClient,
    merchantId: string,
  ): Promise<string> {
    const { date, compact } = this.bookDate(new Date());
    const counter = await tx.transactionCounter.upsert({
      where: { merchantId_bookDate: { merchantId, bookDate: date } },
      create: { merchantId, bookDate: date, lastSeq: 1 },
      update: { lastSeq: { increment: 1 } },
    });
    return `INV/${compact}/${String(counter.lastSeq).padStart(4, '0')}`;
  }

  private bookDate(now: Date): { date: Date; compact: string } {
    const iso = new Intl.DateTimeFormat('en-CA', {
      timeZone: BOOK_TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now);
    return { date: new Date(`${iso}T00:00:00.000Z`), compact: iso.replaceAll('-', '') };
  }

  private async resolveLines(items: CheckoutItemInput[]): Promise<ResolvedLine[]> {
    const catalog = await this.products.send('products.getManyByIds', {
      ids: items.map((item) => item.productId),
    });
    const byId = new Map(catalog.map((product) => [product.id, product]));

    return items.map((item) => {
      const product = byId.get(item.productId);
      if (!product) {
        throw this.rpcError(
          AppErrorCode.PRODUCT_NOT_FOUND,
          `Product ${item.productId} does not exist`,
        );
      }
      if (!product.isActive) {
        throw this.rpcError(AppErrorCode.PRODUCT_INACTIVE, `${product.name} is no longer for sale`);
      }
      return {
        productId: product.id,
        productNameSnapshot: product.name,
        skuSnapshot: product.sku,
        unitPrice: product.price,
        quantity: item.quantity,
        subtotal: product.price * item.quantity,
      };
    });
  }

  private findByIdempotencyKey(
    merchantId: string,
    idempotencyKey: string,
  ): Promise<SaleWithItems | null> {
    return this.prisma.sale.findUnique({
      where: { merchantId_idempotencyKey: { merchantId, idempotencyKey } },
      ...saleWithItems,
    });
  }

  /**
   * Concurrent duplicates both pass the replay check, then one loses on the
   * unique index. Returning the winner's sale is what makes the key idempotent
   * under concurrency rather than only on retry.
   */
  private async recoverFromWriteConflict(error: unknown, input: CheckoutInput): Promise<Sale> {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
      throw error;
    }

    if (this.conflictTargets(error).some((target) => target.includes('idempotency_key'))) {
      const winner = await this.findByIdempotencyKey(input.merchantId, input.idempotencyKey);
      if (winner) return this.toSale(winner);
    }

    // A transaction_number collision is a genuine race: retrying is safe, replaying is not.
    throw this.rpcError(
      AppErrorCode.CHECKOUT_CONFLICT,
      'Checkout collided with a concurrent sale; please retry',
    );
  }

  private conflictTargets(error: Prisma.PrismaClientKnownRequestError): string[] {
    const target = error.meta?.target;
    if (Array.isArray(target)) return target.map(String);
    return typeof target === 'string' ? [target] : [];
  }

  /**
   * Denormalized so the OLAP consumer never calls back. Neither BigInt nor Date
   * survives JSON, so both are converted.
   */
  private buildEventPayload(sale: SaleWithItems): Prisma.InputJsonValue {
    const mapped = this.toSale(sale);
    return {
      ...mapped,
      createdAt: mapped.createdAt.toISOString(),
    } as unknown as Prisma.InputJsonValue;
  }

  private toSale(sale: SaleWithItems): Sale {
    return {
      id: sale.id,
      merchantId: sale.merchantId,
      merchantName: sale.merchantNameSnapshot,
      cashierId: sale.cashierId,
      cashierName: sale.cashierNameSnapshot,
      transactionNumber: sale.transactionNumber,
      status: sale.status,
      totalQuantity: sale.totalQuantity,
      totalAmount: Number(sale.totalAmount),
      cashReceived: Number(sale.cashReceived),
      changeAmount: Number(sale.changeAmount),
      createdAt: sale.createdAt,
      items: sale.items.map((item: SaleLineRow) => ({
        id: item.id,
        productId: item.productId,
        productName: item.productNameSnapshot,
        sku: item.skuSnapshot,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        subtotal: Number(item.subtotal),
      })),
    };
  }

  private rpcError(code: AppErrorCode, message: string): RpcException {
    return new RpcException({ code, message });
  }
}
