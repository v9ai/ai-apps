-- 0062_add_competitor_deep_analysis.sql
-- Tables used by leadgen_agent.deep_competitor_graph to record deep-dive
-- findings that don't fit the existing competitor_{pricing_tiers,features,integrations}
-- schema. Safe-idempotent: every table uses IF NOT EXISTS so the migration can
-- be re-run after a partial apply.

CREATE TABLE IF NOT EXISTS competitor_changelog (
  id           SERIAL PRIMARY KEY,
  tenant_id    TEXT,
  competitor_id INTEGER NOT NULL REFERENCES competitors(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  summary      TEXT,
  category     TEXT,                   -- 'feature' | 'pricing' | 'integration' | 'security' | 'other'
  released_at  TEXT,                   -- ISO date from the release notes; NULL if undated
  source_url   TEXT,
  is_recent    BOOLEAN NOT NULL DEFAULT FALSE,  -- true when released within the last 90 days
  created_at   TEXT NOT NULL DEFAULT now()::text
);
CREATE INDEX IF NOT EXISTS idx_competitor_changelog_competitor_id
  ON competitor_changelog(competitor_id);
CREATE INDEX IF NOT EXISTS idx_competitor_changelog_released_at
  ON competitor_changelog(released_at);

CREATE TABLE IF NOT EXISTS competitor_funding_events (
  id             SERIAL PRIMARY KEY,
  tenant_id      TEXT,
  competitor_id  INTEGER NOT NULL REFERENCES competitors(id) ON DELETE CASCADE,
  round_type     TEXT,                 -- 'seed' | 'a' | 'b' | 'c' | 'grant' | ...
  amount_usd     BIGINT,
  announced_at   TEXT,
  investors      JSONB,                -- list of strings
  source_url     TEXT,
  headcount      INTEGER,              -- latest public headcount estimate
  headcount_source_url TEXT,
  created_at     TEXT NOT NULL DEFAULT now()::text
);
CREATE INDEX IF NOT EXISTS idx_competitor_funding_events_competitor_id
  ON competitor_funding_events(competitor_id);

CREATE TABLE IF NOT EXISTS competitor_positioning_snapshots (
  id             SERIAL PRIMARY KEY,
  tenant_id      TEXT,
  competitor_id  INTEGER NOT NULL REFERENCES competitors(id) ON DELETE CASCADE,
  headline       TEXT,
  tagline        TEXT,
  hero_copy      TEXT,
  captured_at    TEXT NOT NULL DEFAULT now()::text,
  diff_summary   TEXT,                 -- LLM-written delta vs previous snapshot
  shift_magnitude REAL                 -- 0..1, reasoner's judgment of how much changed
);
CREATE INDEX IF NOT EXISTS idx_competitor_positioning_snapshots_competitor_id
  ON competitor_positioning_snapshots(competitor_id);

CREATE TABLE IF NOT EXISTS competitor_feature_parity (
  id             SERIAL PRIMARY KEY,
  tenant_id      TEXT,
  competitor_id  INTEGER NOT NULL REFERENCES competitors(id) ON DELETE CASCADE,
  product_id     INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  feature        TEXT NOT NULL,
  we_have_it     BOOLEAN NOT NULL DEFAULT FALSE,
  they_have_it   BOOLEAN NOT NULL DEFAULT FALSE,
  gap_severity   TEXT,                 -- 'none' | 'minor' | 'major' | 'critical'
  note           TEXT,
  created_at     TEXT NOT NULL DEFAULT now()::text
);
CREATE INDEX IF NOT EXISTS idx_competitor_feature_parity_competitor_id
  ON competitor_feature_parity(competitor_id);
CREATE INDEX IF NOT EXISTS idx_competitor_feature_parity_product_id
  ON competitor_feature_parity(product_id);
