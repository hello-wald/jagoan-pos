-- Second half of the Nullable fix: 005 corrected the WHERE clauses, the SELECT
-- still read Nullable virtuals into non-nullable columns, so a bad message would
-- fail the very insert meant to record it. 004 is fixed at source.
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
