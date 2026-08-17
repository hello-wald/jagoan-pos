import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  SALE_COMPLETED_EVENT,
  SALE_COMPLETED_ROUTING_KEY,
  type SaleCompletedEvent,
} from '@jagoan-pos/contracts';
import type { OutboxRelayEnv } from '../config/env.schema';
import { PostgresService } from '../db/postgres.service';
import { BrokerUnavailableError } from '../rabbitmq/broker-unavailable.error';
import { PublisherService } from '../rabbitmq/publisher.service';
import { OutboxRepository, type OutboxRow } from './outbox.repository';

const ROUTING_KEYS: Record<string, string> = {
  [SALE_COMPLETED_EVENT]: SALE_COMPLETED_ROUTING_KEY,
};

export type TickResult = {
  claimed: number;
  published: number;
  failed: number;
  /** Set when the broker went away mid-tick */
  brokerDown: boolean;
};

@Injectable()
export class RelayService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(RelayService.name);
  private readonly pollIntervalMs: number;
  private readonly batchSize: number;
  private readonly maxAttempts: number;
  private readonly maxBackoffMs: number;

  private timer: NodeJS.Timeout | null = null;
  private stopped = false;
  private backoffMs = 0;

  constructor(
    private readonly db: PostgresService,
    private readonly outbox: OutboxRepository,
    private readonly publisher: PublisherService,
    config: ConfigService<OutboxRelayEnv, true>,
  ) {
    this.pollIntervalMs = config.get('OUTBOX_POLL_INTERVAL_MS', { infer: true });
    this.batchSize = config.get('OUTBOX_BATCH_SIZE', { infer: true });
    this.maxAttempts = config.get('OUTBOX_MAX_ATTEMPTS', { infer: true });
    this.maxBackoffMs = config.get('OUTBOX_MAX_BACKOFF_MS', { infer: true });
  }

  onApplicationBootstrap(): void {
    this.scheduleNext(0);
  }

  onModuleDestroy(): void {
    this.stopped = true;
    if (this.timer) clearTimeout(this.timer);
  }

  /**
   * Drains one batch.
   *
   * Everything happens inside a single transaction, but a broker outage is not
   * allowed to roll it back: messages already confirmed by the broker must have
   * their rows committed as `PUBLISHED`, or the next tick republishes them.
   * Rows the tick never reached stay `PENDING` with `attempts` untouched.
   */
  async tick(): Promise<TickResult> {
    return this.db.withTransaction(async (client) => {
      const rows = await this.outbox.claimPending(client, this.batchSize);
      const published: string[] = [];
      let failed = 0;
      let brokerDown = false;

      for (const row of rows) {
        try {
          await this.publisher.publish(this.toEvent(row), this.routingKeyFor(row));
          published.push(row.id);
        } catch (error) {
          if (error instanceof BrokerUnavailableError) {
            this.logger.warn({ err: error }, 'broker unavailable; pausing batch');
            brokerDown = true;
            break;
          }
          const message = error instanceof Error ? error.message : String(error);
          this.logger.error({ err: error, outboxId: row.id }, 'event rejected');
          await this.outbox.markFailure(client, row.id, message, this.maxAttempts);
          failed += 1;
        }
      }

      await this.outbox.markPublished(client, published);
      return { claimed: rows.length, published: published.length, failed, brokerDown };
    });
  }

  /**
   * Flattens the sale into the envelope root — the eventual ClickHouse consumer
   * reads `JSONEachRow` and cannot address keys nested under `payload`.
   */
  private toEvent(row: OutboxRow): SaleCompletedEvent {
    return {
      ...row.payload,
      eventId: row.id,
      eventType: row.eventType,
      occurredAt: row.createdAt.toISOString(),
      traceId: row.traceId,
    } as SaleCompletedEvent;
  }

  private routingKeyFor(row: OutboxRow): string {
    const key = ROUTING_KEYS[row.eventType];
    if (!key) throw new Error(`No routing key registered for event type "${row.eventType}"`);
    return key;
  }

  private async runLoop(): Promise<void> {
    if (this.stopped) return;

    try {
      const result = await this.tick();
      if (result.claimed > 0) {
        this.logger.log(
          `claimed=${result.claimed} published=${result.published} failed=${result.failed}`,
        );
      }

      if (result.brokerDown) {
        this.scheduleNext(this.nextBackoff());
        return;
      }

      this.backoffMs = 0;
      // A full batch means there is probably more waiting; drain without idling.
      this.scheduleNext(result.claimed === this.batchSize ? 0 : this.pollIntervalMs);
    } catch (error) {
      // Reaching here means the database itself failed. Like a broker outage,
      // that says nothing about any individual message, so no attempt is spent.
      this.logger.error({ err: error }, 'poll tick failed');
      this.scheduleNext(this.nextBackoff());
    }
  }

  private nextBackoff(): number {
    this.backoffMs = Math.min(
      this.backoffMs === 0 ? this.pollIntervalMs : this.backoffMs * 2,
      this.maxBackoffMs,
    );
    return this.backoffMs;
  }

  private scheduleNext(delayMs: number): void {
    if (this.stopped) return;
    // Deliberately not unref'd: the pool connects lazily and shutdown hooks do
    // not hold the loop open, so this timer is the only thing keeping a freshly
    // booted relay alive. `onModuleDestroy` clears it so shutdown still exits.
    this.timer = setTimeout(() => void this.runLoop(), delayMs);
  }
}
