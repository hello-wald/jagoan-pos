-- Repairs environments that applied 003/004 with `_error = ''` / `!= ''`.
-- _error is Nullable and NULL on success, so both comparisons yielded NULL and
-- every row was dropped by both views at once, with no exception anywhere.
-- 003/004 are fixed at source, so this is a no-op replay on a fresh setup.
DROP VIEW IF EXISTS sale_lines_mv
;

DROP VIEW IF EXISTS sale_events_errors_mv
;

CREATE MATERIALIZED VIEW sale_lines_mv TO sale_lines AS
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
WHERE ifNull(_error, '') = ''
;

CREATE MATERIALIZED VIEW sale_events_errors_mv TO sale_events_errors AS
SELECT
    _raw_message AS raw,
    _error       AS error,
    now64(3)     AS ingested_at
FROM sale_events_queue
WHERE ifNull(_error, '') != ''
;
