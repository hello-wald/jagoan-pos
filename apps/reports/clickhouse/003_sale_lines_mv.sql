-- Fans items[] into one row per line and casts the String wire fields.
-- Incremental is fine here (row copy, no aggregation) but NOT for rollups.
-- `item.x` is tuple access, `id` is the top-level column, so the two do not clash.
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
-- _error is Nullable and NULL (not '') on success; a bare `_error = ''` is NULL
-- for every good message and silently discards the whole stream.
WHERE ifNull(_error, '') = '';
