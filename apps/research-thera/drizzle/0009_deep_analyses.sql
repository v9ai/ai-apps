-- Polymorphic deep analyses table. Parallel to deep_issue_analyses but keyed
-- on (subject_type, subject_id) so it serves Goals, Notes, Journal Entries,
-- and Family Members from a single table.
--
-- The existing deep_issue_analyses table is intentionally left untouched — the
-- issue-triggered flow continues to use it.

BEGIN;

CREATE TABLE IF NOT EXISTS deep_analyses (
  id serial PRIMARY KEY,
  subject_type text NOT NULL,
  subject_id integer NOT NULL,
  trigger_type text,
  trigger_id integer,
  user_id text NOT NULL,
  job_id text,
  summary text NOT NULL,
  pattern_clusters text NOT NULL,
  timeline_analysis text NOT NULL,
  family_system_insights text NOT NULL,
  priority_recommendations text NOT NULL,
  research_relevance text NOT NULL,
  parent_advice text NOT NULL DEFAULT '[]',
  data_snapshot text NOT NULL,
  model text NOT NULL DEFAULT 'deepseek-chat',
  created_at text NOT NULL DEFAULT NOW(),
  updated_at text NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deep_analyses_subject
  ON deep_analyses (subject_type, subject_id, user_id);

CREATE INDEX IF NOT EXISTS idx_deep_analyses_user_created
  ON deep_analyses (user_id, created_at DESC);

-- RLS intentionally NOT enabled on this table to match the rest of the live
-- production schema (the 0005 RLS migration has not been applied; auth is
-- enforced in the app/resolver layer via user_id filters). If RLS ever goes
-- live project-wide, add here:
--   ALTER TABLE deep_analyses ENABLE ROW LEVEL SECURITY;
--   ALTER TABLE deep_analyses FORCE ROW LEVEL SECURITY;
--   CREATE POLICY user_isolation ON deep_analyses
--     USING (user_id = app_current_user_id())
--     WITH CHECK (user_id = app_current_user_id());

COMMIT;

-- =============================================================================
-- DOWN (copy into psql to roll back):
-- =============================================================================
-- BEGIN;
-- DROP POLICY IF EXISTS user_isolation ON deep_analyses;
-- DROP INDEX IF EXISTS idx_deep_analyses_user_created;
-- DROP INDEX IF EXISTS idx_deep_analyses_subject;
-- DROP TABLE IF EXISTS deep_analyses;
-- COMMIT;
