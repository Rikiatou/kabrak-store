-- Migration: add_tenant_indexes_public_token_ai_reports
-- Adds tenantId (and other hot-path) indexes to all multi-tenant tables,
-- a secure publicToken for order sharing, and an AIReport model for
-- persistent AI usage tracking.

-- ─── Indexes on existing tables ───────────────────────────────────────────
CREATE INDEX IF NOT EXISTS "users_tenantId_idx" ON "users" ("tenantId");
CREATE INDEX IF NOT EXISTS "categories_tenantId_idx" ON "categories" ("tenantId");
CREATE INDEX IF NOT EXISTS "products_tenantId_idx" ON "products" ("tenantId");
CREATE INDEX IF NOT EXISTS "products_categoryId_idx" ON "products" ("categoryId");
CREATE INDEX IF NOT EXISTS "products_storeId_idx" ON "products" ("storeId");
CREATE INDEX IF NOT EXISTS "products_barcode_idx" ON "products" ("barcode");
CREATE INDEX IF NOT EXISTS "clients_tenantId_idx" ON "clients" ("tenantId");
CREATE INDEX IF NOT EXISTS "orders_tenantId_idx" ON "orders" ("tenantId");
CREATE INDEX IF NOT EXISTS "orders_clientId_idx" ON "orders" ("clientId");
CREATE INDEX IF NOT EXISTS "orders_status_idx" ON "orders" ("status");
CREATE INDEX IF NOT EXISTS "orders_createdAt_idx" ON "orders" ("createdAt");
CREATE INDEX IF NOT EXISTS "order_items_orderId_idx" ON "order_items" ("orderId");
CREATE INDEX IF NOT EXISTS "order_items_productId_idx" ON "order_items" ("productId");
CREATE INDEX IF NOT EXISTS "invoices_tenantId_idx" ON "invoices" ("tenantId");
CREATE INDEX IF NOT EXISTS "invoices_clientId_idx" ON "invoices" ("clientId");
CREATE INDEX IF NOT EXISTS "invoices_paymentStatus_idx" ON "invoices" ("paymentStatus");
CREATE INDEX IF NOT EXISTS "invoices_createdAt_idx" ON "invoices" ("createdAt");
CREATE INDEX IF NOT EXISTS "invoice_line_items_invoiceId_idx" ON "invoice_line_items" ("invoiceId");
CREATE INDEX IF NOT EXISTS "invoice_line_items_productId_idx" ON "invoice_line_items" ("productId");
CREATE INDEX IF NOT EXISTS "payments_invoiceId_idx" ON "payments" ("invoiceId");
CREATE INDEX IF NOT EXISTS "deliveries_tenantId_idx" ON "deliveries" ("tenantId");
CREATE INDEX IF NOT EXISTS "deliveries_status_idx" ON "deliveries" ("status");
CREATE INDEX IF NOT EXISTS "projects_tenantId_idx" ON "projects" ("tenantId");
CREATE INDEX IF NOT EXISTS "projects_clientId_idx" ON "projects" ("clientId");
CREATE INDEX IF NOT EXISTS "projects_status_idx" ON "projects" ("status");
CREATE INDEX IF NOT EXISTS "project_milestones_projectId_idx" ON "project_milestones" ("projectId");
CREATE INDEX IF NOT EXISTS "recurring_billings_tenantId_idx" ON "recurring_billings" ("tenantId");
CREATE INDEX IF NOT EXISTS "recurring_billings_clientId_idx" ON "recurring_billings" ("clientId");
CREATE INDEX IF NOT EXISTS "recurring_billings_nextBillingDate_idx" ON "recurring_billings" ("nextBillingDate");
CREATE INDEX IF NOT EXISTS "billing_payments_tenantId_idx" ON "billing_payments" ("tenantId");
CREATE INDEX IF NOT EXISTS "billing_payments_status_idx" ON "billing_payments" ("status");
CREATE INDEX IF NOT EXISTS "loyalty_rewards_tenantId_idx" ON "loyalty_rewards" ("tenantId");
CREATE INDEX IF NOT EXISTS "loyalty_rewards_clientId_idx" ON "loyalty_rewards" ("clientId");
CREATE INDEX IF NOT EXISTS "stores_tenantId_idx" ON "stores" ("tenantId");
CREATE INDEX IF NOT EXISTS "notifications_tenantId_idx" ON "notifications" ("tenantId");
CREATE INDEX IF NOT EXISTS "notifications_isRead_idx" ON "notifications" ("isRead");
CREATE INDEX IF NOT EXISTS "suppliers_tenantId_idx" ON "suppliers" ("tenantId");
CREATE INDEX IF NOT EXISTS "expenses_tenantId_idx" ON "expenses" ("tenantId");
CREATE INDEX IF NOT EXISTS "expenses_supplierId_idx" ON "expenses" ("supplierId");
CREATE INDEX IF NOT EXISTS "expenses_createdById_idx" ON "expenses" ("createdById");
CREATE INDEX IF NOT EXISTS "expenses_date_idx" ON "expenses" ("date");
CREATE INDEX IF NOT EXISTS "data_exports_tenantId_idx" ON "data_exports" ("tenantId");

-- ─── Order.publicToken (secure, unguessable sharing token) ────────────────
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "publicToken" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "orders_publicToken_key" ON "orders" ("publicToken");

-- ─── AIReport model (persistent AI usage tracking + history) ──────────────
CREATE TABLE IF NOT EXISTS "ai_reports" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "reportContent" TEXT NOT NULL,
    "metrics" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ai_reports_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ai_reports_tenantId_createdAt_idx" ON "ai_reports" ("tenantId", "createdAt");
ALTER TABLE "ai_reports" ADD CONSTRAINT "ai_reports_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
