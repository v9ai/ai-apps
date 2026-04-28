ALTER TABLE blood_tests
  ADD COLUMN family_member_id integer REFERENCES family_members(id) ON DELETE SET NULL;

CREATE INDEX blood_tests_family_member_idx ON blood_tests (family_member_id);
