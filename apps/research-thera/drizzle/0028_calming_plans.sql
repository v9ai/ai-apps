-- =============================================================================
-- 0028_calming_plans.sql
--
-- Purpose:
--   Persist plant-based / non-pharmacologic calming & behavior plans generated
--   by the `calming_plan` LangGraph. History-preserving — each generation
--   inserts a new row so plans can be compared over time.
--
--   Linked by family_member_id (one Bogdan, many plans).
-- =============================================================================

CREATE TABLE IF NOT EXISTS calming_plans (
  id                 SERIAL PRIMARY KEY,
  family_member_id   INTEGER NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  user_id            TEXT    NOT NULL,
  language           TEXT    NOT NULL DEFAULT 'ro',

  -- Structured plan from the graph (morning/food/movement/evening/supplements/red_flags…).
  plan_json          JSONB   NOT NULL,
  -- Pre-rendered markdown for quick UI display without re-rendering JSON.
  plan_markdown      TEXT    NOT NULL,
  -- Cited papers carried inline (graph does NOT persist to therapy_research).
  sources_json       JSONB   NOT NULL DEFAULT '[]'::jsonb,
  -- Output of the safety_review node (issues caught, substitutions made).
  safety_notes       TEXT,

  generated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_calming_plans_family_member
  ON calming_plans (family_member_id);

CREATE INDEX IF NOT EXISTS idx_calming_plans_user
  ON calming_plans (user_id);

CREATE INDEX IF NOT EXISTS idx_calming_plans_generated_at
  ON calming_plans (generated_at DESC);
