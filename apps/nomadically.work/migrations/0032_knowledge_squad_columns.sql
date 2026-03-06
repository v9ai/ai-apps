-- Knowledge Squad: Add enrichment columns to jobs table
ALTER TABLE jobs ADD COLUMN salary_min INTEGER;
ALTER TABLE jobs ADD COLUMN salary_max INTEGER;
ALTER TABLE jobs ADD COLUMN salary_currency TEXT;
ALTER TABLE jobs ADD COLUMN visa_sponsorship INTEGER;
ALTER TABLE jobs ADD COLUMN enrichment_status TEXT;

-- Knowledge Squad: Add application strategy column to applications table
ALTER TABLE applications ADD COLUMN ai_application_strategy TEXT;
