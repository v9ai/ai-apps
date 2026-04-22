ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "papers" jsonb;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "papers_enriched_at" text;
