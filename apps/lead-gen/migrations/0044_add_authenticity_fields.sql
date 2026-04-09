ALTER TABLE contacts ADD COLUMN authenticity_score real;
ALTER TABLE contacts ADD COLUMN authenticity_verdict text;
ALTER TABLE contacts ADD COLUMN authenticity_flags text;
ALTER TABLE contacts ADD COLUMN verified_at text;
