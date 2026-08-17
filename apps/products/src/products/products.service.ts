import { Injectable } from '@nestjs/common';
import {
  AppErrorCode,
  type CreateProductInput,
  type PaginatedProducts,
  type Product,
  type ProductListQuery,
  type UpdateProductInput,
} from '@jagoan-pos/contracts';
import { RpcException } from '@nestjs/microservices';
import { Prisma } from '../generated/prisma/client';
import { ProductsPrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: ProductsPrismaService) {}

  async create(dto: CreateProductInput): Promise<Product> {
    try {
      return await this.prisma.product.create({
        data: this.toProductData(dto),
      });
    } catch (error) {
      this.rethrowKnownError(error);
    }
  }

  async list(query: ProductListQuery): Promise<PaginatedProducts> {
    const where: Prisma.ProductWhereInput = {
      ...(query.activeOnly === undefined ? {} : { isActive: query.activeOnly }),
      ...(query.query
        ? {
            OR: [
              { name: { contains: query.query, mode: 'insensitive' } },
              { sku: { contains: query.query.toUpperCase(), mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const skip = (query.page - 1) * query.pageSize;
    const [data, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        skip,
        take: query.pageSize,
        orderBy: { name: 'asc' },
      }),
      this.prisma.product.count({ where }),
    ]);

    return { data, meta: { page: query.page, pageSize: query.pageSize, total } };
  }

  async getById(id: string): Promise<Product> {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw this.rpcError(AppErrorCode.PRODUCT_NOT_FOUND, 'Product not found');
    }
    return product;
  }

  getManyByIds(ids: string[]): Promise<Product[]> {
    if (ids.length === 0) return Promise.resolve([]);
    return this.prisma.product.findMany({ where: { id: { in: ids } } });
  }

  async update(id: string, dto: UpdateProductInput): Promise<Product> {
    try {
      return await this.prisma.product.update({
        where: { id },
        data: this.toProductData(dto),
      });
    } catch (error) {
      this.rethrowKnownError(error);
    }
  }

  async setActive(id: string, isActive: boolean): Promise<Product> {
    try {
      return await this.prisma.product.update({
        where: { id },
        data: { isActive },
      });
    } catch (error) {
      this.rethrowKnownError(error);
    }
  }

  async rejectPermanentDelete(id: string): Promise<never> {
    await this.getById(id);
    throw this.rpcError(
      AppErrorCode.PERMANENT_DELETE_FORBIDDEN,
      'Products cannot be permanently deleted; deactivate the product instead',
    );
  }

  private toProductData(dto: Partial<CreateProductInput>): Prisma.ProductUncheckedCreateInput {
    return {
      ...(dto.name === undefined ? {} : { name: dto.name.trim() }),
      ...(dto.sku === undefined ? {} : { sku: this.normalizeSku(dto.sku) }),
      ...(dto.category === undefined ? {} : { category: dto.category?.trim() ?? null }),
      ...(dto.price === undefined ? {} : { price: dto.price }),
    } as Prisma.ProductUncheckedCreateInput;
  }

  private normalizeSku(sku: string): string {
    return sku.trim().toUpperCase();
  }

  private rethrowKnownError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw this.rpcError(AppErrorCode.SKU_ALREADY_EXISTS, 'SKU already exists');
      }
      if (error.code === 'P2025') {
        throw this.rpcError(AppErrorCode.PRODUCT_NOT_FOUND, 'Product not found');
      }
    }
    throw error;
  }

  private rpcError(code: AppErrorCode, message: string): RpcException {
    return new RpcException({ code, message });
  }
}
