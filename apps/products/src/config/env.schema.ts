import { resolve } from "node:path";
import { z } from "zod";

export const ENV_FILE_PATH = resolve(__dirname, "..", "..", "..", "..", ".env");

export const productsEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PRODUCTS_HOST: z.string().min(1).default("0.0.0.0"),
  PRODUCTS_TCP_PORT: z.coerce.number().int().min(1).max(65535).default(4002),
  PRODUCTS_DATABASE_URL: z.string().startsWith("postgresql://", "must be a postgresql:// url"),
  PRODUCTS_DIRECT_URL: z.string().startsWith("postgresql://", "must be a postgresql:// url"),
  PRODUCTS_DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(50).default(5),
  REDIS_URL: z.string().startsWith("redis", "must be a redis:// or rediss:// url"),
  SUPABASE_PRODUCTS_URL: z.url("must be a valid Supabase project URL"),
  SUPABASE_PRODUCTS_SERVICE_ROLE_KEY: z.string().min(1),
  PRODUCTS_STORAGE_BUCKET: z.string().trim().min(3).max(63).default("product-images"),
  PRODUCT_IMAGE_MAX_BYTES: z.coerce
    .number()
    .int()
    .positive()
    .max(20 * 1024 * 1024)
    .default(5 * 1024 * 1024),
  PRODUCT_IMAGE_SIGNED_URL_TTL_SECONDS: z.coerce.number().int().min(60).max(3600).default(900),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).optional(),
});

export type ProductsEnv = z.infer<typeof productsEnvSchema>;
