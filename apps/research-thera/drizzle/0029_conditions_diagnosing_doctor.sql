-- =============================================================================
-- 0029_conditions_diagnosing_doctor.sql
--
-- Adds structured attribution: which doctor raised / diagnosed a condition.
-- Free-text "Dr. X said this" in notes is unsearchable and brittle to renames.
--
-- ON DELETE SET NULL — losing a doctor row should not cascade and wipe the
-- patient's condition history.
-- =============================================================================

ALTER TABLE conditions
  ADD COLUMN IF NOT EXISTS diagnosing_doctor_id uuid
    REFERENCES doctors(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS conditions_diagnosing_doctor_idx
  ON conditions (diagnosing_doctor_id);
