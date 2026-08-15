CREATE TABLE "products" (
    "id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "sku" VARCHAR(64) NOT NULL,
    "category" VARCHAR(80),
    "price" INTEGER NOT NULL CHECK ("price" > 0),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "products_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "products_sku_key" UNIQUE ("sku")
);

CREATE UNIQUE INDEX "products_sku_case_insensitive_key" ON "products" (UPPER("sku"));
CREATE INDEX "products_is_active_name_idx" ON "products" ("is_active", "name");
