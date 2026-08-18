import { AppErrorCode, createProductSchema } from "@jagoan-pos/contracts";
import { RpcException } from "@nestjs/microservices";
import { Prisma } from "../generated/prisma/client";
import type { ProductsPrismaService } from "../prisma/prisma.service";
import { ProductsService } from "./products.service";

describe("ProductsService", () => {
  const product = {
    id: "d08a0a1f-833d-4a63-a9de-f40c28000f31",
    name: "Mineral Water",
    sku: "WATER-600ML",
    category: "Beverages",
    price: 5000,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    images: [],
  };

  const prisma = {
    product: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    productImage: {
      count: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  const redis = {
    get: jest.fn(),
    getRaw: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    incrWithTtl: jest.fn(),
  };
  const storage = {
    createSignedUploadUrl: jest.fn(),
    createSignedReadUrl: jest.fn(),
    getObject: jest.fn(),
    remove: jest.fn(),
  };
  const config = {
    getOrThrow: (key: string) => {
      const values: Record<string, number> = {
        PRODUCT_IMAGE_MAX_BYTES: 5 * 1024 * 1024,
        PRODUCT_IMAGE_SIGNED_URL_TTL_SECONDS: 900,
      };
      return values[key];
    },
  };

  let service: ProductsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ProductsService(
      prisma as unknown as ProductsPrismaService,
      redis as never,
      storage as never,
      config as never,
    );
  });

  it.each([0, -1, 12.5])("rejects an invalid product price of %s", (price) => {
    expect(() => createProductSchema.parse({ name: "Water", sku: "WATER-600ML", price })).toThrow();
  });

  it("normalizes SKU before persisting a product", async () => {
    prisma.product.create.mockResolvedValue(product);

    await service.create({
      name: "Mineral Water",
      sku: " water-600ml ",
      category: "Beverages",
      price: 5000,
    });

    expect(prisma.product.create).toHaveBeenCalledWith({
      data: {
        name: "Mineral Water",
        sku: "WATER-600ML",
        category: "Beverages",
        price: 5000,
      },
      include: {
        images: {
          where: { status: "READY" },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        },
      },
    });
  });

  it("returns a domain error when a SKU conflicts", async () => {
    prisma.product.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Duplicate SKU", {
        code: "P2002",
        clientVersion: "7.9.1",
      }),
    );

    await expectProductError(
      service.create({ name: "Water", sku: "WATER-600ML", price: 5000 }),
      AppErrorCode.SKU_ALREADY_EXISTS,
      "SKU already exists",
    );
  });

  it("soft-deactivates a product without deleting it", async () => {
    prisma.product.update.mockResolvedValue({ ...product, isActive: false });

    await service.setActive(product.id, false);

    expect(prisma.product.update).toHaveBeenCalledWith({
      where: { id: product.id },
      data: { isActive: false },
      include: {
        images: {
          where: { status: "READY" },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        },
      },
    });
  });

  it("serves a cached product detail without querying PostgreSQL", async () => {
    redis.get.mockResolvedValue(product);

    await expect(service.getById(product.id)).resolves.toEqual(product);
    expect(prisma.product.findUnique).not.toHaveBeenCalled();
  });

  it("keeps checkout catalog lookups independent of image storage", async () => {
    prisma.product.findMany.mockResolvedValue([product]);

    await expect(service.getManyByIds([product.id])).resolves.toEqual([
      {
        ...product,
        createdAt: product.createdAt.toISOString(),
        updatedAt: product.updatedAt.toISOString(),
      },
    ]);

    expect(prisma.product.findMany).toHaveBeenCalledWith({ where: { id: { in: [product.id] } } });
    expect(storage.createSignedReadUrl).not.toHaveBeenCalled();
  });

  it("rejects an image upload above the configured size before creating metadata", async () => {
    await expect(
      service.createImageUpload(product.id, {
        fileName: "large.png",
        contentType: "image/png",
        sizeBytes: 5 * 1024 * 1024 + 1,
      }),
    ).rejects.toBeInstanceOf(RpcException);
    expect(prisma.productImage.create).not.toHaveBeenCalled();
  });

  it("rejects permanent deletion and retains the product", async () => {
    prisma.product.findUnique.mockResolvedValue(product);

    await expectProductError(
      service.rejectPermanentDelete(product.id),
      AppErrorCode.PERMANENT_DELETE_FORBIDDEN,
      "Products cannot be permanently deleted; deactivate the product instead",
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
