-- Structured showcase content for a product (tagline, stats, pipeline, feature sections).
-- Nullable so pre-existing products keep rendering with just name / url / description.
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "highlights" jsonb;
