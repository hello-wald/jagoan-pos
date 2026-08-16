-- A stream, not storage: selecting from it consumes messages, so only the MV in
-- 003 should read it. Exchange name/type/durability must match what the relay
-- declares in sale-event.schema.ts or RabbitMQ kills the channel.
-- UUIDs and dates are String here so one bad value cannot fail the whole block.
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
    -- Stable name so a restart resumes the same queue.
    rabbitmq_queue_base       = 'clickhouse_sale_events',
    rabbitmq_num_consumers    = 1,
    rabbitmq_flush_interval_ms = 1000,
    -- 'stream' diverts bad messages to _error / _raw_message (see 004).
    rabbitmq_handle_error_mode = 'stream';
