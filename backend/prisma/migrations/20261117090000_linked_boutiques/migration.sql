-- AlterTable
ALTER TABLE "tenants" ADD COLUMN "parentTenantId" TEXT,
ADD COLUMN "includedInParent" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "stock_transfers" (
    "id" TEXT NOT NULL,
    "fromTenantId" TEXT NOT NULL,
    "toTenantId" TEXT NOT NULL,
    "fromProductId" TEXT,
    "toProductId" TEXT,
    "productName" TEXT NOT NULL,
    "variant" TEXT,
    "quantity" INTEGER NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tenants_parentTenantId_idx" ON "tenants"("parentTenantId");
CREATE INDEX "stock_transfers_fromTenantId_idx" ON "stock_transfers"("fromTenantId");
CREATE INDEX "stock_transfers_toTenantId_idx" ON "stock_transfers"("toTenantId");

-- AddForeignKey
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_parentTenantId_fkey" FOREIGN KEY ("parentTenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_fromTenantId_fkey" FOREIGN KEY ("fromTenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_toTenantId_fkey" FOREIGN KEY ("toTenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
