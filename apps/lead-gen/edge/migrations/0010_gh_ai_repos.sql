-- Side-channel D1 store for the gh_ai_repos LangGraph.
-- Intentionally NOT mirrored to Neon companies — these orgs are kept
-- isolated from the main lead-gen catalog so downstream pipelines
-- (email_outreach, contact_discovery, /products/[slug]/leads) do not
-- automatically pick them up.

CREATE TABLE IF NOT EXISTS gh_orgs (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  github_login     TEXT    NOT NULL UNIQUE,
  name             TEXT,
  blog             TEXT,
  twitter_username TEXT,
  email            TEXT,
  location         TEXT,
  public_members   INTEGER,
  public_repos     INTEGER,
  ai_repo_count    INTEGER,
  total_org_stars  INTEGER,
  flagship_repo    TEXT,
  first_seen_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at     TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_gh_orgs_total_stars  ON gh_orgs(total_org_stars DESC);
CREATE INDEX IF NOT EXISTS idx_gh_orgs_last_seen_at ON gh_orgs(last_seen_at DESC);

CREATE TABLE IF NOT EXISTS gh_repos (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name          TEXT    NOT NULL UNIQUE,
  org_id             INTEGER REFERENCES gh_orgs(id) ON DELETE CASCADE,
  html_url           TEXT    NOT NULL,
  owner_login        TEXT    NOT NULL,
  owner_type         TEXT,
  description        TEXT,
  topics_json        TEXT,
  matched_topic      TEXT,
  stars              INTEGER NOT NULL,
  forks              INTEGER,
  watchers           INTEGER,
  language           TEXT,
  default_branch     TEXT,
  pushed_at          TEXT,
  homepage           TEXT,
  license_spdx       TEXT,
  archived           INTEGER NOT NULL DEFAULT 0,
  fork               INTEGER NOT NULL DEFAULT 0,
  has_readme         INTEGER NOT NULL DEFAULT 0,
  contributors_count INTEGER,
  heuristic_score    REAL,
  llm_score          REAL,
  llm_confidence     REAL,
  final_score        REAL    NOT NULL,
  score_reasons      TEXT,
  buyer_persona      TEXT,
  commercial_intent  TEXT,
  pain_points        TEXT,
  pitch_angle        TEXT,
  why_now            TEXT,
  brief_json         TEXT,
  first_seen_at      TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at       TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_gh_repos_org_id       ON gh_repos(org_id);
CREATE INDEX IF NOT EXISTS idx_gh_repos_final_score  ON gh_repos(final_score DESC);
CREATE INDEX IF NOT EXISTS idx_gh_repos_pushed_at    ON gh_repos(pushed_at DESC);
CREATE INDEX IF NOT EXISTS idx_gh_repos_last_seen_at ON gh_repos(last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_gh_repos_matched_topic ON gh_repos(matched_topic);
