ALTER TABLE contacts ADD COLUMN slug TEXT;
-- Backfill: slugify firstName
UPDATE contacts SET slug = LOWER(REPLACE(first_name, ' ', '-')) WHERE slug IS NULL;
-- Add unique index (SQLite doesn't support ADD COLUMN ... UNIQUE)
CREATE UNIQUE INDEX idx_contacts_slug ON contacts(slug);
