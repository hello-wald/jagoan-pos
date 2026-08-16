-- Second half of the Nullable fix. 005 corrected the WHERE clauses; the SELECT
-- list still read _raw_message and _error straight into non-nullable String
-- columns. A malformed message would then fail the very insert meant to record
-- it, losing the diagnostic exactly when it is needed.
--
-- 004 is corrected at source too, so this is a no-op replay on a fresh setup.
DROP VIEW IF EXISTS sale_events_errors_mv
;

CREATE MATERIALIZED VIEW sale_events_errors_mv TO sale_events_errors AS
SELECT
    ifNull(_raw_message, '') AS raw,
    ifNull(_error, '')       AS error,
    now64(3)                 AS ingested_at
FROM sale_events_queue
WHERE ifNull(_error, '') != ''
;
