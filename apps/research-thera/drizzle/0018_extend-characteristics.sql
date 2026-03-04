-- Migration number: 0018 	 2026-02-28T08:31:08.053Z
ALTER TABLE family_member_characteristics ADD COLUMN severity TEXT;
ALTER TABLE family_member_characteristics ADD COLUMN frequency_per_week INTEGER;
ALTER TABLE family_member_characteristics ADD COLUMN duration_weeks INTEGER;
ALTER TABLE family_member_characteristics ADD COLUMN age_of_onset INTEGER;
ALTER TABLE family_member_characteristics ADD COLUMN impairment_domains TEXT;
ALTER TABLE family_member_characteristics ADD COLUMN formulation_status TEXT NOT NULL DEFAULT 'DRAFT';
ALTER TABLE family_member_characteristics ADD COLUMN externalized_name TEXT;
ALTER TABLE family_member_characteristics ADD COLUMN strengths TEXT;
ALTER TABLE family_member_characteristics ADD COLUMN risk_tier TEXT NOT NULL DEFAULT 'NONE';
UPDATE family_member_characteristics SET category = 'STRENGTH' WHERE category = 'TRAIT';
UPDATE family_member_characteristics SET category = 'SUPPORT_NEED' WHERE category = 'ISSUE';
UPDATE family_member_characteristics SET category = 'PRIORITY_CONCERN' WHERE category = 'PROBLEM';
