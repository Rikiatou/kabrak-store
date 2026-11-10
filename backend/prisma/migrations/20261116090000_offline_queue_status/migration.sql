ALTER TABLE "users" ADD COLUMN "offlineQueue" JSONB;
ALTER TABLE "users" ADD COLUMN "offlineReportedAt" TIMESTAMP(3);
