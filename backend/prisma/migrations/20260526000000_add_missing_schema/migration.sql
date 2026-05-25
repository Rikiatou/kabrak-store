-- CreateEnum
CREATE TYPE "BusinessMode" AS ENUM ('PRODUCT', 'SERVICE');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED');

-- AlterEnum: Add new BusinessCategory values
ALTER TYPE "BusinessCategory" ADD VALUE IF NOT EXISTS 'ELECTRONICS';
ALTER TYPE "BusinessCategory" ADD VALUE IF NOT EXISTS 'HOUSE_PRODUCTS';
ALTER TYPE "BusinessCategory" ADD VALUE IF NOT EXISTS 'DECORATION';
ALTER TYPE "BusinessCategory" ADD VALUE IF NOT EXISTS 'MINI_MARKET';
ALTER TYPE "BusinessCategory" ADD VALUE IF NOT EXISTS 'WHOLESALE';
ALTER TYPE "BusinessCategory" ADD VALUE IF NOT EXISTS 'MIXED_SHOP';
ALTER TYPE "BusinessCategory" ADD VALUE IF NOT EXISTS 'FOOD_BUSINESS';
ALTER TYPE "BusinessCategory" ADD VALUE IF NOT EXISTS 'FOOD_DELIVERY';
ALTER TYPE "BusinessCategory" ADD VALUE IF NOT EXISTS 'HOME_COOKING';
ALTER TYPE "BusinessCategory" ADD VALUE IF NOT EXISTS 'WHATSAPP_SELLER';
ALTER TYPE "BusinessCategory" ADD VALUE IF NOT EXISTS 'MADE_TO_ORDER';
ALTER TYPE "BusinessCategory" ADD VALUE IF NOT EXISTS 'DIGITAL_MARKETING';
ALTER TYPE "BusinessCategory" ADD VALUE IF NOT EXISTS 'FREELANCER';
ALTER TYPE "BusinessCategory" ADD VALUE IF NOT EXISTS 'AGENCY';
ALTER TYPE "BusinessCategory" ADD VALUE IF NOT EXISTS 'CONSULTANT';
ALTER TYPE "BusinessCategory" ADD VALUE IF NOT EXISTS 'DESIGNER';
ALTER TYPE "BusinessCategory" ADD VALUE IF NOT EXISTS 'DEVELOPER';
ALTER TYPE "BusinessCategory" ADD VALUE IF NOT EXISTS 'SOCIAL_MEDIA';
ALTER TYPE "BusinessCategory" ADD VALUE IF NOT EXISTS 'PRINTING';
ALTER TYPE "BusinessCategory" ADD VALUE IF NOT EXISTS 'BUSINESS_SERVICES';

-- AlterTable: tenants
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "businessMode" "BusinessMode" NOT NULL DEFAULT 'PRODUCT';

-- AlterTable: users
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: products (service mode fields)
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "isService" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "duration" TEXT;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "recurringType" TEXT;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "recurringPrice" DOUBLE PRECISION;

-- AlterTable: invoices (make orderId optional, add projectId)
ALTER TABLE "invoices" ALTER COLUMN "orderId" DROP NOT NULL;
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "projectId" TEXT;

-- CreateTable: invoice_line_items
CREATE TABLE IF NOT EXISTS "invoice_line_items" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "totalPrice" DOUBLE PRECISION NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "productId" TEXT,

    CONSTRAINT "invoice_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable: projects
CREATE TABLE IF NOT EXISTS "projects" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "ProjectStatus" NOT NULL DEFAULT 'ACTIVE',
    "totalBudget" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "amountPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "amountRemaining" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "startDate" TIMESTAMP(3),
    "deadline" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "tenantId" TEXT NOT NULL,
    "clientId" TEXT,
    "assignedToId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable: project_milestones
CREATE TABLE IF NOT EXISTS "project_milestones" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueDate" TIMESTAMP(3),
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_milestones_pkey" PRIMARY KEY ("id")
);

-- CreateTable: recurring_billings
CREATE TABLE IF NOT EXISTS "recurring_billings" (
    "id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "frequency" TEXT NOT NULL DEFAULT 'monthly',
    "nextBillingDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastInvoiceId" TEXT,
    "tenantId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "productId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recurring_billings_pkey" PRIMARY KEY ("id")
);

-- AddForeignKeys
ALTER TABLE "invoice_line_items" ADD CONSTRAINT "invoice_line_items_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "invoice_line_items" ADD CONSTRAINT "invoice_line_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "invoices" ADD CONSTRAINT "invoices_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "projects" ADD CONSTRAINT "projects_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects" ADD CONSTRAINT "projects_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "projects" ADD CONSTRAINT "projects_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "project_milestones" ADD CONSTRAINT "project_milestones_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "recurring_billings" ADD CONSTRAINT "recurring_billings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "recurring_billings" ADD CONSTRAINT "recurring_billings_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "recurring_billings" ADD CONSTRAINT "recurring_billings_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
