-- Normalized per-(company, product) lead-gen signals.
--
-- Replaces the original v1 approach of adding per-column signal fields to
-- `companies` (`rag_stack_detected`, `on_prem_required`, etc.). That approach
-- doesn't scale past a single product — each new vertical (ArchReview,
-- OnboardingTutor, future products) would have required its own columns.
--
-- This table is the denormalized scoring artifact. Each row is the latest
-- snapshot of one (company, product) pairing's signals + aggregate score.
-- Append-only provenance remains the job of `company_facts`.
--
-- Usage patterns:
--   - UPSERT-per-vertical from `company_enrichment_graph.score_verticals` after
--     core enrichment commits.
--   - Hot-lead query: `SELECT company_id FROM company_product_signals
--                       WHERE product_id = $1 AND tier = 'hot'
--                       ORDER BY score DESC LIMIT $2`.
--   - History (if needed later) goes to a sibling `_log` append-only table;
--     do not bloat this row with version fields.
--
-- Signals jsonb shape (schema governed by ProductVertical.schema_version in
-- backend/leadgen_agent/verticals/registry.py):
--   {
--     "schema_version": "1.0.0",
--     "<bool signal key>": true,
--     "<label signal key>": "langchain" | "llamaindex" | "haystack",
--     ...
--   }
-- Unknown keys are preserved — forward-compat when a vertical adds a signal.

CREATE TABLE IF NOT EXISTS "company_product_signals" (
  "id"         serial PRIMARY KEY,
  "tenant_id"  text NOT NULL DEFAULT COALESCE(NULLIF(current_setting('app.tenant', true), ''), 'vadim'),
  "company_id" integer NOT NULL REFERENCES "companies" ("id") ON DELETE CASCADE,
  "product_id" integer NOT NULL REFERENCES "products"  ("id") ON DELETE CASCADE,
  "signals"    jsonb   NOT NULL DEFAULT '{}'::jsonb,
  "score"      real    NOT NULL DEFAULT 0,
  "tier"       text,
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "uq_company_product_signals_pair" UNIQUE ("company_id", "product_id")
);

-- Hot-lead query index: "top N by score for product X".
CREATE INDEX IF NOT EXISTS "idx_company_product_signals_hot"
  ON "company_product_signals" ("product_id", "tier", "score" DESC);

-- Tenant scoping index for multi-tenant deployments.
CREATE INDEX IF NOT EXISTS "idx_company_product_signals_tenant"
  ON "company_product_signals" ("tenant_id", "product_id");
