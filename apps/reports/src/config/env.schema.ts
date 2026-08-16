import { resolve } from 'node:path';
import { z } from 'zod';

export const ENV_FILE_PATH = resolve(__dirname, '..', '..', '..', '..', '.env');

export const reportsEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  REPORTS_HOST: z.string().min(1).default('0.0.0.0'),
  REPORTS_TCP_PORT: z.coerce.number().int().min(1).max(65535).default(4004),
  CLICKHOUSE_URL: z.string().startsWith('http', 'must be an http(s):// url'),
  CLICKHOUSE_DATABASE: z.string().min(1).default('default'),
  CLICKHOUSE_USERNAME: z.string().min(1).default('default'),
  CLICKHOUSE_PASSWORD: z.string(),
  // Stops a wide date range from hanging a request.
  CLICKHOUSE_QUERY_TIMEOUT_MS: z.coerce.number().int().min(100).max(60_000).default(10_000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).optional(),
});

export type ReportsEnv = z.infer<typeof reportsEnvSchema>;
