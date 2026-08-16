import type { Sale } from './sale.schema';

export const SALE_EVENTS_EXCHANGE = 'jagoan.events';
export const SALE_EVENTS_EXCHANGE_TYPE = 'topic';
export const SALE_COMPLETED_ROUTING_KEY = 'sale.completed';

// What the relay publishes for one outbox row.
export type SaleCompletedEvent = Omit<Sale, 'createdAt'> & {
  eventId: string;
  eventType: string;
  occurredAt: string; // When the outbox row was written
  traceId: string | null;
  createdAt: string; // ISO
};
