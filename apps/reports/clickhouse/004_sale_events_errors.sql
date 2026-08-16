-- Without this, a message ClickHouse cannot parse is dropped with no trace:
-- rabbitmq_handle_error_mode='stream' keeps the stream healthy by diverting bad
-- messages instead of throwing, which means silence is the default failure mode.
-- Anything landing here is a genuine contract mismatch between the relay's
-- envelope and the queue table's columns.
CREATE TABLE IF NOT EXISTS sale_events_errors
(
    raw        String,
    error      String,
    ingested_at DateTime64(3, 'UTC') DEFAULT now64(3)
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(ingested_at)
ORDER BY ingested_at
-- These are for debugging, not history; do not keep them forever.
TTL toDateTime(ingested_at) + INTERVAL 30 DAY
;

CREATE MATERIALIZED VIEW IF NOT EXISTS sale_events_errors_mv TO sale_events_errors AS
SELECT
    -- Both virtuals are Nullable; the target columns are not, so coalesce or
    -- the insert that reports a failure can itself fail.
    ifNull(_raw_message, '') AS raw,
    ifNull(_error, '')       AS error,
    now64(3)                 AS ingested_at
FROM sale_events_queue
-- Mirror of the filter in 003: _error is Nullable, so `!= ''` is NULL rather
-- than false on success and would discard failures too.
WHERE ifNull(_error, '') != '';
