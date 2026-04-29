-- 0006_linkedin_browsemap.sql
-- Captures LinkedIn's "More profiles for you" sidebar (browsemap) shown on a
-- recruiter's profile. Each row = one recommendation edge: source recruiter
-- → recommended profile. Re-scraping the same source is an UPSERT that
-- bumps last_seen_at; first_seen_at survives the conflict.

CREATE TABLE IF NOT EXISTS linkedin_browsemap (
  id                       INTEGER PRIMARY KEY AUTOINCREMENT,
  source_profile_url       TEXT    NOT NULL,
  recommended_profile_url  TEXT    NOT NULL,
  recommended_slug         TEXT    NOT NULL,
  recommended_name         TEXT    NOT NULL,
  recommended_headline     TEXT,
  connection_degree        TEXT,
  is_verified              INTEGER NOT NULL DEFAULT 0,
  is_premium               INTEGER NOT NULL DEFAULT 0,
  avatar_url               TEXT,
  position                 INTEGER,
  first_seen_at            TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at             TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (source_profile_url, recommended_profile_url)
);

CREATE INDEX IF NOT EXISTS idx_browsemap_source      ON linkedin_browsemap(source_profile_url);
CREATE INDEX IF NOT EXISTS idx_browsemap_recommended ON linkedin_browsemap(recommended_profile_url);
CREATE INDEX IF NOT EXISTS idx_browsemap_last_seen   ON linkedin_browsemap(last_seen_at);
