import { resolve } from 'node:path';
import { z } from 'zod';

export const ENV_FILE_PATH = resolve(__dirname, '..', '..', '..', '..', '.env');

export const outboxRelayEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  TRANSACTIONS_DATABASE_URL: z.string().startsWith('postgresql://', 'must be a postgresql:// url'),
  OUTBOX_DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(50).default(2),
  RABBITMQ_URL: z.string().startsWith('amqp', 'must be an amqp:// or amqps:// url'),
  OUTBOX_POLL_INTERVAL_MS: z.coerce.number().int().min(100).max(60_000).default(2_000),
  OUTBOX_BATCH_SIZE: z.coerce.number().int().min(1).max(1_000).default(100),
  OUTBOX_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(100).default(5),
  OUTBOX_MAX_BACKOFF_MS: z.coerce.number().int().min(1_000).max(600_000).default(60_000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).optional(),
});

export type OutboxRelayEnv = z.infer<typeof outboxRelayEnvSchema>;
