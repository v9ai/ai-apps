-- Delete all hidden companies and their related data
DELETE FROM company_facts WHERE company_id IN (SELECT id FROM companies WHERE is_hidden = 1);
DELETE FROM company_snapshots WHERE company_id IN (SELECT id FROM companies WHERE is_hidden = 1);
DELETE FROM ats_boards WHERE company_id IN (SELECT id FROM companies WHERE is_hidden = 1);
DELETE FROM contacts WHERE company_id IN (SELECT id FROM companies WHERE is_hidden = 1);
DELETE FROM opportunities WHERE company_id IN (SELECT id FROM companies WHERE is_hidden = 1);
DELETE FROM companies WHERE is_hidden = 1;

-- Drop the is_hidden column (requires SQLite 3.35+, D1 uses 3.44+)
ALTER TABLE companies DROP COLUMN is_hidden;
