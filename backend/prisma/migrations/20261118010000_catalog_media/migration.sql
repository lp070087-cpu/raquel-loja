ALTER TABLE "Category" ADD COLUMN "imageUrl" TEXT;
CREATE TABLE "MediaAsset" (
  "id" TEXT PRIMARY KEY,
  "content" BYTEA NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MediaAsset_size_check" CHECK (octet_length("content") BETWEEN 4 AND 524288),
  CONSTRAINT "MediaAsset_id_check" CHECK ("id" ~ '^[0-9a-f]{64}$')
);
