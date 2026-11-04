-- AlterTable
ALTER TABLE "orders" ADD COLUMN "dueDate" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "orders_tenantId_dueDate_idx" ON "orders"("tenantId", "dueDate");
