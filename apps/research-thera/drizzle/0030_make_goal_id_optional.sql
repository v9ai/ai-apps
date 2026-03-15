-- Migration: make goal_id optional in therapy_research and generation_jobs
-- SQLite doesn't support ALTER COLUMN, so we recreate the tables.

-- 1. therapy_research: make goal_id nullable
CREATE TABLE therapy_research_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  goal_id INTEGER,
  therapeutic_goal_type TEXT NOT NULL,
  title TEXT NOT NULL,
  authors TEXT NOT NULL,
  year INTEGER,
  journal TEXT,
  doi TEXT,
  url TEXT,
  abstract TEXT,
  key_findings TEXT NOT NULL,
  therapeutic_techniques TEXT NOT NULL,
  evidence_level TEXT,
  characteristic_id INTEGER,
  relevance_score INTEGER NOT NULL,
  extracted_by TEXT NOT NULL,
  extraction_confidence INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO therapy_research_new (id, goal_id, therapeutic_goal_type, title, authors, year, journal, doi, url, abstract, key_findings, therapeutic_techniques, evidence_level, characteristic_id, relevance_score, extracted_by, extraction_confidence, created_at, updated_at)
  SELECT id, goal_id, therapeutic_goal_type, title, authors, year, journal, doi, url, abstract, key_findings, therapeutic_techniques, evidence_level, characteristic_id, relevance_score, extracted_by, extraction_confidence,
    COALESCE(created_at, datetime('now')),
    COALESCE(updated_at, datetime('now'))
  FROM therapy_research;

DROP TABLE therapy_research;
ALTER TABLE therapy_research_new RENAME TO therapy_research;

-- 2. generation_jobs: make goal_id nullable
CREATE TABLE generation_jobs_new (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  goal_id INTEGER,
  story_id INTEGER,
  status TEXT NOT NULL,
  progress INTEGER NOT NULL DEFAULT 0,
  result TEXT,
  error TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO generation_jobs_new (id, user_id, type, goal_id, story_id, status, progress, result, error, created_at, updated_at)
  SELECT id, user_id, type, goal_id, story_id, status, progress, result, error,
    COALESCE(created_at, datetime('now')),
    COALESCE(updated_at, datetime('now'))
  FROM generation_jobs;

DROP TABLE generation_jobs;
ALTER TABLE generation_jobs_new RENAME TO generation_jobs;
