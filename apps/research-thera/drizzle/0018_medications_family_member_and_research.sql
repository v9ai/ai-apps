-- Track A: medications.family_member_id (FK to family_members)
ALTER TABLE medications
  ADD COLUMN IF NOT EXISTS family_member_id integer
  REFERENCES family_members(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS medications_family_member_idx
  ON medications(family_member_id);

-- Backfill: link existing Singulair records to Bogdan
UPDATE medications
SET family_member_id = (
  SELECT id FROM family_members WHERE slug = 'bogdan' LIMIT 1
)
WHERE family_member_id IS NULL
  AND lower(name) LIKE 'singulair%';

-- Track B: therapy_research.medication_id (FK to medications)
ALTER TABLE therapy_research
  ADD COLUMN IF NOT EXISTS medication_id uuid
  REFERENCES medications(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS therapy_research_medication_idx
  ON therapy_research(medication_id);
