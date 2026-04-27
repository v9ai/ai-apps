ALTER TABLE condition_deep_research
  ADD COLUMN IF NOT EXISTS proximity_assessment jsonb;

ALTER TABLE condition_deep_research
  ADD COLUMN IF NOT EXISTS criteria_match jsonb;
