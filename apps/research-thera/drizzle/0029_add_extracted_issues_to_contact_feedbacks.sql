-- Add extracted_issues JSON column to contact_feedbacks
ALTER TABLE contact_feedbacks ADD COLUMN extracted_issues TEXT;
