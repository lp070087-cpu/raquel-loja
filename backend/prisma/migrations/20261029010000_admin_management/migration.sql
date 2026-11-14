-- Additive management model; apply only to the independently verified testing target.
CREATE TABLE "Category" (
 "id" TEXT NOT NULL,
 "name" TEXT NOT NULL,
 "slug" TEXT NOT NULL,
 "active" BOOLEAN NOT NULL DEFAULT true,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");
ALTER TABLE "Product" ADD COLUMN "categoryId" TEXT;
CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- Preserve current catalog category identity without rewriting original data files.
INSERT INTO "Category"("id","name","slug","updatedAt")
 SELECT 'legacy-' || md5(category), CASE category
  WHEN 'oleos' THEN 'Óleos'
  WHEN 'filtros' THEN 'Filtros'
  WHEN 'freios' THEN 'Freios'
  WHEN 'transmissao' THEN 'Transmissão'
  WHEN 'pneus' THEN 'Pneus'
  WHEN 'capacetes' THEN 'Capacetes'
  WHEN 'capas' THEN 'Capas de chuva'
  ELSE initcap(replace(category,'-',' ')) END, category, CURRENT_TIMESTAMP
 FROM (SELECT DISTINCT metadata->>'categoria' AS category FROM "Product") legacy
 WHERE category IS NOT NULL AND category ~ '^[a-z0-9]+(-[a-z0-9]+)*$';
UPDATE "Product" p SET "categoryId"=c.id FROM "Category" c WHERE p.metadata->>'categoria'=c.slug;
CREATE TABLE "StoreSetting" (
 "key" TEXT NOT NULL,
 "value" TEXT NOT NULL,
 "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "StoreSetting_pkey" PRIMARY KEY ("key")
);
CREATE TABLE "AdminAudit" (
 "id" TEXT NOT NULL,
 "actorId" TEXT NOT NULL,
 "action" TEXT NOT NULL,
 "entityType" TEXT NOT NULL,
 "entityId" TEXT NOT NULL,
 "details" JSONB NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "AdminAudit_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "AdminAudit_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "AdminAudit_entityType_entityId_createdAt_idx" ON "AdminAudit"("entityType","entityId","createdAt");
CREATE INDEX "AdminAudit_actorId_createdAt_idx" ON "AdminAudit"("actorId","createdAt");
