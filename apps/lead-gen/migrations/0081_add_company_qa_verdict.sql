-- 0081_add_company_qa_verdict.sql
-- Adds the verdict columns written by leadgen_agent.company_qa_graph.
--
-- Hand-written and applied via Neon MCP because pnpm db:generate is broken
-- in this app (project_leadgen_drizzle_snapshot_drift). Apply against project
-- twilight-pond-00008257, db neondb (us-west-2).
--
-- qa_verdict shape (one row per company, last verdict wins):
--   {
--     "is_false_positive": bool,
--     "is_weak":           bool,
--     "reasons":           [string],          -- e.g. ["wrong_taxonomy:high","weak_data:medium"]
--     "confidence":        number,            -- 0..1
--     "model":             string,            -- deepseek model id used
--     "tab":               string,            -- "sales-tech" | other vertical
--     "actual_taxonomy":   [string]           -- LLM's correction, optional
--   }

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS qa_verdict      jsonb,
  ADD COLUMN IF NOT EXISTS qa_verdict_at   timestamptz;

-- Partial index for the "show me false positives" filter on the companies tab.
CREATE INDEX IF NOT EXISTS companies_qa_false_positive_idx
  ON companies ((qa_verdict ->> 'is_false_positive'))
  WHERE qa_verdict IS NOT NULL;
