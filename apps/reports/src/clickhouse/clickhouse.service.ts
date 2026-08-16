import { Injectable, Logger, type OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, type ClickHouseClient } from '@clickhouse/client';
import type { ReportsEnv } from '../config/env.schema';

@Injectable()
export class ClickHouseService implements OnModuleDestroy {
  private readonly logger = new Logger(ClickHouseService.name);
  private readonly client: ClickHouseClient;

  constructor(config: ConfigService<ReportsEnv, true>) {
    this.client = createClient({
      url: config.get('CLICKHOUSE_URL', { infer: true }),
      database: config.get('CLICKHOUSE_DATABASE', { infer: true }),
      username: config.get('CLICKHOUSE_USERNAME', { infer: true }),
      password: config.get('CLICKHOUSE_PASSWORD', { infer: true }),
      request_timeout: config.get('CLICKHOUSE_QUERY_TIMEOUT_MS', { infer: true }),
    });
  }

  // `params` bind to `{name:Type}` placeholders server-side; every value here is
  // caller-supplied, so the SQL is never string-built.
  async query<T>(query: string, params: Record<string, unknown> = {}): Promise<T[]> {
    const result = await this.client.query({
      query,
      query_params: params,
      format: 'JSONEachRow',
    });
    return result.json<T>();
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.client.close();
    } catch (error) {
      this.logger.warn({ err: error }, 'error closing clickhouse client');
    }
  }
}
