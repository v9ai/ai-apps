-- Intervention #3: product-aware intent signals + competitor mention.
--
-- Adds a many-to-many link between intent_signals and products so a single
-- raw signal (job posting, web content, competitor mention) can be attributed
-- to zero-or-more products whose ICP it matches. Prior to this, intent_signals
-- were globally company-scoped only, forcing hot-lead consumers to either
-- over-surface every signal for every product or hand-maintain per-product
-- intent scoring paths.
--
-- Also introduces a new 'competitor_mention' signal_type and a nullable
-- competitor_id FK so mentions scraped from company web content / docs /
-- LinkedIn can be first-class signals without overloading 'tech_adoption'.
--
-- signal_type is a plain text column with TypeScript-level enum constraint
-- (see src/db/schema.ts), not a Postgres enum type — nothing to ALTER.

ALTER TABLE "intent_signals"
  ADD COLUMN IF NOT EXISTS "competitor_id" integer
  REFERENCES "competitors" ("id") ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "idx_intent_signals_competitor"
  ON "intent_signals" ("competitor_id", "detected_at");

CREATE TABLE IF NOT EXISTS "intent_signal_products" (
  "intent_signal_id" integer NOT NULL
    REFERENCES "intent_signals" ("id") ON DELETE CASCADE,
  "product_id" integer NOT NULL
    REFERENCES "products" ("id") ON DELETE CASCADE,
  "match_reason" text,
  "match_score" real NOT NULL DEFAULT 1.0,
  "tenant_id" text NOT NULL DEFAULT COALESCE(NULLIF(current_setting('app.tenant', true), ''), 'vadim'),
  "created_at" text DEFAULT now()::text,
  PRIMARY KEY ("intent_signal_id", "product_id")
);

CREATE INDEX IF NOT EXISTS "idx_isp_product_signal"
  ON "intent_signal_products" ("product_id", "intent_signal_id");
