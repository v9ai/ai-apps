-- Dedicated routine analyses table — backs the /routines/[slug] deep analysis.
-- Parallel to deep_analyses / deep_issue_analyses but keyed on family_member_id
-- with routine-specific JSON columns (adherence, balance, streaks, gaps,
-- optimization suggestions). Follows the same text-JSON convention.

BEGIN;

CREATE TABLE IF NOT EXISTS routine_analyses (
  id serial PRIMARY KEY,
  family_member_id integer NOT NULL,
  user_id text NOT NULL,
  job_id text,
  summary text NOT NULL,
  adherence_patterns text NOT NULL DEFAULT '[]',
  routine_balance text NOT NULL DEFAULT '{}',
  streaks text NOT NULL DEFAULT '{}',
  gaps text NOT NULL DEFAULT '[]',
  optimization_suggestions text NOT NULL DEFAULT '[]',
  research_relevance text NOT NULL DEFAULT '[]',
  data_snapshot text NOT NULL DEFAULT '{}',
  model text NOT NULL DEFAULT 'deepseek-chat',
  created_at text NOT NULL DEFAULT NOW(),
  updated_at text NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_routine_analyses_family_created
  ON routine_analyses (family_member_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_routine_analyses_user_created
  ON routine_analyses (user_id, created_at DESC);

COMMIT;

-- =============================================================================
-- DOWN (copy into psql to roll back):
-- =============================================================================
-- BEGIN;
-- DROP INDEX IF EXISTS idx_routine_analyses_user_created;
-- DROP INDEX IF EXISTS idx_routine_analyses_family_created;
-- DROP TABLE IF EXISTS routine_analyses;
-- COMMIT;
