// Applies clickhouse/*.sql in filename order, once each, tracked in
// schema_migrations. DDL is not transactional: stop at the first failure and
// re-run after fixing.
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { config as loadEnvFile } from 'dotenv';
import { createClient } from '@clickhouse/client';
import { z } from 'zod';
import { brokerPlaceholders, redact, statementsIn, substitute } from './migrate-helpers';

const ENV_FILE_PATH = resolve(__dirname, '..', '..', '..', '.env');
const MIGRATIONS_DIR = resolve(__dirname, '..', 'clickhouse');

const envSchema = z.object({
  CLICKHOUSE_URL: z.string().startsWith('http', 'must be an http(s):// url'),
  CLICKHOUSE_DATABASE: z.string().min(1).default('default'),
  CLICKHOUSE_USERNAME: z.string().min(1).default('default'),
  CLICKHOUSE_PASSWORD: z.string(),
  RABBITMQ_URL: z.string().startsWith('amqp', 'must be an amqp:// or amqps:// url'),
});

async function main(): Promise<void> {
  loadEnvFile({ path: ENV_FILE_PATH });
  const env = envSchema.parse(process.env);
  const placeholders = brokerPlaceholders(env.RABBITMQ_URL);
  const secrets = [placeholders.RABBITMQ_PASSWORD, env.CLICKHOUSE_PASSWORD];

  const client = createClient({
    url: env.CLICKHOUSE_URL,
    database: env.CLICKHOUSE_DATABASE,
    username: env.CLICKHOUSE_USERNAME,
    password: env.CLICKHOUSE_PASSWORD,
  });

  try {
    await client.command({
      query: `CREATE TABLE IF NOT EXISTS schema_migrations (
                name String,
                applied_at DateTime64(3, 'UTC') DEFAULT now64(3)
              ) ENGINE = MergeTree ORDER BY name`,
    });

    const appliedRows = await client.query({
      query: 'SELECT name FROM schema_migrations',
      format: 'JSONEachRow',
    });
    const applied = new Set((await appliedRows.json<{ name: string }>()).map((row) => row.name));

    const files = readdirSync(MIGRATIONS_DIR)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    let ran = 0;
    for (const file of files) {
      if (applied.has(file)) {
        console.log(`skip  ${file}`);
        continue;
      }

      const sql = substitute(readFileSync(resolve(MIGRATIONS_DIR, file), 'utf8'), placeholders);
      for (const query of statementsIn(sql)) {
        try {
          await client.command({ query });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          throw new Error(`${file}: ${redact(message, secrets)}`);
        }
      }

      await client.insert({
        table: 'schema_migrations',
        values: [{ name: file }],
        format: 'JSONEachRow',
      });
      console.log(`apply ${file}`);
      ran += 1;
    }

    console.log(ran === 0 ? 'nothing to apply' : `applied ${ran} migration(s)`);
  } finally {
    await client.close();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
