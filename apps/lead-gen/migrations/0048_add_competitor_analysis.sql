-- Competitor Analysis: seed product → LLM-suggested rivals → scraped pricing, features, integrations.

CREATE TABLE IF NOT EXISTS "competitor_analyses" (
  "id" serial PRIMARY KEY NOT NULL,
  "seed_product_name" text NOT NULL,
  "seed_product_url" text NOT NULL,
  "status" text DEFAULT 'pending_approval' NOT NULL,
  "created_by" text,
  "error" text,
  "created_at" text DEFAULT now()::text NOT NULL,
  "updated_at" text DEFAULT now()::text NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_competitor_analyses_status" ON "competitor_analyses" ("status");
CREATE INDEX IF NOT EXISTS "idx_competitor_analyses_created_at" ON "competitor_analyses" ("created_at");

CREATE TABLE IF NOT EXISTS "competitors" (
  "id" serial PRIMARY KEY NOT NULL,
  "analysis_id" integer NOT NULL REFERENCES "competitor_analyses"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "url" text NOT NULL,
  "domain" text,
  "logo_url" text,
  "description" text,
  "positioning_headline" text,
  "positioning_tagline" text,
  "target_audience" text,
  "status" text DEFAULT 'suggested' NOT NULL,
  "scraped_at" text,
  "scrape_error" text,
  "created_at" text DEFAULT now()::text NOT NULL,
  "updated_at" text DEFAULT now()::text NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_competitors_analysis_id" ON "competitors" ("analysis_id");
CREATE INDEX IF NOT EXISTS "idx_competitors_status" ON "competitors" ("status");

CREATE TABLE IF NOT EXISTS "competitor_pricing_tiers" (
  "id" serial PRIMARY KEY NOT NULL,
  "competitor_id" integer NOT NULL REFERENCES "competitors"("id") ON DELETE CASCADE,
  "tier_name" text NOT NULL,
  "monthly_price_usd" real,
  "annual_price_usd" real,
  "seat_price_usd" real,
  "currency" text DEFAULT 'USD' NOT NULL,
  "included_limits" jsonb,
  "is_custom_quote" boolean DEFAULT false NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" text DEFAULT now()::text NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_competitor_pricing_tiers_competitor_id" ON "competitor_pricing_tiers" ("competitor_id");

CREATE TABLE IF NOT EXISTS "competitor_features" (
  "id" serial PRIMARY KEY NOT NULL,
  "competitor_id" integer NOT NULL REFERENCES "competitors"("id") ON DELETE CASCADE,
  "tier_name" text,
  "feature_text" text NOT NULL,
  "category" text,
  "created_at" text DEFAULT now()::text NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_competitor_features_competitor_id" ON "competitor_features" ("competitor_id");
CREATE INDEX IF NOT EXISTS "idx_competitor_features_category" ON "competitor_features" ("category");

CREATE TABLE IF NOT EXISTS "competitor_integrations" (
  "id" serial PRIMARY KEY NOT NULL,
  "competitor_id" integer NOT NULL REFERENCES "competitors"("id") ON DELETE CASCADE,
  "integration_name" text NOT NULL,
  "integration_url" text,
  "category" text,
  "created_at" text DEFAULT now()::text NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_competitor_integrations_competitor_id" ON "competitor_integrations" ("competitor_id");
