-- Intervention #4: semantic ICP matching via pgvector embeddings.
--
-- Adds 1024-dim BGE-M3 embeddings to products (icp_embedding, derived from
-- icp_analysis) and companies (profile_embedding, derived from home /
-- about / description text). Served locally by `crates/icp-embed` (Candle
-- + Metal). No external API calls.
--
-- Keeps the existing `companies.embedding vector(384)` column untouched —
-- `profile_embedding` is the canonical column for ICP cosine matching; the
-- 384-dim column is retained for the legacy consumers that still use it.
--
-- Also splits company_product_signals.score into three columns so we can
-- observe the regex-only vs semantic-only contribution without re-running
-- the scoring graph. `score` stays the blended aggregate used for tiering.
--
-- HNSW with vector_cosine_ops because both embedding columns are L2-normalized
-- at produce time (see crates/icp-embed/src/embedder.rs), so cosine distance
-- is the right metric for top-K ICP lookup.

-- ── products.icp_embedding ──────────────────────────────────────────────
ALTER TABLE "products"
  ADD COLUMN IF NOT EXISTS "icp_embedding" vector(1024);
ALTER TABLE "products"
  ADD COLUMN IF NOT EXISTS "icp_embedding_model" text;
ALTER TABLE "products"
  ADD COLUMN IF NOT EXISTS "icp_embedding_source_hash" text;
ALTER TABLE "products"
  ADD COLUMN IF NOT EXISTS "icp_embedding_updated_at" text;

-- ── companies.profile_embedding ─────────────────────────────────────────
ALTER TABLE "companies"
  ADD COLUMN IF NOT EXISTS "profile_embedding" vector(1024);
ALTER TABLE "companies"
  ADD COLUMN IF NOT EXISTS "profile_embedding_model" text;
ALTER TABLE "companies"
  ADD COLUMN IF NOT EXISTS "profile_embedding_source_hash" text;
ALTER TABLE "companies"
  ADD COLUMN IF NOT EXISTS "profile_embedding_updated_at" text;

-- ── company_product_signals: split regex / semantic / blended ───────────
ALTER TABLE "company_product_signals"
  ADD COLUMN IF NOT EXISTS "regex_score" real NOT NULL DEFAULT 0;
ALTER TABLE "company_product_signals"
  ADD COLUMN IF NOT EXISTS "semantic_score" real;
ALTER TABLE "company_product_signals"
  ADD COLUMN IF NOT EXISTS "semantic_score_computed_at" timestamptz;

-- One-time backfill: existing rows hold the regex-only score in `score`,
-- so mirror it into `regex_score` so historical observability stays accurate.
UPDATE "company_product_signals"
  SET "regex_score" = "score"
  WHERE "regex_score" = 0 AND "score" IS NOT NULL AND "score" > 0;

-- HNSW indexes for cosine top-K. CONCURRENTLY so migration doesn't block
-- writes on a populated table; safe because IF NOT EXISTS.
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_products_icp_embedding_hnsw"
  ON "products" USING hnsw ("icp_embedding" vector_cosine_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_companies_profile_embedding_hnsw"
  ON "companies" USING hnsw ("profile_embedding" vector_cosine_ops);
