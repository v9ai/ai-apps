-- Public-read policies for the product intelligence surface.
-- The product catalog + its ICP/pricing/GTM/intel_report jsonb are intentionally
-- world-readable (marketing / case studies). Writes stay RLS-gated by tenant_id.
--
-- Also: generated `slug` column + unique index so `productBySlug` can stop
-- full-table-scanning + in-memory slugify (fine at 3 rows, bad at 300).
--
-- Known gap after this migration: product_intel_runs.webhook_secret is readable
-- via direct Postgres SELECT under the public_read policy. The GraphQL field
-- resolver allowlist (intel-runs.ts + IntelRunField) prevents exposure through
-- the API, but a direct DB connection with the app role could read it.
-- Proper fix: role split (separate `app_public` and `app_webhook` roles with
-- column-level GRANTs). Deferred — tracked as follow-up.

-- ── products ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS tenant_isolation ON products;
CREATE POLICY public_read ON products FOR SELECT USING (true);
CREATE POLICY tenant_write_ins ON products FOR INSERT
  WITH CHECK (
    current_setting('app.tenant', true) IS NULL
    OR current_setting('app.tenant', true) = ''
    OR tenant_id = current_setting('app.tenant', true)
  );
CREATE POLICY tenant_write_upd ON products FOR UPDATE
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
CREATE POLICY tenant_write_del ON products FOR DELETE
  USING (
    current_setting('app.tenant', true) IS NULL
    OR current_setting('app.tenant', true) = ''
    OR tenant_id = current_setting('app.tenant', true)
  );

-- ── product_intel_runs ───────────────────────────────────────────────────
DROP POLICY IF EXISTS tenant_isolation ON product_intel_runs;
CREATE POLICY public_read ON product_intel_runs FOR SELECT USING (true);
CREATE POLICY tenant_write_ins ON product_intel_runs FOR INSERT
  WITH CHECK (
    current_setting('app.tenant', true) IS NULL
    OR current_setting('app.tenant', true) = ''
    OR tenant_id = current_setting('app.tenant', true)
  );
CREATE POLICY tenant_write_upd ON product_intel_runs FOR UPDATE
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
CREATE POLICY tenant_write_del ON product_intel_runs FOR DELETE
  USING (
    current_setting('app.tenant', true) IS NULL
    OR current_setting('app.tenant', true) = ''
    OR tenant_id = current_setting('app.tenant', true)
  );

-- ── products.slug (generated) + unique index ─────────────────────────────
ALTER TABLE products ADD COLUMN IF NOT EXISTS slug text
  GENERATED ALWAYS AS (
    lower(regexp_replace(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'),
                         '^-|-$', '', 'g'))
  ) STORED;
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
