-- Database invariants complement request validation and serializable transactions.
CREATE UNIQUE INDEX "Address_one_default_per_user" ON "Address" ("userId") WHERE "isDefault" = true;
CREATE UNIQUE INDEX "Motorcycle_one_primary_per_user" ON "CustomerMotorcycle" ("userId") WHERE "isPrimary" = true;
ALTER TABLE "Product" ADD CONSTRAINT "Product_nonnegative_money_stock" CHECK ("priceCents" >= 0 AND "stock" >= 0);
ALTER TABLE "ProductCompatibility" ADD CONSTRAINT "Compatibility_year_range" CHECK ("yearFrom" >= 1900 AND "yearTo" >= "yearFrom" AND "yearTo" <= 2100);
ALTER TABLE "CustomerMotorcycle" ADD CONSTRAINT "Motorcycle_year_range" CHECK ("year" >= 1950 AND "year" <= 2100);
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_quantity_range" CHECK ("quantity" BETWEEN 1 AND 99);
ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_valid_values" CHECK ("value" > 0 AND "minimumCents" >= 0 AND ("usageLimit" IS NULL OR "usageLimit" >= 0) AND ("type" <> 'PERCENT' OR "value" <= 100) AND ("startsAt" IS NULL OR "expiresAt" IS NULL OR "startsAt" < "expiresAt"));
ALTER TABLE "Order" ADD CONSTRAINT "Order_money_integrity" CHECK ("subtotalCents" >= 0 AND "discountCents" >= 0 AND "discountCents" <= "subtotalCents" AND "shippingCents" >= 0 AND "totalCents" = "subtotalCents"::bigint - "discountCents"::bigint + "shippingCents"::bigint);
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_money_integrity" CHECK ("unitPriceCents" >= 0 AND "quantity" BETWEEN 1 AND 99 AND "totalCents" = "unitPriceCents"::bigint * "quantity"::bigint);
ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_position_nonnegative" CHECK ("position" >= 0);
ALTER TABLE "Session" ADD CONSTRAINT "Session_expiry_after_creation" CHECK ("expiresAt" > "createdAt");
ALTER TABLE "AuthToken" ADD CONSTRAINT "AuthToken_expiry_after_creation" CHECK ("expiresAt" > "createdAt");
