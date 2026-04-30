-- Audiobook recommendations from voxa.ro (Romanian audiobook subscription service).
-- Mirrors recommended_movies shape but scoped to a single platform (Voxa) and a
-- single language (Romanian). authors and narrators are JSON arrays stored as
-- TEXT. length_minutes lets the UI show duration. why_recommended is plain
-- prose (no TIER/TAG prefix — single category for now).

BEGIN;

CREATE TABLE IF NOT EXISTS recommended_audiobooks (
  id serial PRIMARY KEY,
  goal_id integer,
  family_member_id integer,
  title text NOT NULL,
  authors text NOT NULL,        -- JSON array
  narrators text,                -- JSON array
  year integer,
  length_minutes integer,
  language text NOT NULL DEFAULT 'ro',
  age_band text,
  voxa_url text,
  cover_url text,
  description text NOT NULL,
  why_recommended text NOT NULL,
  category text NOT NULL,
  generated_at text NOT NULL DEFAULT NOW(),
  created_at text NOT NULL DEFAULT NOW(),
  updated_at text NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recommended_audiobooks_goal ON recommended_audiobooks (goal_id);
CREATE INDEX IF NOT EXISTS idx_recommended_audiobooks_family_member ON recommended_audiobooks (family_member_id);
CREATE INDEX IF NOT EXISTS idx_recommended_audiobooks_category ON recommended_audiobooks (category);

COMMIT;

-- =============================================================================
-- DOWN (copy into psql to roll back):
-- =============================================================================
-- BEGIN;
-- DROP INDEX IF EXISTS idx_recommended_audiobooks_category;
-- DROP INDEX IF EXISTS idx_recommended_audiobooks_family_member;
-- DROP INDEX IF EXISTS idx_recommended_audiobooks_goal;
-- DROP TABLE IF EXISTS recommended_audiobooks;
-- COMMIT;
