-- 0005_contact_visits.sql
-- Audit + dedup table for the chrome extension's "Browse Recruiters" loop.
-- One row per LinkedIn profile URL; visited_at is updated on conflict.
-- ok=0 records failed visits (auth wall / extraction blocked / not-a-recruiter)
-- so the dedup check can choose whether a fast retry is appropriate.

CREATE TABLE IF NOT EXISTS contact_visits (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  contact_id   INTEGER NOT NULL,
  linkedin_url TEXT    NOT NULL UNIQUE,
  visited_at   TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ok           INTEGER NOT NULL DEFAULT 1,
  reason       TEXT
);

CREATE INDEX IF NOT EXISTS idx_contact_visits_contact_id ON contact_visits(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_visits_visited_at ON contact_visits(visited_at);
