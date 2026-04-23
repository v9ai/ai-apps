ALTER TABLE products ADD COLUMN IF NOT EXISTS published_at timestamptz;
-- Backfill existing rows (ingestible, archreview, onboardingtutor) so current catalog is unchanged:
UPDATE products SET published_at = now() WHERE published_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_products_published_at ON products(published_at) WHERE published_at IS NOT NULL;
