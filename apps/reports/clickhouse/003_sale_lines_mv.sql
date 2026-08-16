-- Fans each sale's items[] into one row per line and casts the String-typed
-- wire fields into their real types.
--
-- This MV is incremental, which is correct HERE because it is a straight row
-- copy — no aggregation. Incremental MVs must NOT be used for rollups off this
-- table: they fire per inserted block and never observe ReplacingMergeTree's
-- dedup, so a redelivered message would permanently inflate any SUM. Rollups
-- belong in refreshable views running FINAL.
--
-- `item.x` is tuple-element access and `id` is the top-level column, so the two
-- `id`s do not collide. Rows that failed to parse are excluded here and picked
-- up by 004 instead.
CREATE MATERIALIZED VIEW IF NOT EXISTS sale_lines_mv TO sale_lines AS
SELECT
    toUUID(item.id)        AS sale_item_id,
    toUUID(id)             AS sale_id,
    toUUID(eventId)        AS event_id,

    toUUID(merchantId)     AS merchant_id,
    merchantName           AS merchant_name,
    toUUID(cashierId)      AS cashier_id,
    cashierName            AS cashier_name,

    transactionNumber      AS transaction_number,
    status                 AS status,
    totalQuantity          AS sale_total_quantity,
    totalAmount            AS sale_total_amount,
    cashReceived           AS sale_cash_received,
    changeAmount           AS sale_change_amount,

    toUUID(item.productId) AS product_id,
    item.productName       AS product_name,
    item.sku               AS sku,
    item.unitPrice         AS unit_price,
    item.quantity          AS quantity,
    item.subtotal          AS subtotal,

    parseDateTime64BestEffort(createdAt, 3, 'UTC')  AS created_at,
    parseDateTime64BestEffort(occurredAt, 3, 'UTC') AS occurred_at,
    traceId                AS trace_id,
    now64(3)               AS ingested_at
FROM sale_events_queue
ARRAY JOIN items AS item
-- _error is Nullable(String) and is NULL (not '') on success. A bare
-- `_error = ''` evaluates to NULL for every good message, which silently
-- discards the entire stream, so the NULL case must be handled explicitly.
WHERE ifNull(_error, '') = '';
