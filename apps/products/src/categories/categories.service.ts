import { Injectable } from "@nestjs/common";
import {
  AppErrorCode,
  type Category,
  type CategoryListQuery,
  type CategoryWithUsage,
  type CreateCategoryInput,
  type UpdateCategoryInput,
} from "@jagoan-pos/contracts";
import { RedisService } from "@jagoan-pos/redis";
import { cacheKeys } from "@jagoan-pos/shared";
import { RpcException } from "@nestjs/microservices";
import { Prisma } from "../generated/prisma/client";
import { ProductsPrismaService } from "../prisma/prisma.service";
import {
  CATEGORY_LIST_CACHE_TTL_SECONDS,
  PRODUCT_LIST_VERSION_TTL_SECONDS,
  categoryListScope,
} from "../products/catalog-cache";

/** Redis rejects an unbounded DEL, so cascading invalidation goes out in batches. */
const DELETE_BATCH_SIZE = 500;

type CategoryRow = {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class CategoriesService {
  constructor(
    private readonly prisma: ProductsPrismaService,
    private readonly redis: RedisService,
  ) {}

  async create(dto: CreateCategoryInput): Promise<Category> {
    try {
      const category = await this.prisma.category.create({ data: { name: dto.name.trim() } });
      await this.invalidateCategoryCache();
      return this.toCategory(category);
    } catch (error) {
      this.rethrowKnownError(error);
    }
  }

  async list(query: CategoryListQuery): Promise<CategoryWithUsage[]> {
    const cacheKey = cacheKeys.categoryList(categoryListScope(query.activeOnly));
    const cached = await this.redis.get<CategoryWithUsage[]>(cacheKey);
    if (cached) return cached;

    const rows = await this.prisma.category.findMany({
      where: query.activeOnly === undefined ? {} : { isActive: query.activeOnly },
      orderBy: { name: "asc" },
      include: { _count: { select: { products: true } } },
    });
    const result = rows.map((row) => ({
      ...this.toCategory(row),
      productCount: row._count.products,
    }));

    await this.redis.set(cacheKey, result, CATEGORY_LIST_CACHE_TTL_SECONDS);
    return result;
  }

  async getById(id: string): Promise<Category> {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) throw this.rpcError(AppErrorCode.CATEGORY_NOT_FOUND, "Category not found");
    return this.toCategory(category);
  }

  async update(id: string, dto: UpdateCategoryInput): Promise<Category> {
    try {
      const category = await this.prisma.category.update({
        where: { id },
        data: { name: dto.name.trim() },
      });
      // A rename rewrites the category name embedded in every product payload.
      await this.invalidateCategoryCache(id);
      return this.toCategory(category);
    } catch (error) {
      this.rethrowKnownError(error);
    }
  }

  /**
   * Categories are retired, never deleted: products already filed under one keep
   * pointing at it, and the products table's FK is ON DELETE RESTRICT to match.
   */
  async setActive(id: string, isActive: boolean): Promise<Category> {
    try {
      const category = await this.prisma.category.update({ where: { id }, data: { isActive } });
      await this.invalidateCategoryCache(id);
      return this.toCategory(category);
    } catch (error) {
      this.rethrowKnownError(error);
    }
  }

  private toCategory(category: CategoryRow): Category {
    return {
      id: category.id,
      name: category.name,
      isActive: category.isActive,
      createdAt: category.createdAt.toISOString(),
      updatedAt: category.updatedAt.toISOString(),
    };
  }

  /**
   * Drops the category list caches, and — when a specific category changed — the
   * cached product payloads that embed its name and status.
   */
  private async invalidateCategoryCache(categoryId?: string): Promise<void> {
    await this.redis.del(
      ...["all", "active", "inactive"].map((scope) => cacheKeys.categoryList(scope)),
    );
    if (!categoryId) return;

    const products = await this.prisma.product.findMany({
      where: { categoryId },
      select: { id: true },
    });
    for (let i = 0; i < products.length; i += DELETE_BATCH_SIZE) {
      const batch = products.slice(i, i + DELETE_BATCH_SIZE);
      await this.redis.del(...batch.map((product) => cacheKeys.productDetail(product.id)));
    }
    await this.redis.incrWithTtl(cacheKeys.productListVersion(), PRODUCT_LIST_VERSION_TTL_SECONDS);
  }

  private rethrowKnownError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        throw this.rpcError(
          AppErrorCode.CATEGORY_NAME_ALREADY_EXISTS,
          "A category with this name already exists",
        );
      }
      if (error.code === "P2025") {
        throw this.rpcError(AppErrorCode.CATEGORY_NOT_FOUND, "Category not found");
      }
    }
    throw error;
  }

  private rpcError(code: AppErrorCode, message: string): RpcException {
    return new RpcException({ code, message });
  }
}
