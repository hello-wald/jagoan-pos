-- handle_error_mode='stream' diverts bad messages instead of throwing, so
-- without this a malformed message vanishes silently.
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
    -- Both virtuals are Nullable, the target columns are not.
    ifNull(_raw_message, '') AS raw,
    ifNull(_error, '')       AS error,
    now64(3)                 AS ingested_at
FROM sale_events_queue
-- Mirrors 003: _error is Nullable, so a bare `!= ''` discards everything.
WHERE ifNull(_error, '') != '';
