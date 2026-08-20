import { createHash } from "crypto";

const PREFIX = "jagoan";

export const cacheKeys = {
  cashiers: (merchantId: string) => `${PREFIX}:core:cashiers:${merchantId}`,
  authLoginFailures: (email: string) => {
    const hash = createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
    return `${PREFIX}:core:auth:login-fail:${hash}`;
  },
  productDetail: (productId: string) => `${PREFIX}:products:detail:${productId}`,
  productListVersion: () => `${PREFIX}:products:list-version`,
  productList: (version: string, queryHash: string) =>
    `${PREFIX}:products:list:${version}:${queryHash}`,
  categoryList: (scope: string) => `${PREFIX}:products:categories:${scope}`,
} as const;
