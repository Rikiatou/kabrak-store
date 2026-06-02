-- AlterTable: Change businessCategories from BusinessCategory[] to String[]
-- This allows custom categories instead of only predefined enum values

-- First, alter the column type
ALTER TABLE "tenants" ALTER COLUMN "businessCategories" TYPE text[];

-- Note: Existing data will be preserved as text strings
-- The BusinessCategory enum will still exist for reference but won't be enforced
