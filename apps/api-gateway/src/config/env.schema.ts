import { resolve } from 'node:path';
import { z } from 'zod';

export const ENV_FILE_PATH = resolve(__dirname, '..', '..', '..', '..', '.env');

export const gatewayEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  GATEWAY_PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  CORE_HOST: z.string().min(1).default('0.0.0.0'),
  CORE_TCP_PORT: z.coerce.number().int().min(1).max(65535).default(4001),
  PRODUCTS_HOST: z.string().min(1).default('0.0.0.0'),
  PRODUCTS_TCP_PORT: z.coerce.number().int().min(1).max(65535).default(4002),
  TRANSACTIONS_HOST: z.string().min(1).default('0.0.0.0'),
  TRANSACTIONS_TCP_PORT: z.coerce.number().int().min(1).max(65535).default(4003),
  JWT_SECRET: z.string().min(32),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).optional(),
});

export type GatewayEnv = z.infer<typeof gatewayEnvSchema>;
