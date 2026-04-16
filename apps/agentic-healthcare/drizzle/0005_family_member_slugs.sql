-- Add slug column (nullable first for backfill)
ALTER TABLE family_members ADD COLUMN slug text;

-- Backfill: lowercase name, replace non-alphanumeric with hyphens, trim hyphens
UPDATE family_members
SET slug = trim(both '-' from regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g'));

-- Handle any empty slugs (edge case)
UPDATE family_members SET slug = id::text WHERE slug IS NULL OR slug = '';

-- Make NOT NULL
ALTER TABLE family_members ALTER COLUMN slug SET NOT NULL;

-- Unique per user
CREATE UNIQUE INDEX family_members_user_slug_idx ON family_members (user_id, slug);
