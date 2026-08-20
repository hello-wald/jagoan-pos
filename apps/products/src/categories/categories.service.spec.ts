import { AppErrorCode } from "@jagoan-pos/contracts";
import { RpcException } from "@nestjs/microservices";
import { cacheKeys } from "@jagoan-pos/shared";
import { Prisma } from "../generated/prisma/client";
import type { ProductsPrismaService } from "../prisma/prisma.service";
import { CategoriesService } from "./categories.service";

describe("CategoriesService", () => {
  const CATEGORY_ID = "2f9d1c6e-6b8a-4f5d-9a3e-1c0b7e4d2a11";
  const row = {
    id: CATEGORY_ID,
    name: "Beverages",
    isActive: true,
    createdAt: new Date("2026-08-01T00:00:00.000Z"),
    updatedAt: new Date("2026-08-01T00:00:00.000Z"),
  };

  const prisma = {
    category: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    product: {
      findMany: jest.fn(),
    },
  };
  const redis = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    incrWithTtl: jest.fn(),
  };

  let service: CategoriesService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.product.findMany.mockResolvedValue([]);
    service = new CategoriesService(prisma as unknown as ProductsPrismaService, redis as never);
  });

  it("trims the name before persisting a category", async () => {
    prisma.category.create.mockResolvedValue(row);

    await service.create({ name: "  Beverages  " });

    expect(prisma.category.create).toHaveBeenCalledWith({ data: { name: "Beverages" } });
  });

  it("returns a domain error when the name is already taken", async () => {
    prisma.category.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Duplicate name", {
        code: "P2002",
        clientVersion: "7.9.1",
      }),
    );

    await expectCategoryError(
      service.create({ name: "Beverages" }),
      AppErrorCode.CATEGORY_NAME_ALREADY_EXISTS,
      "A category with this name already exists",
    );
  });

  it("reports how many products each category holds", async () => {
    redis.get.mockResolvedValue(null);
    prisma.category.findMany.mockResolvedValue([{ ...row, _count: { products: 7 } }]);

    await expect(service.list({})).resolves.toEqual([
      {
        id: CATEGORY_ID,
        name: "Beverages",
        isActive: true,
        productCount: 7,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      },
    ]);
  });

  it("caches each activeOnly scope under its own key", async () => {
    redis.get.mockResolvedValue(null);
    prisma.category.findMany.mockResolvedValue([]);

    await service.list({});
    await service.list({ activeOnly: true });

    const [allKey] = redis.set.mock.calls[0];
    const [activeKey] = redis.set.mock.calls[1];
    expect(allKey).not.toEqual(activeKey);
  });

  it("drops the cached products of a renamed category, which embed its name", async () => {
    prisma.category.update.mockResolvedValue({ ...row, name: "Minuman" });
    prisma.product.findMany.mockResolvedValue([{ id: "p-1" }, { id: "p-2" }]);

    await service.update(CATEGORY_ID, { name: "Minuman" });

    expect(redis.del).toHaveBeenCalledWith(
      cacheKeys.productDetail("p-1"),
      cacheKeys.productDetail("p-2"),
    );
    // Bumping the version retires every cached product list in one write.
    expect(redis.incrWithTtl).toHaveBeenCalledWith(cacheKeys.productListVersion(), 3600);
  });

  it("deactivates a category that still has products instead of deleting it", async () => {
    prisma.category.update.mockResolvedValue({ ...row, isActive: false });
    prisma.product.findMany.mockResolvedValue([{ id: "p-1" }]);

    await expect(service.setActive(CATEGORY_ID, false)).resolves.toMatchObject({
      isActive: false,
    });
    expect(prisma.category.update).toHaveBeenCalledWith({
      where: { id: CATEGORY_ID },
      data: { isActive: false },
    });
  });

  it("returns a domain error when the category is missing", async () => {
    prisma.category.findUnique.mockResolvedValue(null);

    await expectCategoryError(
      service.getById(CATEGORY_ID),
      AppErrorCode.CATEGORY_NOT_FOUND,
      "Category not found",
    );
  });
});

async function expectCategoryError(
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
