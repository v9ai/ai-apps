ALTER TABLE family_members ADD COLUMN slug TEXT;
-- Backfill: slugify firstName
UPDATE family_members SET slug = LOWER(REPLACE(first_name, ' ', '-')) WHERE slug IS NULL;
-- Add unique index (SQLite doesn't support ADD COLUMN ... UNIQUE)
CREATE UNIQUE INDEX idx_family_members_slug ON family_members(slug);
