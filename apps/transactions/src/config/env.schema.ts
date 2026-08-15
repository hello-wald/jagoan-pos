import { resolve } from 'node:path';
import { z } from 'zod';

export const ENV_FILE_PATH = resolve(__dirname, '..', '..', '..', '..', '.env');

export const transactionsEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  TRANSACTIONS_HOST: z.string().min(1).default('0.0.0.0'),
  TRANSACTIONS_TCP_PORT: z.coerce.number().int().min(1).max(65535).default(4003),
  TRANSACTIONS_DATABASE_URL: z.string().startsWith('postgresql://', 'must be a postgresql:// url'),
  TRANSACTIONS_DIRECT_URL: z.string().startsWith('postgresql://', 'must be a postgresql:// url'),
  TRANSACTIONS_DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(50).default(5),
  PRODUCTS_HOST: z.string().min(1).default('0.0.0.0'),
  PRODUCTS_TCP_PORT: z.coerce.number().int().min(1).max(65535).default(4002),
  PRODUCTS_RPC_TIMEOUT_MS: z.coerce.number().int().min(100).max(30_000).default(3_000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).optional(),
});

export type TransactionsEnv = z.infer<typeof transactionsEnvSchema>;
