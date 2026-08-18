import { resolve } from 'node:path';
import { z } from 'zod';

export const ENV_FILE_PATH = resolve(__dirname, '..', '..', '..', '..', '.env');

export const analyticsEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  ANALYTICS_HOST: z.string().min(1).default('0.0.0.0'),
  ANALYTICS_TCP_PORT: z.coerce.number().int().min(1).max(65535).default(4005),

  GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY is required'),
  GEMINI_MODEL: z.string().min(1).default('gemini-2.5-flash-lite'),
  AI_MAX_TOOL_CALLS: z.coerce.number().int().min(1).max(3).default(3),
  AI_MAX_MESSAGE_LENGTH: z.coerce.number().int().min(100).max(4000).default(2000),
  AI_MAX_RANGE_DAYS: z.coerce.number().int().min(1).max(366).default(92),

  REPORTS_HOST: z.string().min(1).default('0.0.0.0'),
  REPORTS_TCP_PORT: z.coerce.number().int().min(1).max(65535).default(4004),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).optional(),
});

export type AnalyticsEnv = z.infer<typeof analyticsEnvSchema>;
