CREATE TYPE "ProductImageStatus" AS ENUM ('PENDING', 'READY');

CREATE TABLE "product_images" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "storage_path" VARCHAR(500) NOT NULL,
    "content_type" VARCHAR(100) NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "status" "ProductImageStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "product_images_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "product_images_size_bytes_check" CHECK ("size_bytes" > 0)
);

CREATE UNIQUE INDEX "product_images_storage_path_key" ON "product_images"("storage_path");
CREATE INDEX "product_images_product_id_status_sort_order_idx"
  ON "product_images"("product_id", "status", "sort_order");

ALTER TABLE "product_images"
  ADD CONSTRAINT "product_images_product_id_fkey"
  FOREIGN KEY ("product_id") REFERENCES "products"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
