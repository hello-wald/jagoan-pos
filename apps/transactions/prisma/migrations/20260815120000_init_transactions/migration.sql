CREATE TYPE "stock_movement_reason" AS ENUM ('SALE', 'RECEIVE', 'ADJUSTMENT', 'INITIAL');
CREATE TYPE "sale_status" AS ENUM ('COMPLETED', 'VOIDED');

CREATE TABLE "inventories" (
    "id" UUID NOT NULL,
    "merchant_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "stock_quantity" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "inventories_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "inventories_stock_non_negative" CHECK ("stock_quantity" >= 0)
);

CREATE UNIQUE INDEX "inventories_merchant_id_product_id_key"
    ON "inventories" ("merchant_id", "product_id");

CREATE TABLE "stock_movements" (
    "id" UUID NOT NULL,
    "merchant_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "delta" INTEGER NOT NULL,
    "balance_after" INTEGER NOT NULL,
    "reason" "stock_movement_reason" NOT NULL,
    "actor_id" UUID NOT NULL,
    "sale_id" UUID,
    "note" VARCHAR(255),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "stock_movements_delta_non_zero" CHECK ("delta" <> 0),
    CONSTRAINT "stock_movements_balance_non_negative" CHECK ("balance_after" >= 0),
    CONSTRAINT "stock_movements_sale_is_negative"
        CHECK ("reason" <> 'SALE' OR "delta" < 0),
    CONSTRAINT "stock_movements_receive_is_positive"
        CHECK ("reason" <> 'RECEIVE' OR "delta" > 0),
    CONSTRAINT "stock_movements_sale_has_sale_id"
        CHECK (("reason" = 'SALE') = ("sale_id" IS NOT NULL))
);

CREATE INDEX "stock_movements_merchant_id_product_id_created_at_idx"
    ON "stock_movements" ("merchant_id", "product_id", "created_at");
CREATE INDEX "stock_movements_merchant_id_created_at_idx"
    ON "stock_movements" ("merchant_id", "created_at");

CREATE TABLE "sales" (
    "id" UUID NOT NULL,
    "merchant_id" UUID NOT NULL,
    "merchant_name_snapshot" VARCHAR(150) NOT NULL,
    "cashier_id" UUID NOT NULL,
    "cashier_name_snapshot" VARCHAR(150) NOT NULL,
    "transaction_number" VARCHAR(100) NOT NULL,
    "idempotency_key" VARCHAR(255) NOT NULL,
    "status" "sale_status" NOT NULL DEFAULT 'COMPLETED',
    "total_quantity" INTEGER NOT NULL,
    "total_amount" BIGINT NOT NULL,
    "cash_received" BIGINT NOT NULL,
    "change_amount" BIGINT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sales_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "sales_totals_positive" CHECK ("total_quantity" > 0 AND "total_amount" > 0),
    CONSTRAINT "sales_cash_covers_total" CHECK ("cash_received" >= "total_amount"),
    CONSTRAINT "sales_change_is_consistent" CHECK ("change_amount" = "cash_received" - "total_amount")
);

CREATE UNIQUE INDEX "sales_merchant_id_transaction_number_key"
    ON "sales" ("merchant_id", "transaction_number");
CREATE UNIQUE INDEX "sales_merchant_id_idempotency_key_key"
    ON "sales" ("merchant_id", "idempotency_key");
CREATE INDEX "sales_merchant_id_created_at_idx" ON "sales" ("merchant_id", "created_at");
CREATE INDEX "sales_cashier_id_created_at_idx" ON "sales" ("cashier_id", "created_at");

CREATE TABLE "sale_items" (
    "id" UUID NOT NULL,
    "sale_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "product_name_snapshot" VARCHAR(200) NOT NULL,
    "sku_snapshot" VARCHAR(100) NOT NULL,
    "unit_price" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "subtotal" BIGINT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sale_items_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "sale_items_quantity_positive" CHECK ("quantity" > 0),
    CONSTRAINT "sale_items_unit_price_positive" CHECK ("unit_price" > 0),
    CONSTRAINT "sale_items_subtotal_is_consistent"
        CHECK ("subtotal" = "unit_price"::BIGINT * "quantity")
);

CREATE INDEX "sale_items_sale_id_idx" ON "sale_items" ("sale_id");

CREATE UNIQUE INDEX "sale_items_sale_id_product_id_key"
    ON "sale_items" ("sale_id", "product_id");

ALTER TABLE "sale_items"
    ADD CONSTRAINT "sale_items_sale_id_fkey" FOREIGN KEY ("sale_id")
    REFERENCES "sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "outbox_events" (
    "id" UUID NOT NULL,
    "aggregate_type" VARCHAR(50) NOT NULL DEFAULT 'sale',
    "aggregate_id" UUID NOT NULL,
    "merchant_id" UUID NOT NULL,
    "event_type" VARCHAR(100) NOT NULL,
    "event_version" INTEGER NOT NULL DEFAULT 1,
    "payload" JSONB NOT NULL,
    "trace_id" VARCHAR(64),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
);

-- Deliberately NOT unique on aggregate_id: a sale will later emit SALE_VOIDED
-- alongside SALE_COMPLETED.
CREATE INDEX "outbox_events_aggregate_id_idx" ON "outbox_events" ("aggregate_id");
CREATE INDEX "outbox_events_created_at_idx" ON "outbox_events" ("created_at");

CREATE TABLE "transaction_counters" (
    "merchant_id" UUID NOT NULL,
    "book_date" DATE NOT NULL,
    "last_seq" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "transaction_counters_pkey" PRIMARY KEY ("merchant_id", "book_date")
);
