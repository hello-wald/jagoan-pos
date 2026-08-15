import { z } from 'zod';

export const coreEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  CORE_HOST: z.string().min(1).default('0.0.0.0'),
  CORE_TCP_PORT: z.coerce.number().int().min(1).max(65535).default(4001),
  // Pooled connection (Supavisor, port 6543). Used at runtime.
  CORE_DATABASE_URL: z.string().startsWith('postgresql://', 'must be a postgresql:// url'),
  // Direct connection (port 5432). Used only by Prisma Migrate, which needs
  // session-scoped advisory locks that transaction pooling breaks.
  CORE_DIRECT_URL: z.string().startsWith('postgresql://', 'must be a postgresql:// url'),
  CORE_DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(50).default(5),
  REDIS_URL: z.string().min(1),
  // 32 chars is the floor for an HS256 signing key.
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN_SECONDS: z.coerce.number().int().min(60).default(3600),
  LOGIN_MAX_ATTEMPTS: z.coerce.number().int().min(1).default(5),
  LOGIN_ATTEMPT_WINDOW_SECONDS: z.coerce.number().int().min(60).default(900),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).optional(),
});

export type CoreEnv = z.infer<typeof coreEnvSchema>;
