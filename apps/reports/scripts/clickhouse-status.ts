/**
 * Read-only status check against ClickHouse.
 */
import { resolve } from 'node:path';
import { config as loadEnvFile } from 'dotenv';
import { createClient } from '@clickhouse/client';

loadEnvFile({ path: resolve(__dirname, '..', '..', '..', '.env') });

async function main(): Promise<void> {
  const client = createClient({
    url: process.env.CLICKHOUSE_URL,
    database: process.env.CLICKHOUSE_DATABASE ?? 'default',
    username: process.env.CLICKHOUSE_USERNAME ?? 'default',
    password: process.env.CLICKHOUSE_PASSWORD ?? '',
  });

  const ask = async (label: string, query: string): Promise<void> => {
    try {
      const result = await client.query({ query, format: 'JSONEachRow' });
      const rows = await result.json();
      console.log(`\n### ${label}`);
      console.log(rows.length === 0 ? '  (none)' : JSON.stringify(rows, null, 2));
    } catch (error) {
      console.log(`\n### ${label}`);
      console.log(`  ERROR: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  await ask(
    'migrations recorded',
    'SELECT name, toString(applied_at) AS applied_at FROM schema_migrations ORDER BY name',
  );

  await ask(
    'objects present',
    `SELECT name, engine FROM system.tables
      WHERE database = currentDatabase()
        AND name IN ('sale_lines','sale_events_queue','sale_lines_mv',
                     'sale_events_errors','sale_events_errors_mv','schema_migrations')
      ORDER BY name`,
  );

  await ask(
    'rabbitmq consumers attached',
    `SELECT database, table, queue_name, channel_id, is_currently_used
       FROM system.rabbitmq_consumers`,
  );

  await ask(
    'refreshable rollups',
    `SELECT view, status, toString(last_success_time) AS last_success,
            toString(next_refresh_time) AS next_refresh, exception
       FROM system.view_refreshes ORDER BY view`,
  );

  await ask(
    'rollup row counts',
    `SELECT 'sales_daily' AS t, count() AS rows FROM sales_daily
      UNION ALL SELECT 'sales_hourly', count() FROM sales_hourly
      UNION ALL SELECT 'product_daily', count() FROM product_daily
      UNION ALL SELECT 'platform_daily', count() FROM platform_daily`,
  );

  await ask('sale_lines row count', 'SELECT count() AS rows FROM sale_lines');
  await ask(
    'sale_lines distinct sales',
    'SELECT uniqExact(sale_id) AS sales, uniqExact(merchant_id) AS merchants FROM sale_lines',
  );
  await ask(
    'parse errors',
    'SELECT count() AS errors, max(toString(ingested_at)) AS latest FROM sale_events_errors',
  );
  await ask(
    'recent clickhouse errors mentioning rabbit/amqp',
    `SELECT name, value, toString(last_error_time) AS at
       FROM system.errors
      WHERE value > 0 AND (lower(name) LIKE '%rabbit%' OR lower(name) LIKE '%amqp%')
      ORDER BY last_error_time DESC LIMIT 10`,
  );

  await client.close();
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
