-- Per-contact ideal-recruiter fit metadata (output of score_recruiter_fit
-- langgraph). Mirrors the lora_* pattern for consistency: score+tier+reasons
-- as columns, scored_at to track freshness. Source of truth duplicates the
-- D1 recruiter_fit_scores audit table — Neon is for joins/filters in the UI,
-- D1 keeps the cross-run history.

ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS recruiter_fit_score real,
  ADD COLUMN IF NOT EXISTS recruiter_fit_tier text,
  ADD COLUMN IF NOT EXISTS recruiter_fit_specialty text,
  ADD COLUMN IF NOT EXISTS recruiter_fit_remote_global boolean,
  ADD COLUMN IF NOT EXISTS recruiter_fit_reasons jsonb,
  ADD COLUMN IF NOT EXISTS recruiter_fit_scored_at text;

CREATE INDEX IF NOT EXISTS idx_contacts_recruiter_fit_tier
  ON contacts(recruiter_fit_tier)
  WHERE recruiter_fit_tier IS NOT NULL;
