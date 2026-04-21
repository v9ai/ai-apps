-- Products: first-class reusable entity; competitor_analyses now FK to this.

CREATE TABLE IF NOT EXISTS "products" (
  "id" serial PRIMARY KEY NOT NULL,
  "tenant_id" text NOT NULL DEFAULT COALESCE(NULLIF(current_setting('app.tenant', true), ''), 'vadim'),
  "name" text NOT NULL,
  "url" text NOT NULL,
  "domain" text,
  "description" text,
  "created_by" text,
  "created_at" text DEFAULT now()::text NOT NULL,
  "updated_at" text DEFAULT now()::text NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_products_tenant_url" ON "products" ("tenant_id", "url");
CREATE INDEX IF NOT EXISTS "idx_products_tenant_id" ON "products" ("tenant_id");

-- Backfill path for existing competitor_analyses rows (pre-products schema).
ALTER TABLE "competitor_analyses" ADD COLUMN IF NOT EXISTS "product_id" integer;

INSERT INTO "products" ("tenant_id", "name", "url", "created_by")
SELECT DISTINCT "tenant_id", "seed_product_name", "seed_product_url", "created_by"
FROM "competitor_analyses"
WHERE "seed_product_name" IS NOT NULL AND "seed_product_url" IS NOT NULL
ON CONFLICT ("tenant_id", "url") DO NOTHING;

UPDATE "competitor_analyses" ca
SET "product_id" = p."id"
FROM "products" p
WHERE p."tenant_id" = ca."tenant_id"
  AND p."url" = ca."seed_product_url"
  AND ca."product_id" IS NULL;

ALTER TABLE "competitor_analyses" ALTER COLUMN "product_id" SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'competitor_analyses_product_id_fkey'
  ) THEN
    ALTER TABLE "competitor_analyses"
      ADD CONSTRAINT "competitor_analyses_product_id_fkey"
      FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "idx_competitor_analyses_product_id"
  ON "competitor_analyses" ("product_id");

ALTER TABLE "competitor_analyses" DROP COLUMN IF EXISTS "seed_product_name";
ALTER TABLE "competitor_analyses" DROP COLUMN IF EXISTS "seed_product_url";

-- RLS: same shape as migration 0049 for all tenant-scoped tables.
ALTER TABLE "products" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "products" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "products";
CREATE POLICY tenant_isolation ON "products"
  USING (
    current_setting('app.tenant', true) IS NULL
    OR current_setting('app.tenant', true) = ''
    OR tenant_id = current_setting('app.tenant', true)
  )
  WITH CHECK (
    current_setting('app.tenant', true) IS NULL
    OR current_setting('app.tenant', true) = ''
    OR tenant_id = current_setting('app.tenant', true)
  );
