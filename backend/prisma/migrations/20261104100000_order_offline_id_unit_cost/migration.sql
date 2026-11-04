-- AlterTable
ALTER TABLE "orders" ADD COLUMN "offlineId" TEXT;
ALTER TABLE "order_items" ADD COLUMN "unitCost" DOUBLE PRECISION;

-- Snapshot current cost for historical sales
UPDATE "order_items" oi SET "unitCost" = p."costPrice" FROM "products" p WHERE oi."productId" = p.id AND oi."unitCost" IS NULL;

-- CreateIndex
CREATE UNIQUE INDEX "orders_offlineId_key" ON "orders"("offlineId");
