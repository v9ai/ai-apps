-- Streaming progress snapshot for async LangGraph runs.
--
-- Each graph node writes a lightweight JSON blob here on entry (see
-- backend/leadgen_agent/notify.py::update_progress). Vercel poll-UI reads it
-- via the productIntelRun(id) GraphQL query so we never hit LangGraph
-- directly from the browser.
--
-- Shape:
--   {
--     "stage": "run_pricing",
--     "subgraph_node": "design_model",       -- optional
--     "elapsed_ms": 42000,
--     "completed_stages": ["load_and_profile","ensure_icp"]
--   }
--
-- Writes are best-effort; a failed UPDATE must never crash a graph (the
-- helper logs and swallows). The public_read RLS policy from migration 0059
-- already covers this table, so no new policy is needed.

ALTER TABLE "product_intel_runs"
  ADD COLUMN IF NOT EXISTS "progress" jsonb;
