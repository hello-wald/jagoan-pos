import { createHash, randomUUID } from "node:crypto";
import { Injectable } from "@nestjs/common";
import {
  AppErrorCode,
  UNCATEGORIZED,
  type CategorySummary,
  type CreateProductImageUploadInput,
  type CreateProductInput,
  type PaginatedProducts,
  type Product,
  type ProductImage,
  type ProductImageUpload,
  type ProductListQuery,
  type UpdateProductInput,
} from "@jagoan-pos/contracts";
import { RedisService } from "@jagoan-pos/redis";
import { cacheKeys } from "@jagoan-pos/shared";
import { RpcException } from "@nestjs/microservices";
import { ConfigService } from "@nestjs/config";
import { Prisma, ProductImageStatus } from "../generated/prisma/client";
import type { ProductsEnv } from "../config/env.schema";
import { ProductsPrismaService } from "../prisma/prisma.service";
import { ProductStorageService } from "../storage/product-storage.service";
import {
  PRODUCT_CACHE_TTL_SECONDS,
  PRODUCT_LIST_CACHE_TTL_SECONDS,
  PRODUCT_LIST_VERSION_TTL_SECONDS,
} from "./catalog-cache";

const productWithReadyImages: Prisma.ProductInclude = {
  category: { select: { id: true, name: true, isActive: true } },
  images: {
    where: { status: ProductImageStatus.READY },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  },
};

type ProductWithReadyImages = {
  id: string;
  name: string;
  sku: string;
  categoryId: string | null;
  category: CategorySummary | null;
  price: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  images: Array<{
    id: string;
    storagePath: string;
    contentType: string;
    sizeBytes: number;
    sortOrder: number;
    createdAt: Date;
  }>;
};

@Injectable()
export class ProductsService {
  private readonly maxImageBytes: number;
  private readonly imageUrlTtlSeconds: number;

  constructor(
    private readonly prisma: ProductsPrismaService,
    private readonly redis: RedisService,
    private readonly storage: ProductStorageService,
    config: ConfigService<ProductsEnv, true>,
  ) {
    this.maxImageBytes = config.getOrThrow("PRODUCT_IMAGE_MAX_BYTES", { infer: true });
    this.imageUrlTtlSeconds = config.getOrThrow("PRODUCT_IMAGE_SIGNED_URL_TTL_SECONDS", {
      infer: true,
    });
  }

  async create(dto: CreateProductInput): Promise<Product> {
    try {
      const product = await this.prisma.product.create({
        data: this.toProductData(dto),
        include: productWithReadyImages,
      });
      await this.invalidateProductCache(product.id);
      return this.toProduct(product);
    } catch (error) {
      this.rethrowKnownError(error);
    }
  }

  async list(query: ProductListQuery): Promise<PaginatedProducts> {
    const cacheKey = await this.productListCacheKey(query);
    const cached = await this.redis.get<PaginatedProducts>(cacheKey);
    if (cached) return cached;

    const where: Prisma.ProductWhereInput = {
      ...(query.activeOnly === undefined ? {} : { isActive: query.activeOnly }),
      // The sentinel matches products with no category; a uuid matches one category.
      ...(query.categoryId === undefined
        ? {}
        : { categoryId: query.categoryId === UNCATEGORIZED ? null : query.categoryId }),
      ...(query.query
        ? {
            OR: [
              { name: { contains: query.query, mode: "insensitive" } },
              { sku: { contains: query.query.toUpperCase(), mode: "insensitive" } },
            ],
          }
        : {}),
    };
    const skip = (query.page - 1) * query.pageSize;
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        skip,
        take: query.pageSize,
        orderBy: { name: "asc" },
        include: productWithReadyImages,
      }),
      this.prisma.product.count({ where }),
    ]);
    const result = {
      data: await Promise.all(rows.map((row) => this.toProduct(row))),
      meta: { page: query.page, pageSize: query.pageSize, total },
    };
    await this.redis.set(cacheKey, result, PRODUCT_LIST_CACHE_TTL_SECONDS);
    return result;
  }

  async getById(id: string): Promise<Product> {
    const cacheKey = cacheKeys.productDetail(id);
    const cached = await this.redis.get<Product>(cacheKey);
    if (cached) return cached;

    const product = await this.prisma.product.findUnique({
      where: { id },
      include: productWithReadyImages,
    });
    if (!product) throw this.rpcError(AppErrorCode.PRODUCT_NOT_FOUND, "Product not found");

    const result = await this.toProduct(product);
    await this.redis.set(cacheKey, result, PRODUCT_CACHE_TTL_SECONDS);
    return result;
  }

  async getManyByIds(ids: string[]): Promise<Product[]> {
    if (ids.length === 0) return Promise.resolve([]);
    const products = await this.prisma.product.findMany({
      where: { id: { in: ids } },
      include: { category: { select: { id: true, name: true, isActive: true } } },
    });
    // This RPC is used by checkout for catalog validation. It must not depend on
    // storage availability or generate signed URLs that the caller does not use.
    return products.map((product) => ({
      ...product,
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString(),
      images: [],
    }));
  }

  async update(id: string, dto: UpdateProductInput): Promise<Product> {
    try {
      const product = await this.prisma.product.update({
        where: { id },
        data: this.toProductData(dto),
        include: productWithReadyImages,
      });
      await this.invalidateProductCache(id);
      return this.toProduct(product);
    } catch (error) {
      this.rethrowKnownError(error);
    }
  }

  async setActive(id: string, isActive: boolean): Promise<Product> {
    try {
      const product = await this.prisma.product.update({
        where: { id },
        data: { isActive },
        include: productWithReadyImages,
      });
      await this.invalidateProductCache(id);
      return this.toProduct(product);
    } catch (error) {
      this.rethrowKnownError(error);
    }
  }

  async createImageUpload(
    productId: string,
    dto: CreateProductImageUploadInput,
  ): Promise<ProductImageUpload> {
    if (dto.sizeBytes > this.maxImageBytes) {
      throw this.rpcError(AppErrorCode.INVALID_PRODUCT_IMAGE, "Image exceeds the allowed size");
    }

    await this.requireProduct(productId);
    const imageCount = await this.prisma.productImage.count({ where: { productId } });
    if (imageCount >= 5) {
      throw this.rpcError(
        AppErrorCode.PRODUCT_IMAGE_LIMIT_REACHED,
        "A product may have at most 5 images",
      );
    }

    const imageId = randomUUID();
    const storagePath = `products/${productId}/${imageId}.${this.fileExtension(dto.contentType)}`;
    const image = await this.prisma.productImage.create({
      data: {
        id: imageId,
        productId,
        storagePath,
        contentType: dto.contentType,
        sizeBytes: dto.sizeBytes,
        sortOrder: imageCount,
        status: ProductImageStatus.PENDING,
      },
    });

    try {
      const upload = await this.storage.createSignedUploadUrl(image.storagePath);
      return {
        imageId: image.id,
        path: image.storagePath,
        uploadUrl: upload.signedUrl,
        uploadToken: upload.token,
      };
    } catch {
      await this.prisma.productImage.delete({ where: { id: image.id } }).catch(() => undefined);
      throw this.rpcError(AppErrorCode.STORAGE_ERROR, "Unable to prepare image upload");
    }
  }

  async completeImageUpload(productId: string, imageId: string): Promise<ProductImage> {
    const image = await this.requireImage(productId, imageId);
    if (image.status === ProductImageStatus.READY) return this.toProductImage(image);

    try {
      const object = await this.storage.getObject(image.storagePath);
      if (
        object.size !== image.sizeBytes ||
        object.size > this.maxImageBytes ||
        object.contentType !== image.contentType
      ) {
        await this.storage.remove(image.storagePath).catch(() => undefined);
        await this.prisma.productImage.delete({ where: { id: image.id } });
        throw this.rpcError(
          AppErrorCode.INVALID_PRODUCT_IMAGE,
          "Uploaded image does not match the upload request",
        );
      }
      const readyImage = await this.prisma.productImage.update({
        where: { id: image.id },
        data: { status: ProductImageStatus.READY },
      });
      await this.invalidateProductCache(productId);
      return this.toProductImage(readyImage);
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw this.rpcError(AppErrorCode.STORAGE_ERROR, "Unable to verify uploaded image");
    }
  }

  async deleteImage(productId: string, imageId: string): Promise<void> {
    const image = await this.requireImage(productId, imageId);
    try {
      await this.storage.remove(image.storagePath);
      await this.prisma.productImage.delete({ where: { id: image.id } });
      await this.invalidateProductCache(productId);
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw this.rpcError(AppErrorCode.STORAGE_ERROR, "Unable to delete product image");
    }
  }

  async rejectPermanentDelete(id: string): Promise<never> {
    await this.getById(id);
    throw this.rpcError(
      AppErrorCode.PERMANENT_DELETE_FORBIDDEN,
      "Products cannot be permanently deleted; deactivate the product instead",
    );
  }

  private async requireProduct(id: string): Promise<void> {
    const product = await this.prisma.product.findUnique({ where: { id }, select: { id: true } });
    if (!product) throw this.rpcError(AppErrorCode.PRODUCT_NOT_FOUND, "Product not found");
  }

  private async requireImage(productId: string, imageId: string) {
    await this.requireProduct(productId);
    const image = await this.prisma.productImage.findFirst({ where: { id: imageId, productId } });
    if (!image)
      throw this.rpcError(AppErrorCode.PRODUCT_IMAGE_NOT_FOUND, "Product image not found");
    return image;
  }

  private async toProduct(product: ProductWithReadyImages): Promise<Product> {
    return {
      id: product.id,
      name: product.name,
      sku: product.sku,
      categoryId: product.categoryId,
      category: product.category,
      price: product.price,
      isActive: product.isActive,
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString(),
      images: await Promise.all(product.images.map((image) => this.toProductImage(image))),
    };
  }

  private async toProductImage(image: {
    id: string;
    storagePath: string;
    contentType: string;
    sizeBytes: number;
    sortOrder: number;
    createdAt: Date;
  }): Promise<ProductImage> {
    try {
      return {
        id: image.id,
        url: await this.storage.createSignedReadUrl(image.storagePath, this.imageUrlTtlSeconds),
        contentType: image.contentType,
        sizeBytes: image.sizeBytes,
        sortOrder: image.sortOrder,
        createdAt: image.createdAt.toISOString(),
      };
    } catch {
      throw this.rpcError(AppErrorCode.STORAGE_ERROR, "Unable to create image URL");
    }
  }

  private async productListCacheKey(query: ProductListQuery): Promise<string> {
    const version = (await this.redis.getRaw(cacheKeys.productListVersion())) ?? "0";
    const normalizedQuery = {
      query: query.query?.trim().toLowerCase() ?? null,
      page: query.page,
      pageSize: query.pageSize,
      activeOnly: query.activeOnly ?? null,
      categoryId: query.categoryId ?? null,
    };
    const hash = createHash("sha256").update(JSON.stringify(normalizedQuery)).digest("hex");
    return cacheKeys.productList(version, hash);
  }

  private async invalidateProductCache(productId: string): Promise<void> {
    await Promise.all([
      this.redis.del(cacheKeys.productDetail(productId)),
      this.redis.incrWithTtl(cacheKeys.productListVersion(), PRODUCT_LIST_VERSION_TTL_SECONDS),
    ]);
  }

  private toProductData(dto: Partial<CreateProductInput>): Prisma.ProductUncheckedCreateInput {
    return {
      ...(dto.name === undefined ? {} : { name: dto.name.trim() }),
      ...(dto.sku === undefined ? {} : { sku: this.normalizeSku(dto.sku) }),
      ...(dto.categoryId === undefined ? {} : { categoryId: dto.categoryId }),
      ...(dto.price === undefined ? {} : { price: dto.price }),
    } as Prisma.ProductUncheckedCreateInput;
  }

  private fileExtension(contentType: CreateProductImageUploadInput["contentType"]): string {
    return { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }[contentType];
  }

  private normalizeSku(sku: string): string {
    return sku.trim().toUpperCase();
  }

  private rethrowKnownError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        throw this.rpcError(AppErrorCode.SKU_ALREADY_EXISTS, "SKU already exists");
      }
      if (error.code === "P2025") {
        throw this.rpcError(AppErrorCode.PRODUCT_NOT_FOUND, "Product not found");
      }
      // The categories FK is the only one a caller-supplied id can violate.
      if (error.code === "P2003") {
        throw this.rpcError(AppErrorCode.CATEGORY_NOT_FOUND, "Category not found");
      }
    }
    throw error;
  }

  private rpcError(code: AppErrorCode, message: string): RpcException {
    return new RpcException({ code, message });
  }
}
