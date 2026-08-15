import { config } from 'dotenv';
import 'dotenv/config';
import { resolve } from 'node:path';
import { defineConfig } from 'prisma/config';

config({ path: resolve(__dirname, '..', '..', '.env') });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: {
    url: process.env.TRANSACTIONS_DIRECT_URL,
  },
});
