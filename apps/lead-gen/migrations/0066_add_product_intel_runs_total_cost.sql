-- Cost + latency telemetry at the run level.
--
-- Per-node telemetry lives in graph_meta.telemetry (each node: model,
-- input/output/total tokens, cost_usd, latency_ms). The terminal node
-- aggregates via leadgen_agent.llm.compute_totals() and writes the
-- run-level total into this column so it's queryable without unpacking
-- jsonb.
--
-- Example query:
--   SELECT date_trunc('day', started_at) AS day,
--          SUM(total_cost_usd) AS spend
--   FROM product_intel_runs
--   WHERE status = 'success'
--   GROUP BY 1 ORDER BY 1 DESC;
--
-- Stored as numeric(10,6) — room for 9999.999999 USD, plenty of headroom
-- for any single run. Populated best-effort; NULL means the run predates
-- telemetry or the LLM wrapper was bypassed.

ALTER TABLE "product_intel_runs"
  ADD COLUMN IF NOT EXISTS "total_cost_usd" numeric(10, 6);

CREATE INDEX IF NOT EXISTS idx_intel_runs_cost
  ON product_intel_runs (total_cost_usd DESC)
  WHERE status = 'success';
