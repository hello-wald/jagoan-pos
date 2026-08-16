import { Injectable, Logger, type OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool, type PoolClient } from 'pg';
import type { OutboxRelayEnv } from '../config/env.schema';

@Injectable()
export class PostgresService implements OnModuleDestroy {
  private readonly logger = new Logger(PostgresService.name);
  private readonly pool: Pool;

  constructor(config: ConfigService<OutboxRelayEnv, true>) {
    this.pool = new Pool({
      connectionString: config.get('TRANSACTIONS_DATABASE_URL', { infer: true }),
      max: config.get('OUTBOX_DATABASE_POOL_MAX', { infer: true }),
    });
    // An idle client erroring out must not take the process down.
    this.pool.on('error', (error) => this.logger.error({ err: error }, 'idle client error'));
  }

  /**
   * Runs `work` inside a transaction, rolling back on any throw. The row locks
   * the relay takes are held only for this call — never across ticks.
   */
  async withTransaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await work(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}
