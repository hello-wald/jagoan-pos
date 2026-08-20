CREATE TABLE "categories" (
    "id" UUID NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "categories_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "categories_name_key" UNIQUE ("name")
);

-- "Beverages" and "beverages" are the same category to an administrator, so the
-- database enforces that too, exactly as it does for product SKUs.
CREATE UNIQUE INDEX "categories_name_case_insensitive_key" ON "categories" (LOWER("name"));
CREATE INDEX "categories_is_active_name_idx" ON "categories" ("is_active", "name");

ALTER TABLE "products" ADD COLUMN "category_id" UUID;

-- Backfill: every distinct free-text category becomes a row. Grouping on the
-- case-folded name collapses casing variants; MIN picks one spelling to keep.
INSERT INTO "categories" ("id", "name", "created_at", "updated_at")
SELECT gen_random_uuid(), MIN(TRIM("category")), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "products"
WHERE "category" IS NOT NULL AND TRIM("category") <> ''
GROUP BY LOWER(TRIM("category"));

UPDATE "products" AS p
SET "category_id" = c."id"
FROM "categories" AS c
WHERE LOWER(TRIM(p."category")) = LOWER(c."name");

ALTER TABLE "products" DROP COLUMN "category";

ALTER TABLE "products"
  ADD CONSTRAINT "products_category_id_fkey"
  FOREIGN KEY ("category_id") REFERENCES "categories"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "products_category_id_name_idx" ON "products" ("category_id", "name");
