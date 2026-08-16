-- CreateEnum
CREATE TYPE "outbox_status" AS ENUM ('PENDING', 'PUBLISHED', 'FAILED');

-- AlterTable: aggregate_id already holds sale.id for every existing row
-- (the outbox has only ever emitted sale events), so rename in place
-- instead of dropping the data.
ALTER TABLE "outbox_events" RENAME COLUMN "aggregate_id" TO "sale_id";
ALTER TABLE "outbox_events" DROP COLUMN "aggregate_type";
ALTER TABLE "outbox_events" DROP COLUMN "event_version";
ALTER TABLE "outbox_events" ADD COLUMN "status" "outbox_status" NOT NULL DEFAULT 'PENDING';
ALTER TABLE "outbox_events" ADD COLUMN "published_at" TIMESTAMPTZ(6);
ALTER TABLE "outbox_events" ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "outbox_events" ADD COLUMN "last_error" VARCHAR(500);

-- Backfill: rows written before this migration are all sale events that
-- have not been through a relay yet, so PENDING is the correct default.

-- DropIndex
DROP INDEX "outbox_events_aggregate_id_idx";

-- CreateIndex
CREATE UNIQUE INDEX "outbox_events_sale_id_event_type_key" ON "outbox_events"("sale_id", "event_type");

-- CreateIndex
CREATE INDEX "outbox_events_status_created_at_idx" ON "outbox_events"("status", "created_at");

-- AddForeignKey
ALTER TABLE "outbox_events"
    ADD CONSTRAINT "outbox_events_sale_id_fkey" FOREIGN KEY ("sale_id")
    REFERENCES "sales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
