-- Async-run tracking table for the pricing / gtm / product_intel LangGraph
-- endpoints. Rows are created by the GraphQL kickoff mutations and closed out
-- by /api/webhooks/langgraph (or the sweeper cron for runs that never
-- complete). See src/lib/langgraph-client.ts::startGraphRun.

CREATE TABLE IF NOT EXISTS "product_intel_runs" (
  "id" text PRIMARY KEY,                    -- our UUID, passed as metadata.app_run_id
  "lg_run_id" text,                         -- LangGraph's run_id (populated after POST /runs)
  "lg_thread_id" text,
  "product_id" integer NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
  "tenant_id" text NOT NULL
    DEFAULT COALESCE(NULLIF(current_setting('app.tenant', true), ''), 'vadim'),
  "kind" text NOT NULL,                     -- 'pricing' | 'gtm' | 'product_intel' | 'icp'
  "status" text NOT NULL DEFAULT 'queued',  -- queued | running | success | error | timeout
  "webhook_secret" text NOT NULL,
  "started_at" timestamptz NOT NULL DEFAULT now(),
  "finished_at" timestamptz,
  "error" text,
  "output" jsonb,
  "created_by" text
);

CREATE INDEX IF NOT EXISTS "idx_intel_runs_product_id" ON "product_intel_runs"("product_id");
CREATE INDEX IF NOT EXISTS "idx_intel_runs_status" ON "product_intel_runs"("status");
CREATE INDEX IF NOT EXISTS "idx_intel_runs_tenant" ON "product_intel_runs"("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_intel_runs_started" ON "product_intel_runs"("started_at" DESC);

-- RLS using the same app.tenant GUC as the rest of the schema (see 0049).
ALTER TABLE "product_intel_runs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "product_intel_runs" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "product_intel_runs";
CREATE POLICY tenant_isolation ON "product_intel_runs"
  USING (
    current_setting('app.tenant', true) IS NULL
    OR current_setting('app.tenant', true) = ''
    OR tenant_id = current_setting('app.tenant', true)
  )
  WITH CHECK (
    current_setting('app.tenant', true) IS NULL
    OR current_setting('app.tenant', true) = ''
    OR tenant_id = current_setting('app.tenant', true)
  );
