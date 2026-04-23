-- Move per-run HMAC webhook secret out of public-readable product_intel_runs
-- into a sibling table that the public_read RLS policy (migration 0059) does
-- not cover. Leaves the old column in place (now nullable) for one deploy
-- cycle so in-flight runs keep working; a follow-up migration will drop it.

CREATE TABLE IF NOT EXISTS product_intel_run_secrets (
  run_id text PRIMARY KEY REFERENCES product_intel_runs(id) ON DELETE CASCADE,
  secret text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS: enable + force, zero policies -> only the owning role can SELECT.
-- Under public_read on product_intel_runs, this table is NOT joined by default policies.
ALTER TABLE product_intel_run_secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_intel_run_secrets FORCE ROW LEVEL SECURITY;
-- Intentionally no CREATE POLICY. Current role (neondb_owner) bypasses via ownership; any role in the future uses explicit GRANTs.

-- Backfill existing rows for continuity during transition:
INSERT INTO product_intel_run_secrets (run_id, secret)
SELECT id, webhook_secret FROM product_intel_runs
WHERE webhook_secret IS NOT NULL
ON CONFLICT (run_id) DO NOTHING;

-- Allow webhook_secret on product_intel_runs to be nullable so new rows can skip it:
ALTER TABLE product_intel_runs ALTER COLUMN webhook_secret DROP NOT NULL;
