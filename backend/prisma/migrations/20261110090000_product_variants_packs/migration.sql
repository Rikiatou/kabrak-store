ALTER TABLE "products" ADD COLUMN "variants" JSONB,
  ADD COLUMN "packSize" INTEGER,
  ADD COLUMN "packPrice" DOUBLE PRECISION,
  ADD COLUMN "packName" TEXT;

ALTER TABLE "order_items" ADD COLUMN "packSize" INTEGER;
