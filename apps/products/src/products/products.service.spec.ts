import { AppErrorCode, UNCATEGORIZED, createProductSchema } from "@jagoan-pos/contracts";
import { RpcException } from "@nestjs/microservices";
import { Prisma } from "../generated/prisma/client";
import type { ProductsPrismaService } from "../prisma/prisma.service";
import { ProductsService } from "./products.service";

describe("ProductsService", () => {
  const CATEGORY_ID = "2f9d1c6e-6b8a-4f5d-9a3e-1c0b7e4d2a11";
  const category = { id: CATEGORY_ID, name: "Beverages", isActive: true };
  const product = {
    id: "d08a0a1f-833d-4a63-a9de-f40c28000f31",
    name: "Mineral Water",
    sku: "WATER-600ML",
    categoryId: CATEGORY_ID,
    category,
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

  const expectedInclude = {
    category: { select: { id: true, name: true, isActive: true } },
    images: {
      where: { status: "READY" },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
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
      categoryId: CATEGORY_ID,
      price: 5000,
    });

    expect(prisma.product.create).toHaveBeenCalledWith({
      data: {
        name: "Mineral Water",
        sku: "WATER-600ML",
        categoryId: CATEGORY_ID,
        price: 5000,
      },
      include: expectedInclude,
    });
  });

  it("reports an unknown category as a domain error rather than a foreign key failure", async () => {
    prisma.product.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("FK violation", {
        code: "P2003",
        clientVersion: "7.9.1",
      }),
    );

    await expectProductError(
      service.create({
        name: "Water",
        sku: "WATER-600ML",
        categoryId: "0e1d2c3b-4a59-4687-8b9c-0d1e2f3a4b5c",
        price: 5000,
      }),
      AppErrorCode.CATEGORY_NOT_FOUND,
      "Category not found",
    );
  });

  it("clears the category when the update sends an explicit null", async () => {
    prisma.product.update.mockResolvedValue({ ...product, categoryId: null, category: null });

    await service.update(product.id, { categoryId: null });

    expect(prisma.product.update).toHaveBeenCalledWith({
      where: { id: product.id },
      data: { categoryId: null },
      include: expectedInclude,
    });
  });

  it("filters by category, and by its absence when given the uncategorized sentinel", async () => {
    redis.get.mockResolvedValue(null);
    redis.getRaw.mockResolvedValue("0");
    prisma.$transaction.mockResolvedValue([[], 0]);

    await service.list({ page: 1, pageSize: 20, categoryId: CATEGORY_ID });
    expect(prisma.product.count).toHaveBeenCalledWith({ where: { categoryId: CATEGORY_ID } });

    await service.list({ page: 1, pageSize: 20, categoryId: UNCATEGORIZED });
    expect(prisma.product.count).toHaveBeenCalledWith({ where: { categoryId: null } });
  });

  it("caches category-filtered lists separately from unfiltered ones", async () => {
    redis.get.mockResolvedValue(null);
    redis.getRaw.mockResolvedValue("0");
    prisma.$transaction.mockResolvedValue([[], 0]);

    await service.list({ page: 1, pageSize: 20 });
    const unfilteredKey = redis.set.mock.calls.at(-1)?.[0];

    await service.list({ page: 1, pageSize: 20, categoryId: CATEGORY_ID });
    const filteredKey = redis.set.mock.calls.at(-1)?.[0];

    expect(filteredKey).not.toEqual(unfilteredKey);
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
      include: expectedInclude,
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

    expect(prisma.product.findMany).toHaveBeenCalledWith({
      where: { id: { in: [product.id] } },
      include: { category: { select: { id: true, name: true, isActive: true } } },
    });
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
