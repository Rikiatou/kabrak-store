-- CreateTable
CREATE TABLE "error_logs" (
    "id" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "stack" TEXT,
    "url" TEXT,
    "method" TEXT,
    "statusCode" INTEGER,
    "userAgent" TEXT,
    "appVersion" TEXT,
    "tenantId" TEXT,
    "userId" TEXT,
    "count" INTEGER NOT NULL DEFAULT 1,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "firstSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "error_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_audit_logs" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "tenantId" TEXT,
    "tenantName" TEXT,
    "details" JSONB,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "error_logs_fingerprint_key" ON "error_logs"("fingerprint");

-- CreateIndex
CREATE INDEX "error_logs_resolved_lastSeen_idx" ON "error_logs"("resolved", "lastSeen");

-- CreateIndex
CREATE INDEX "error_logs_tenantId_idx" ON "error_logs"("tenantId");

-- CreateIndex
CREATE INDEX "admin_audit_logs_createdAt_idx" ON "admin_audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "admin_audit_logs_tenantId_idx" ON "admin_audit_logs"("tenantId");

-- Re-run the retired-category remap for shops registered from a cached old frontend
UPDATE "tenants" t SET "businessCategories" = ARRAY(
  SELECT m.cat FROM (
    SELECT CASE c
             WHEN 'FOOD_DELIVERY' THEN 'FOOD_BUSINESS'
             WHEN 'HOME_COOKING' THEN 'FOOD_BUSINESS'
             WHEN 'WHATSAPP_SELLER' THEN 'MIXED_SHOP'
             WHEN 'MADE_TO_ORDER' THEN 'OTHER'
             ELSE c END AS cat, i
    FROM unnest(t."businessCategories") WITH ORDINALITY AS u(c, i)
  ) m
  GROUP BY m.cat ORDER BY min(m.i)
)
WHERE t."businessCategories" && ARRAY['FOOD_DELIVERY', 'HOME_COOKING', 'WHATSAPP_SELLER', 'MADE_TO_ORDER']::text[];
