ALTER TABLE blood_tests
  ADD COLUMN IF NOT EXISTS family_member_id integer REFERENCES family_members(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS blood_tests_family_idx ON blood_tests (family_member_id);
