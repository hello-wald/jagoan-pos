import { UNCATEGORIZED, createProductSchema, productListQuerySchema } from "./product.schema";

const CATEGORY_ID = "2f9d1c6e-6b8a-4f5d-9a3e-1c0b7e4d2a11";
const base = { name: "Mineral Water", sku: "WATER-600ML", price: 5000 };

describe("createProductSchema", () => {
  it("accepts a product with no category at all", () => {
    expect(createProductSchema.safeParse(base).success).toBe(true);
  });

  it("accepts an explicit null, which clears the category", () => {
    expect(createProductSchema.safeParse({ ...base, categoryId: null }).success).toBe(true);
  });

  // The form's empty option must send null, not ''. Sending '' fails here, and
  // it fails silently at the resolver, before the request is ever made.
  it("rejects an empty string in place of a category id", () => {
    expect(createProductSchema.safeParse({ ...base, categoryId: "" }).success).toBe(false);
  });

  it("rejects a category id that is not a uuid", () => {
    expect(createProductSchema.safeParse({ ...base, categoryId: "Beverages" }).success).toBe(false);
  });
});

describe("productListQuerySchema", () => {
  it("accepts a category id and the uncategorized sentinel", () => {
    expect(productListQuerySchema.safeParse({ categoryId: CATEGORY_ID }).success).toBe(true);
    expect(productListQuerySchema.safeParse({ categoryId: UNCATEGORIZED }).success).toBe(true);
  });

  it("rejects any other free-text category filter", () => {
    expect(productListQuerySchema.safeParse({ categoryId: "Beverages" }).success).toBe(false);
  });
});
