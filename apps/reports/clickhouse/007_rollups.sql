-- Serving layer for FRD US-5.2 [AP]: reports read pre-aggregated data.
--
-- REFRESHABLE, not incremental. An incremental MV fires per inserted block and
-- never sees ReplacingMergeTree dedup, so a redelivered message inflates every
-- SUM permanently — measured here as 6 raw rows vs 3, revenue 70000 vs 35000.
--
-- REFRESH EVERY 5 MINUTE is the staleness budget (FRD open item #3); the API
-- surfaces it from system.view_refreshes for BR-9.
--
-- Only additive measures stored. avg_basket is a ratio and is derived at read.
CREATE TABLE IF NOT EXISTS sales_daily
(
    merchant_id  UUID,
    day          Date,
    revenue      UInt64,
    transactions UInt64,
    units        UInt64
)
ENGINE = MergeTree
ORDER BY (merchant_id, day)
;

CREATE MATERIALIZED VIEW IF NOT EXISTS sales_daily_mv
REFRESH EVERY 5 MINUTE TO sales_daily AS
SELECT
    merchant_id,
    toDate(created_at, 'Asia/Jakarta')  AS day,
    sum(subtotal)       AS revenue,
    uniqExact(sale_id)  AS transactions,
    sum(quantity)       AS units
FROM sale_lines FINAL
WHERE status = 'COMPLETED'
GROUP BY merchant_id, day
;

-- US-5.4: sales by hour of day.
CREATE TABLE IF NOT EXISTS sales_hourly
(
    merchant_id  UUID,
    day          Date,
    hour         UInt8,
    revenue      UInt64,
    transactions UInt64,
    units        UInt64
)
ENGINE = MergeTree
ORDER BY (merchant_id, day, hour)
;

CREATE MATERIALIZED VIEW IF NOT EXISTS sales_hourly_mv
REFRESH EVERY 5 MINUTE TO sales_hourly AS
SELECT
    merchant_id,
    toDate(created_at, 'Asia/Jakarta')  AS day,
    toHour(created_at, 'Asia/Jakarta')  AS hour,
    sum(subtotal)       AS revenue,
    uniqExact(sale_id)  AS transactions,
    sum(quantity)       AS units
FROM sale_lines FINAL
WHERE status = 'COMPLETED'
GROUP BY merchant_id, day, hour
;

-- US-5.3. Grouped by product_id, not name, so a rename does not split totals;
-- argMax picks the latest name snapshot.
CREATE TABLE IF NOT EXISTS product_daily
(
    merchant_id  UUID,
    day          Date,
    product_id   UUID,
    product_name String,
    sku          String,
    revenue      UInt64,
    units        UInt64,
    transactions UInt64
)
ENGINE = MergeTree
ORDER BY (merchant_id, day, product_id)
;

CREATE MATERIALIZED VIEW IF NOT EXISTS product_daily_mv
REFRESH EVERY 5 MINUTE TO product_daily AS
SELECT
    merchant_id,
    toDate(created_at, 'Asia/Jakarta')  AS day,
    product_id,
    argMax(product_name, created_at)   AS product_name,
    argMax(sku, created_at)            AS sku,
    sum(subtotal)                      AS revenue,
    sum(quantity)                      AS units,
    uniqExact(sale_id)                 AS transactions
FROM sale_lines FINAL
WHERE status = 'COMPLETED'
GROUP BY merchant_id, day, product_id
;

-- US-5.5. Its own rollup because merchant counts are not additive across days.
CREATE TABLE IF NOT EXISTS platform_daily
(
    day             Date,
    merchants       UInt64,
    revenue         UInt64,
    transactions    UInt64,
    units           UInt64
)
ENGINE = MergeTree
ORDER BY day
;

CREATE MATERIALIZED VIEW IF NOT EXISTS platform_daily_mv
REFRESH EVERY 5 MINUTE TO platform_daily AS
SELECT
    toDate(created_at, 'Asia/Jakarta')  AS day,
    uniqExact(merchant_id)  AS merchants,
    sum(subtotal)           AS revenue,
    uniqExact(sale_id)      AS transactions,
    sum(quantity)           AS units
FROM sale_lines FINAL
WHERE status = 'COMPLETED'
GROUP BY day
;
