-- Schema-version stamping for product_intel_runs.
--
-- Every run is stamped with PRODUCT_INTEL_VERSION at insert/update time so
-- old-schema outputs can be filtered or invalidated later without backfill.
-- Source of truth is backend/leadgen_agent/product_intel_schemas.py; the TS
-- mirror lives in src/lib/intelVersion.ts (parity is asserted by a test).
--
-- Nullable on purpose: existing rows survive without rewrite, and any query
-- that cares about freshness should use `schema_version >= '1.0.0'` (NULL
-- comparisons fail closed, which is the intended behaviour).

ALTER TABLE "product_intel_runs"
  ADD COLUMN IF NOT EXISTS "schema_version" text;
