-- Buckets by the merchant's local day instead of UTC. created_at is UTC, so
-- toDate() put a 20:00 UTC sale on the previous WIB day, disagreeing with the
-- transaction numbers checkout already books in Asia/Jakarta. Worse for hourly:
-- UTC hour-of-day shifts every peak by 7 hours, making US-5.4 misleading.
-- Targets are fully replaced each refresh, so no backfill is needed.
DROP VIEW IF EXISTS sales_daily_mv
;
DROP VIEW IF EXISTS sales_hourly_mv
;
DROP VIEW IF EXISTS product_daily_mv
;
DROP VIEW IF EXISTS platform_daily_mv
;

CREATE MATERIALIZED VIEW sales_daily_mv
REFRESH EVERY 5 MINUTE TO sales_daily AS
SELECT
    merchant_id,
    toDate(created_at, 'Asia/Jakarta') AS day,
    sum(subtotal)      AS revenue,
    uniqExact(sale_id) AS transactions,
    sum(quantity)      AS units
FROM sale_lines FINAL
WHERE status = 'COMPLETED'
GROUP BY merchant_id, day
;

CREATE MATERIALIZED VIEW sales_hourly_mv
REFRESH EVERY 5 MINUTE TO sales_hourly AS
SELECT
    merchant_id,
    toDate(created_at, 'Asia/Jakarta') AS day,
    toHour(toTimeZone(created_at, 'Asia/Jakarta')) AS hour,
    sum(subtotal)      AS revenue,
    uniqExact(sale_id) AS transactions,
    sum(quantity)      AS units
FROM sale_lines FINAL
WHERE status = 'COMPLETED'
GROUP BY merchant_id, day, hour
;

CREATE MATERIALIZED VIEW product_daily_mv
REFRESH EVERY 5 MINUTE TO product_daily AS
SELECT
    merchant_id,
    toDate(created_at, 'Asia/Jakarta') AS day,
    product_id,
    argMax(product_name, created_at) AS product_name,
    argMax(sku, created_at)          AS sku,
    sum(subtotal)                    AS revenue,
    sum(quantity)                    AS units,
    uniqExact(sale_id)               AS transactions
FROM sale_lines FINAL
WHERE status = 'COMPLETED'
GROUP BY merchant_id, day, product_id
;

CREATE MATERIALIZED VIEW platform_daily_mv
REFRESH EVERY 5 MINUTE TO platform_daily AS
SELECT
    toDate(created_at, 'Asia/Jakarta') AS day,
    uniqExact(merchant_id) AS merchants,
    sum(subtotal)          AS revenue,
    uniqExact(sale_id)     AS transactions,
    sum(quantity)          AS units
FROM sale_lines FINAL
WHERE status = 'COMPLETED'
GROUP BY day
;
