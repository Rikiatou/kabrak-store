-- Remove redundant business categories; existing data is mapped to the closest remaining one.
UPDATE "products" SET "businessType" = 'FOOD_BUSINESS' WHERE "businessType" IN ('FOOD', 'FOOD_DELIVERY', 'HOME_COOKING');
UPDATE "products" SET "businessType" = 'MIXED_SHOP' WHERE "businessType" = 'WHATSAPP_SELLER';
UPDATE "products" SET "businessType" = 'OTHER' WHERE "businessType" = 'MADE_TO_ORDER';

UPDATE "tenants" SET "businessCategories" = ARRAY(
  SELECT DISTINCT (CASE c
    WHEN 'FOOD' THEN 'FOOD_BUSINESS'
    WHEN 'FOOD_DELIVERY' THEN 'FOOD_BUSINESS'
    WHEN 'HOME_COOKING' THEN 'FOOD_BUSINESS'
    WHEN 'WHATSAPP_SELLER' THEN 'MIXED_SHOP'
    WHEN 'MADE_TO_ORDER' THEN 'OTHER'
    ELSE c END)::"BusinessCategory"
  FROM unnest("businessCategories"::text[]) AS c
)
WHERE "businessCategories"::text[] && ARRAY['FOOD', 'FOOD_DELIVERY', 'HOME_COOKING', 'WHATSAPP_SELLER', 'MADE_TO_ORDER'];

CREATE TYPE "BusinessCategory_new" AS ENUM ('CLOTHING', 'SHOES', 'PERFUMES', 'COSMETICS', 'HIJABS_ABAYAS', 'FABRICS', 'JEWELRY', 'BAGS', 'ELECTRONICS', 'HOUSE_PRODUCTS', 'KITCHEN_PRODUCTS', 'DECORATION', 'MINI_MARKET', 'WHOLESALE', 'MIXED_SHOP', 'CAKES', 'FOOD_BUSINESS', 'DIGITAL_MARKETING', 'FREELANCER', 'AGENCY', 'CONSULTANT', 'DESIGNER', 'DEVELOPER', 'SOCIAL_MEDIA', 'PRINTING', 'BUSINESS_SERVICES', 'OTHER');
ALTER TABLE "tenants" ALTER COLUMN "businessCategories" TYPE "BusinessCategory_new"[] USING ("businessCategories"::text[]::"BusinessCategory_new"[]);
ALTER TABLE "products" ALTER COLUMN "businessType" TYPE "BusinessCategory_new" USING ("businessType"::text::"BusinessCategory_new");
ALTER TYPE "BusinessCategory" RENAME TO "BusinessCategory_old";
ALTER TYPE "BusinessCategory_new" RENAME TO "BusinessCategory";
DROP TYPE "BusinessCategory_old";
