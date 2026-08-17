import { Injectable, Logger, type OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';
import {
  SALE_EVENTS_EXCHANGE,
  SALE_EVENTS_EXCHANGE_TYPE,
  type SaleCompletedEvent,
} from '@jagoan-pos/contracts';
import type { OutboxRelayEnv } from '../config/env.schema';
import { BrokerUnavailableError } from './broker-unavailable.error';

@Injectable()
export class PublisherService implements OnModuleDestroy {
  private readonly logger = new Logger(PublisherService.name);
  private readonly url: string;

  private connection: amqp.ChannelModel | null = null;
  private channel: amqp.ConfirmChannel | null = null;
  private connecting: Promise<amqp.ConfirmChannel> | null = null;
  private closed = false;

  constructor(config: ConfigService<OutboxRelayEnv, true>) {
    this.url = config.get('RABBITMQ_URL', { infer: true });
  }

  // Publishes one event and waits for the broker's confirm.
  async publish(event: SaleCompletedEvent, routingKey: string): Promise<void> {
    const channel = await this.getChannel();
    const body = Buffer.from(JSON.stringify(event));

    await new Promise<void>((resolve, reject) => {
      channel.publish(
        SALE_EVENTS_EXCHANGE,
        routingKey,
        body,
        {
          persistent: true,
          contentType: 'application/json',
          messageId: event.eventId,
          timestamp: Date.parse(event.occurredAt) || Date.now(),
          type: event.eventType,
        },
        (error) => (error ? reject(this.asBrokerError(error)) : resolve()),
      );
    });
  }

  private async getChannel(): Promise<amqp.ConfirmChannel> {
    if (this.channel) return this.channel;
    // Concurrent callers must share one dial rather than opening a connection each.
    this.connecting ??= this.connect().finally(() => {
      this.connecting = null;
    });
    return this.connecting;
  }

  private async connect(): Promise<amqp.ConfirmChannel> {
    try {
      const connection = await amqp.connect(this.url);
      const channel = await connection.createConfirmChannel();

      // Must agree with every other declarer of this exchange
      await channel.assertExchange(SALE_EVENTS_EXCHANGE, SALE_EVENTS_EXCHANGE_TYPE, {
        durable: true,
      });

      connection.on('error', (error) => this.logger.warn({ err: error }, 'connection error'));
      connection.on('close', () => this.discard('connection closed'));
      channel.on('error', (error) => this.logger.warn({ err: error }, 'channel error'));
      channel.on('close', () => this.discard('channel closed'));

      this.connection = connection;
      this.channel = channel;
      this.logger.log(`connected, publishing to ${SALE_EVENTS_EXCHANGE}`);
      return channel;
    } catch (error) {
      throw this.asBrokerError(error);
    }
  }

  // Drops the cached handles so the next publish redials.
  private discard(reason: string): void {
    if (this.closed || !this.channel) return;
    this.logger.warn(`${reason}; will reconnect on next publish`);
    this.channel = null;
    this.connection = null;
  }

  private asBrokerError(error: unknown): BrokerUnavailableError {
    this.channel = null;
    this.connection = null;
    const message = error instanceof Error ? error.message : String(error);
    return new BrokerUnavailableError(message, { cause: error });
  }

  async onModuleDestroy(): Promise<void> {
    this.closed = true;
    try {
      await this.channel?.close();
      await this.connection?.close();
    } catch (error) {
      this.logger.warn({ err: error }, 'error closing broker connection');
    }
  }
}
