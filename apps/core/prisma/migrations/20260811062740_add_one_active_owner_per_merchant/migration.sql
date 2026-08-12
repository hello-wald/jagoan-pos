-- This is an empty migration.CREATE UNIQUE INDEX "users_one_active_owner_per_merchant_idx"
CREATE UNIQUE INDEX "users_one_active_owner_per_merchant_idx"
ON "users" ("merchant_id")
WHERE "role" = 'OWNER' AND "is_active" = true;