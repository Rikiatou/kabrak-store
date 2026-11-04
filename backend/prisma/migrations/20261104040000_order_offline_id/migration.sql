ALTER TABLE "orders" ADD COLUMN "offlineId" TEXT;
CREATE UNIQUE INDEX "orders_offlineId_key" ON "orders"("offlineId");
