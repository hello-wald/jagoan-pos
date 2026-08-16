-- ClickHouse consumes RabbitMQ itself; there is no consumer service. This table
-- is a stream, not storage — selecting from it directly consumes messages, so
-- only the materialized view in 003 should ever read it.
--
-- The exchange name, type and durability must match what the relay declares in
-- packages/contracts/src/transactions/sale-event.schema.ts. RabbitMQ rejects a
-- redeclaration that disagrees, and the loser's channel dies.
--
-- UUIDs and timestamps are declared String here on purpose: a single malformed
-- value would otherwise fail the whole block. They are cast in the MV, where a
-- bad row can be isolated instead.
CREATE TABLE IF NOT EXISTS sale_events_queue
(
    eventId           String,
    eventType         LowCardinality(String),
    occurredAt        String,
    traceId           String,

    id                String,
    merchantId        String,
    merchantName      String,
    cashierId         String,
    cashierName       String,
    transactionNumber String,
    status            LowCardinality(String),
    totalQuantity     UInt32,
    totalAmount       UInt64,
    cashReceived      UInt64,
    changeAmount      UInt64,
    createdAt         String,

    -- Matches the `items` array the relay flattens into the envelope root.
    items Array(Tuple(
        id          String,
        productId   String,
        productName String,
        sku         String,
        unitPrice   UInt64,
        quantity    UInt32,
        subtotal    UInt64
    ))
)
ENGINE = RabbitMQ
SETTINGS
    rabbitmq_host_port        = '{{RABBITMQ_HOST_PORT}}',
    rabbitmq_secure           = {{RABBITMQ_SECURE}},
    rabbitmq_vhost            = '{{RABBITMQ_VHOST}}',
    rabbitmq_username         = '{{RABBITMQ_USERNAME}}',
    rabbitmq_password         = '{{RABBITMQ_PASSWORD}}',
    rabbitmq_exchange_name    = 'jagoan.events',
    rabbitmq_exchange_type    = 'topic',
    rabbitmq_routing_key_list = 'sale.completed',
    rabbitmq_format           = 'JSONEachRow',
    -- A stable queue name so a restart resumes the existing queue rather than
    -- abandoning unacked messages in an orphaned one.
    rabbitmq_queue_base       = 'clickhouse_sale_events',
    rabbitmq_num_consumers    = 1,
    rabbitmq_flush_interval_ms = 1000,
    -- 'stream' exposes _error / _raw_message instead of throwing, so a bad
    -- message is diverted (see 004) rather than stalling the stream.
    rabbitmq_handle_error_mode = 'stream';
