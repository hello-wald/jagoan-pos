import { SALE_COMPLETED_EVENT, SALE_COMPLETED_ROUTING_KEY } from '@jagoan-pos/contracts';
import type { ConfigService } from '@nestjs/config';
import type { PoolClient } from 'pg';
import type { PostgresService } from '../db/postgres.service';
import { BrokerUnavailableError } from '../rabbitmq/broker-unavailable.error';
import type { PublisherService } from '../rabbitmq/publisher.service';
import { OutboxRepository, type OutboxRow } from './outbox.repository';
import { RelayService } from './relay.service';

const MAX_ATTEMPTS = 3;
const SALE_ID = 'c3333333-3333-4333-8333-333333333333';
const MERCHANT_ID = '2f1c4a5e-0b8d-4c3a-9f21-6b7d8e9a0c11';

type StoredRow = OutboxRow & {
  status: 'PENDING' | 'PUBLISHED' | 'FAILED';
  lastError: string | null;
};

function storedRow(id: string, overrides: Partial<StoredRow> = {}): StoredRow {
  return {
    id,
    saleId: SALE_ID,
    merchantId: MERCHANT_ID,
    eventType: SALE_COMPLETED_EVENT,
    payload: { id: SALE_ID, merchantId: MERCHANT_ID, totalAmount: 35_000, items: [] },
    attempts: 0,
    traceId: null,
    createdAt: new Date('2026-08-16T03:00:00.000Z'),
    status: 'PENDING',
    lastError: null,
    ...overrides,
  };
}

// Stands in for the table, so assertions are about row state, not calls made.
class FakeOutbox extends OutboxRepository {
  constructor(public rows: StoredRow[]) {
    super();
  }

  override async claimPending(_client: PoolClient, limit: number): Promise<OutboxRow[]> {
    return this.rows.filter((row) => row.status === 'PENDING').slice(0, limit);
  }

  override async markPublished(_client: PoolClient, ids: string[]): Promise<void> {
    for (const row of this.rows.filter((candidate) => ids.includes(candidate.id))) {
      row.status = 'PUBLISHED';
      row.attempts += 1;
      row.lastError = null;
    }
  }

  override async markFailure(
    _client: PoolClient,
    id: string,
    error: string,
    maxAttempts: number,
  ): Promise<void> {
    const row = this.rows.find((candidate) => candidate.id === id);
    if (!row) return;
    // Mirrors the SQL: both `attempts` refs read the pre-update value.
    if (row.attempts + 1 >= maxAttempts) row.status = 'FAILED';
    row.attempts += 1;
    row.lastError = error;
  }

  byId(id: string): StoredRow {
    const row = this.rows.find((candidate) => candidate.id === id);
    if (!row) throw new Error(`no row ${id}`);
    return row;
  }
}

const db = {
  withTransaction: <T>(work: (client: PoolClient) => Promise<T>) => work({} as PoolClient),
} as PostgresService;

const config = {
  get: (key: string) =>
    ({
      OUTBOX_POLL_INTERVAL_MS: 2_000,
      OUTBOX_BATCH_SIZE: 100,
      OUTBOX_MAX_ATTEMPTS: MAX_ATTEMPTS,
      OUTBOX_MAX_BACKOFF_MS: 60_000,
    })[key],
} as unknown as ConfigService<never, true>;

function buildRelay(outbox: FakeOutbox, publish: jest.Mock) {
  const publisher = { publish } as unknown as PublisherService;
  return new RelayService(db, outbox, publisher, config);
}

describe('RelayService.tick', () => {
  it('publishes each pending row and marks exactly those rows PUBLISHED', async () => {
    const outbox = new FakeOutbox([storedRow('row-1'), storedRow('row-2')]);
    const publish = jest.fn().mockResolvedValue(undefined);

    const result = await buildRelay(outbox, publish).tick();

    expect(result).toEqual({ claimed: 2, published: 2, failed: 0, brokerDown: false });
    expect(outbox.rows.map((row) => row.status)).toEqual(['PUBLISHED', 'PUBLISHED']);
    expect(publish).toHaveBeenCalledWith(
      expect.objectContaining({ eventId: 'row-1', eventType: SALE_COMPLETED_EVENT }),
      SALE_COMPLETED_ROUTING_KEY,
    );
  });

  it('flattens the sale into the envelope root rather than nesting it under payload', async () => {
    const outbox = new FakeOutbox([storedRow('row-1')]);
    const publish = jest.fn().mockResolvedValue(undefined);

    await buildRelay(outbox, publish).tick();

    const [event] = publish.mock.calls[0] as [Record<string, unknown>];
    expect(event).toMatchObject({
      totalAmount: 35_000,
      merchantId: MERCHANT_ID,
      eventId: 'row-1',
      occurredAt: '2026-08-16T03:00:00.000Z',
      traceId: null,
    });
    expect(event.payload).toBeUndefined();
    // The envelope has to survive a JSON round trip.
    expect(() => JSON.stringify(event)).not.toThrow();
  });

  // An outage must cost the backlog nothing.
  it('leaves rows PENDING with attempts untouched when the broker is unavailable', async () => {
    const outbox = new FakeOutbox([storedRow('row-1'), storedRow('row-2')]);
    const publish = jest.fn().mockRejectedValue(new BrokerUnavailableError('ECONNREFUSED'));

    const result = await buildRelay(outbox, publish).tick();

    expect(result).toEqual({ claimed: 2, published: 0, failed: 0, brokerDown: true });
    expect(outbox.byId('row-1')).toMatchObject({ status: 'PENDING', attempts: 0, lastError: null });
    expect(outbox.byId('row-2')).toMatchObject({ status: 'PENDING', attempts: 0 });
    // Stops at the first outage rather than walking the batch.
    expect(publish).toHaveBeenCalledTimes(1);
  });

  it('commits rows already confirmed before the broker dropped mid-batch', async () => {
    const outbox = new FakeOutbox([storedRow('row-1'), storedRow('row-2')]);
    const publish = jest
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new BrokerUnavailableError('socket closed'));

    const result = await buildRelay(outbox, publish).tick();

    expect(result).toMatchObject({ published: 1, brokerDown: true });
    // Rolling back would republish a message the broker already took.
    expect(outbox.byId('row-1').status).toBe('PUBLISHED');
    expect(outbox.byId('row-2')).toMatchObject({ status: 'PENDING', attempts: 0 });
  });

  it('increments attempts and records last_error when a message is rejected', async () => {
    const outbox = new FakeOutbox([storedRow('row-1')]);
    const publish = jest.fn().mockRejectedValue(new Error('Do not know how to serialize a BigInt'));

    const result = await buildRelay(outbox, publish).tick();

    expect(result).toMatchObject({ published: 0, failed: 1, brokerDown: false });
    expect(outbox.byId('row-1')).toMatchObject({
      status: 'PENDING',
      attempts: 1,
      lastError: 'Do not know how to serialize a BigInt',
    });
  });

  it('flips a row to FAILED once it exhausts max attempts', async () => {
    const outbox = new FakeOutbox([storedRow('row-1', { attempts: MAX_ATTEMPTS - 1 })]);
    const publish = jest.fn().mockRejectedValue(new Error('malformed'));

    await buildRelay(outbox, publish).tick();

    expect(outbox.byId('row-1')).toMatchObject({ status: 'FAILED', attempts: MAX_ATTEMPTS });
    // FAILED drops out of the scan, so a poison message cannot loop.
    expect(await outbox.claimPending({} as PoolClient, 100)).toHaveLength(0);
  });

  it('rejects an event type that has no routing key instead of publishing it nowhere', async () => {
    const outbox = new FakeOutbox([storedRow('row-1', { eventType: 'SALE_VOIDED' })]);
    const publish = jest.fn().mockResolvedValue(undefined);

    const result = await buildRelay(outbox, publish).tick();

    expect(publish).not.toHaveBeenCalled();
    expect(result).toMatchObject({ failed: 1 });
    expect(outbox.byId('row-1').lastError).toContain('SALE_VOIDED');
  });

  it('is a no-op when nothing is pending', async () => {
    const outbox = new FakeOutbox([storedRow('row-1', { status: 'PUBLISHED' })]);
    const publish = jest.fn();

    const result = await buildRelay(outbox, publish).tick();

    expect(result).toEqual({ claimed: 0, published: 0, failed: 0, brokerDown: false });
    expect(publish).not.toHaveBeenCalled();
  });
});
