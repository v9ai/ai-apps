-- 0007_recruiter_fit_scores.sql
-- Output of the score_recruiter_fit langgraph (backend/leadgen_agent/score_recruiter_fit_graph.py).
-- One row per LinkedIn profile; updated on re-score. Decoupled from contact_visits
-- because re-scoring is independent of visit cadence (we may rescore offline later).

CREATE TABLE IF NOT EXISTS recruiter_fit_scores (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  contact_id    INTEGER,
  linkedin_url  TEXT    NOT NULL UNIQUE,
  fit_score     REAL    NOT NULL,
  tier          TEXT    NOT NULL,            -- ideal | strong | weak | off_target
  specialty     TEXT    NOT NULL,            -- ai_ml | engineering_general | non_technical | unknown
  remote_global INTEGER,                     -- 1=true, 0=false, NULL=unclear
  reasons       TEXT    NOT NULL DEFAULT '[]', -- JSON array of <=3 short strings
  scored_at     TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_recruiter_fit_scores_contact_id ON recruiter_fit_scores(contact_id);
CREATE INDEX IF NOT EXISTS idx_recruiter_fit_scores_tier ON recruiter_fit_scores(tier);
CREATE INDEX IF NOT EXISTS idx_recruiter_fit_scores_scored_at ON recruiter_fit_scores(scored_at);
