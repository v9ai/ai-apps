-- Freshness tracking for product/competitor ICP + pricing re-analysis gating.
--
-- Populated by the `freshness` LangGraph endpoint (backend/leadgen_agent/
-- freshness_graph.py). The supervisor in product_intel_graph.py reads
-- freshness_snapshot before committing to cached icp_analysis / competitors:
-- if stale=true, it forces a refresh despite the cache being present.
--
-- Shape of products.freshness_snapshot jsonb:
--   {
--     "checked_at": "2026-04-23T12:34:56+00:00",
--     "url": "https://example.com",
--     "stale": false,
--     "confidence": 0.95,
--     "reason": "same" | "new pricing page" | "content drift" | "unreachable",
--     "content_hash": "sha256:…",
--     "previous_hash": "sha256:…",
--     "previous_run_at": "2026-03-01T00:00:00+00:00"
--   }
--
-- `competitors.last_url_hash` tracks the per-competitor SHA-256 of their
-- normalized scraped markdown. When the next freshness run produces a
-- different hash, that competitor has moved (e.g. new pricing page). This
-- becomes the data source for a "competitor moved" alert.

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS freshness_snapshot jsonb;

ALTER TABLE competitors
  ADD COLUMN IF NOT EXISTS last_url_hash text;

CREATE INDEX IF NOT EXISTS idx_competitors_last_url_hash
  ON competitors (last_url_hash);
