import { resolve } from 'node:path';
import { z } from 'zod';

/** The single repo-root .env, resolved from dist/ rather than cwd. */
export const ENV_FILE_PATH = resolve(__dirname, '..', '..', '..', '..', '.env');

export const coreEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  CORE_HOST: z.string().min(1).default('0.0.0.0'),
  CORE_TCP_PORT: z.coerce.number().int().min(1).max(65535).default(4001),
  // Pooled (Supavisor, 6543) at runtime.
  CORE_DATABASE_URL: z.string().startsWith('postgresql://', 'must be a postgresql:// url'),
  // Direct (5432) for Prisma Migrate, which needs advisory locks that pooling breaks.
  CORE_DIRECT_URL: z.string().startsWith('postgresql://', 'must be a postgresql:// url'),
  CORE_DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(50).default(5),
  REDIS_URL: z.string().min(1),
  // 32 chars is the floor for an HS256 signing key.
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN_SECONDS: z.coerce.number().int().min(60).default(3600),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).optional(),
});

export type CoreEnv = z.infer<typeof coreEnvSchema>;
