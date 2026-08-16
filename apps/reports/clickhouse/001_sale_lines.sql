-- The landing table: one row per sale LINE, with the sale header denormalized
-- onto every line. Chosen over a sales + sale_items pair because ClickHouse is
-- columnar (unread columns cost nothing) and it removes joins entirely.
--
-- FAN-OUT WARNING. Because the grain is the line, header measures repeat:
-- a 3-line sale carries its sale_total_amount three times. Therefore
--     revenue      = sum(subtotal)         NOT sum(sale_total_amount)
--     transactions = uniqExact(sale_id)    NOT count()
-- Header columns are prefixed `sale_` so a wrong aggregate reads as suspicious.
--
-- ReplacingMergeTree because delivery is at-least-once: a redelivered message
-- reproduces an identical row, which collapses on merge. Note that dedup is
-- only guaranteed after a merge, so reads that must be exact need FINAL.
CREATE TABLE IF NOT EXISTS sale_lines
(
    -- Identity. sale_item_id is unique per line and is the dedup anchor.
    sale_item_id        UUID,
    sale_id             UUID,
    event_id            UUID,

    -- Merchant / actor context.
    merchant_id         UUID,
    merchant_name       LowCardinality(String),
    cashier_id          UUID,
    cashier_name        LowCardinality(String),

    -- Sale header grain: repeated on every line of the sale. NEVER sum these.
    transaction_number  String,
    status              LowCardinality(String),
    sale_total_quantity UInt32,
    sale_total_amount   UInt64,
    sale_cash_received  UInt64,
    sale_change_amount  UInt64,

    -- Line grain: safely additive.
    product_id          UUID,
    product_name        String,
    sku                 String,
    unit_price          UInt64,
    quantity            UInt32,
    subtotal            UInt64,

    -- Time. created_at is when the sale committed, not when we ingested it.
    created_at          DateTime64(3, 'UTC'),
    occurred_at         DateTime64(3, 'UTC'),
    trace_id            String,
    ingested_at         DateTime64(3, 'UTC') DEFAULT now64(3)
)
ENGINE = ReplacingMergeTree(ingested_at)
PARTITION BY toYYYYMM(created_at)
-- merchant_id leads because every merchant-facing query filters on it first.
ORDER BY (merchant_id, created_at, sale_id, sale_item_id);
