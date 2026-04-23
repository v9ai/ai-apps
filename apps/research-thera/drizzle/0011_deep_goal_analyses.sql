-- Dedicated deep goal analyses table — backs the /goals/[id] deep analysis.
-- Parallel to deep_issue_analyses but keyed on goal_id. Same text-JSON convention.

BEGIN;

CREATE TABLE IF NOT EXISTS deep_goal_analyses (
  id serial PRIMARY KEY,
  goal_id integer NOT NULL,
  user_id text NOT NULL,
  job_id text,
  summary text NOT NULL,
  pattern_clusters text NOT NULL DEFAULT '[]',
  timeline_analysis text NOT NULL DEFAULT '{}',
  family_system_insights text NOT NULL DEFAULT '[]',
  priority_recommendations text NOT NULL DEFAULT '[]',
  research_relevance text NOT NULL DEFAULT '[]',
  parent_advice text NOT NULL DEFAULT '[]',
  data_snapshot text NOT NULL DEFAULT '{}',
  model text NOT NULL DEFAULT 'deepseek-chat',
  created_at text NOT NULL DEFAULT NOW(),
  updated_at text NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deep_goal_analyses_goal_created
  ON deep_goal_analyses (goal_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_deep_goal_analyses_user_created
  ON deep_goal_analyses (user_id, created_at DESC);

COMMIT;

-- =============================================================================
-- DOWN (copy into psql to roll back):
-- =============================================================================
-- BEGIN;
-- DROP INDEX IF EXISTS idx_deep_goal_analyses_user_created;
-- DROP INDEX IF EXISTS idx_deep_goal_analyses_goal_created;
-- DROP TABLE IF EXISTS deep_goal_analyses;
-- COMMIT;
