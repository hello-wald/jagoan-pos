# Transactions Service

Transactions Service owns per-merchant stock and sales. It uses a separate
PostgreSQL database and communicates with the API Gateway over Nest TCP.

Bounded context: `products` answers *what can be sold* (global, admin-owned);
this service answers *how much this merchant has, and what got sold*. Stock lives
here rather than with the catalog because a sale must decrement stock in the same
commit that writes it, and that commit cannot span two databases.

## Environment

```env
TRANSACTIONS_HOST=0.0.0.0
TRANSACTIONS_TCP_PORT=4003
TRANSACTIONS_DATABASE_URL=postgresql://... # pooled runtime URL
TRANSACTIONS_DIRECT_URL=postgresql://...   # direct URL, migrations only
PRODUCTS_HOST=products                     # checkout resolves catalog prices
PRODUCTS_TCP_PORT=4002
PRODUCTS_RPC_TIMEOUT_MS=3000
```

`TRANSACTIONS_DATABASE_URL` must point to the database owned by this service. In
production, use the pooled connection URL from the dedicated Supabase project.

## Database migration

```bash
cd apps/transactions
TRANSACTIONS_DIRECT_URL='postgresql://...' npx prisma migrate deploy
```

## Gateway API

| Method | Path | Roles | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/cashier/checkout` | `CASHIER`, `OWNER` | Record a sale |

Merchant and cashier identity come from the verified JWT, never the request
body. The client sends only product ids and quantities — prices are read from
the catalog at checkout time, so a tampered terminal cannot set its own total.

## The checkout commit

One transaction writes all of the following, or none of it:

1. `transaction_counters` — bump the per-merchant daily sequence, giving a
   gap-free `INV/YYYYMMDD/NNNN`.
2. `inventories` — conditional decrement per line. The `stockQuantity >= quantity`
   guard is in the WHERE clause, so check-and-decrement is a single statement with
   no race window. Lines are processed in product-id order so concurrent carts
   cannot deadlock.
3. `sales` + `sale_items` — with product name, SKU, and unit price snapshotted.
4. `stock_movements` — one `SALE` row per line.
5. `outbox_events` — one `SALE_COMPLETED` row.

Insufficient stock on any line rejects the whole sale and names the offending
product; nothing is written.

## Idempotency

`(merchant_id, idempotency_key)` is unique. A replayed key returns the original
sale without writing. If two requests with the same key race, the loser catches
the unique violation and returns the winner's sale rather than an error.

## Outbox

`outbox_events` is written inside the sale's transaction — that is the
transactional outbox pattern, and it is what makes "sale recorded" and "event
emitted" atomic without a distributed transaction.

The table is shaped for Debezium's Outbox Event Router, which tails the WAL.
There is deliberately **no `status` or `published_at` column** and no polling
publisher: those belong to a relay-based design, and under CDC they would only
add UPDATE noise for the connector to filter out. `aggregate_id` is not unique,
so a sale can later emit `SALE_VOIDED` alongside `SALE_COMPLETED`.

Payloads are fully denormalized so the downstream OLAP consumer never needs to
call back into this service.

CDC itself is not yet wired up. That work needs `wal_level=logical`, a
publication scoped to `outbox_events`, Kafka Connect, and the connector config.
Note Debezium requires the **direct** Supabase connection — logical replication
cannot run through the Supavisor pooler.

## Stock movements

`inventories` holds current sellable quantity and is the row cashiers contend on.
`stock_movements` is the append-only ledger, and **all stock reporting reads must
use it** rather than aggregating over `inventories` (FRD §E4).

All manual stock change is owner-only. A cashier affects stock solely by selling.

| Reason | Actor | Delta |
| --- | --- | --- |
| `SALE` | Cashier, via checkout only | Negative |
| `RECEIVE` | **Owner only** | Positive only |
| `ADJUSTMENT` | **Owner only** | Signed |
| `INITIAL` | System/seed | Positive |

Only `SALE` is written today; the receive and adjust endpoints are not yet built.
When they are, both sit behind one `@Roles('OWNER')` guard.

This is narrower than the FRD, which grants cashiers `adjust` in the permission
matrix (§3.1) and receive in US-4.1. Both are superseded. It also makes FRD open
question #4 — whether cashier receive-stock needs owner approval — moot.

`RECEIVE` and `ADJUSTMENT` remain separate reasons despite sharing a guard:
restock volume and shrinkage are distinct metrics downstream, and a receive may
only ever be positive while an adjustment is signed.

## Seeding stock locally

There is no stock-write endpoint yet, so seed directly to exercise checkout:

```sql
INSERT INTO inventories (id, merchant_id, product_id, stock_quantity, created_at, updated_at)
VALUES (gen_random_uuid(), '<merchant-uuid>', '<product-uuid>', 100, now(), now());
```
