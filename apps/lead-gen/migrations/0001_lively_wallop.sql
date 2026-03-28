-- Drop Ashby enrichment columns from companies table
ALTER TABLE "companies" DROP COLUMN IF EXISTS "ashby_industry_tags";--> statement-breakpoint
ALTER TABLE "companies" DROP COLUMN IF EXISTS "ashby_tech_signals";--> statement-breakpoint
ALTER TABLE "companies" DROP COLUMN IF EXISTS "ashby_size_signal";--> statement-breakpoint
ALTER TABLE "companies" DROP COLUMN IF EXISTS "ashby_enriched_at";
