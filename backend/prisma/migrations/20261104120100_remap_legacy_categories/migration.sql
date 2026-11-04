-- Retired categories: Livraison repas / Cuisine maison -> Restaurant, Vendeur WhatsApp -> Boutique mixte, Sur commande -> Autre
UPDATE "products" SET "businessType" = 'FOOD_BUSINESS' WHERE "businessType" IN ('FOOD_DELIVERY', 'HOME_COOKING');
UPDATE "products" SET "businessType" = 'MIXED_SHOP' WHERE "businessType" = 'WHATSAPP_SELLER';
UPDATE "products" SET "businessType" = 'OTHER' WHERE "businessType" = 'MADE_TO_ORDER';

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
