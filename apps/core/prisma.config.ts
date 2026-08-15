import { config } from 'dotenv';
import { resolve } from 'node:path';
import { defineConfig } from 'prisma/config';

config({ path: resolve(__dirname, '.env') });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  // Direct, not pooled: migrations take session-scoped advisory locks.
  datasource: { url: process.env.CORE_DIRECT_URL },
});
