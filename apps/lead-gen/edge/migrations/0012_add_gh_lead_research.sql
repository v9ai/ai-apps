-- Per-repo deep-research output for the gh_lead_research LangGraph.
-- One row per gh_repos row. Populated by fetching the org homepage,
-- /pricing, /careers, /about + a Brave web search, then LLM-synthesizing
-- founder/fundraise/pitch fields.
--
-- decision_makers is stored as inline JSON (not a separate table) — typical
-- count is 1-3 per org and we never join across them. If that changes,
-- migrate to a `gh_decision_makers` child table.

CREATE TABLE IF NOT EXISTS gh_lead_research (
  id                       INTEGER PRIMARY KEY AUTOINCREMENT,
  repo_id                  INTEGER NOT NULL UNIQUE REFERENCES gh_repos(id) ON DELETE CASCADE,
  org_id                   INTEGER REFERENCES gh_orgs(id) ON DELETE SET NULL,

  -- Page-fetch evidence
  homepage_url             TEXT,
  homepage_status          INTEGER,
  pricing_url              TEXT,
  pricing_status           INTEGER,
  pricing_excerpt          TEXT,
  careers_url              TEXT,
  careers_status           INTEGER,
  careers_excerpt          TEXT,
  about_url                TEXT,
  about_status             INTEGER,
  about_excerpt            TEXT,

  -- Brave web search evidence (JSON array of {title, url, description})
  web_search_results_json  TEXT,

  -- LLM-synthesized fields
  recent_fundraise         TEXT,                -- e.g., "Seed $3M led by FoundersFund (Dec 2024)"
  recent_launch            TEXT,                -- e.g., "Launched v2 March 2025 with new pricing"
  team_size_signal         TEXT,                -- e.g., "small (<10), 3 listed founders"
  icp_fit_summary          TEXT,                -- 2-3 sentences on B2B fit
  pitch_one_liner          TEXT,                -- paste-ready first line of cold email
  decision_makers_json     TEXT,                -- JSON array of {name, title, linkedin, twitter, email, source}
  evidence_urls_json       TEXT,                -- JSON array of supporting URLs
  llm_confidence           REAL,                -- 0..1

  researched_at            TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_gh_lead_research_org_id        ON gh_lead_research(org_id);
CREATE INDEX IF NOT EXISTS idx_gh_lead_research_researched_at ON gh_lead_research(researched_at DESC);
