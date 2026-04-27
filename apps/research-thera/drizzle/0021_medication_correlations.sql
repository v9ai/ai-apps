-- Per-patient correlations between a medication regimen and the patient's
-- own clinical data (issues + journal entries + observations).
--
-- One row per detected relationship. The medication_deep_research workflow
-- writes these after the deep-fact extraction so the medication detail page
-- can render "what does Singulair mean for THIS patient?" — e.g. flagging
-- when Bogdan's documented sleep disturbance matches the BBW pattern.

CREATE TABLE IF NOT EXISTS medication_correlations (
  id                   bigserial PRIMARY KEY,
  medication_id        uuid NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
  family_member_id     integer REFERENCES family_members(id) ON DELETE SET NULL,
  related_entity_type  text NOT NULL CHECK (related_entity_type IN ('issue','journal_entry','observation','teacher_feedback')),
  related_entity_id    bigint NOT NULL,
  correlation_type     text NOT NULL CHECK (correlation_type IN ('possible_side_effect','indication_match','temporal','other')),
  confidence           integer NOT NULL DEFAULT 50,
  rationale            text,
  matched_fact         text,        -- e.g. "black-box: neuropsychiatric events" or "indication: asthma"
  created_at           timestamptz NOT NULL DEFAULT NOW(),
  UNIQUE (medication_id, related_entity_type, related_entity_id, correlation_type)
);

CREATE INDEX IF NOT EXISTS medication_correlations_med_idx
  ON medication_correlations(medication_id);
CREATE INDEX IF NOT EXISTS medication_correlations_fm_idx
  ON medication_correlations(family_member_id);
