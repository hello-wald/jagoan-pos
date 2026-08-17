-- One row per sale LINE, sale header denormalised onto each.
-- Header measures fan out: revenue is sum(subtotal), NOT sum(sale_total_amount);
-- transactions are uniqExact(sale_id), NOT count(). Header cols are `sale_`-prefixed.
-- ReplacingMergeTree because delivery is at-least-once; dedup needs FINAL until merge.
CREATE TABLE IF NOT EXISTS sale_lines
(
    -- sale_item_id is the dedup anchor.
    sale_item_id        UUID,
    sale_id             UUID,
    event_id            UUID,

    merchant_id         UUID,
    merchant_name       LowCardinality(String),
    cashier_id          UUID,
    cashier_name        LowCardinality(String),

    -- Header grain: repeated per line. NEVER sum these.
    transaction_number  String,
    status              LowCardinality(String),
    sale_total_quantity UInt32,
    sale_total_amount   UInt64,
    sale_cash_received  UInt64,
    sale_change_amount  UInt64,

    -- Line grain: additive.
    product_id          UUID,
    product_name        String,
    sku                 String,
    unit_price          UInt64,
    quantity            UInt32,
    subtotal            UInt64,

    -- created_at is when the sale committed, not when it was ingested.
    created_at          DateTime64(3, 'UTC'),
    occurred_at         DateTime64(3, 'UTC'),
    trace_id            String,
    ingested_at         DateTime64(3, 'UTC') DEFAULT now64(3)
)
ENGINE = ReplacingMergeTree(ingested_at)
PARTITION BY toYYYYMM(created_at)
ORDER BY (merchant_id, created_at, sale_id, sale_item_id);
