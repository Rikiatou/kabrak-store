CREATE TYPE "CashSessionStatus" AS ENUM ('OPEN', 'CLOSED');

CREATE TABLE "cash_sessions" (
    "id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "status" "CashSessionStatus" NOT NULL DEFAULT 'OPEN',
    "openingFloat" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "countedCash" DOUBLE PRECISION,
    "expectedCash" DOUBLE PRECISION,
    "difference" DOUBLE PRECISION,
    "openingNote" TEXT,
    "closingNote" TEXT,
    "summary" JSONB,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "tenantId" TEXT NOT NULL,
    "openedById" TEXT NOT NULL,
    "closedById" TEXT,
    CONSTRAINT "cash_sessions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "cash_sessions_tenantId_number_key" ON "cash_sessions"("tenantId", "number");
CREATE INDEX "cash_sessions_tenantId_status_idx" ON "cash_sessions"("tenantId", "status");
-- Only one open drawer per shop
CREATE UNIQUE INDEX "cash_sessions_one_open_per_tenant" ON "cash_sessions"("tenantId") WHERE "status" = 'OPEN';

ALTER TABLE "cash_sessions" ADD CONSTRAINT "cash_sessions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cash_sessions" ADD CONSTRAINT "cash_sessions_openedById_fkey" FOREIGN KEY ("openedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cash_sessions" ADD CONSTRAINT "cash_sessions_closedById_fkey" FOREIGN KEY ("closedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
