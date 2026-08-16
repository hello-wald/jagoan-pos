import { Injectable } from '@nestjs/common';
import type { PoolClient } from 'pg';

export type OutboxRow = {
  id: string;
  saleId: string;
  merchantId: string;
  eventType: string;
  payload: Record<string, unknown>;
  attempts: number;
  traceId: string | null;
  createdAt: Date;
};

@Injectable()
export class OutboxRepository {
  // Claims a batch of pending rows for this tick.
  async claimPending(client: PoolClient, limit: number): Promise<OutboxRow[]> {
    const { rows } = await client.query<OutboxRow>(
      `SELECT id,
              sale_id     AS "saleId",
              merchant_id AS "merchantId",
              event_type  AS "eventType",
              payload,
              attempts,
              trace_id    AS "traceId",
              created_at  AS "createdAt"
         FROM outbox_events
        WHERE status = 'PENDING'
        ORDER BY created_at
        LIMIT $1
          FOR UPDATE SKIP LOCKED`,
      [limit],
    );
    return rows;
  }

  async markPublished(client: PoolClient, ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    await client.query(
      `UPDATE outbox_events
          SET status = 'PUBLISHED',
              published_at = now(),
              attempts = attempts + 1,
              last_error = NULL
        WHERE id = ANY($1::uuid[])`,
      [ids],
    );
  }

  /**
   * Records a per-message failure. The row stays `PENDING` until it exhausts
   * `maxAttempts`, at which point it flips to `FAILED` so a message that can
   * never be published stops being re-read on every tick.
   */
  async markFailure(
    client: PoolClient,
    id: string,
    error: string,
    maxAttempts: number,
  ): Promise<void> {
    await client.query(
      `UPDATE outbox_events
          SET attempts = attempts + 1,
              last_error = LEFT($2, 500),
              status = CASE WHEN attempts + 1 >= $3 THEN 'FAILED'::outbox_status ELSE status END
        WHERE id = $1`,
      [id, error, maxAttempts],
    );
  }
}
