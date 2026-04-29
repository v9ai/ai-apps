-- =============================================================================
-- 0027_vehicles_slug.sql
--
-- Purpose:
--   Add slug column to vehicles so URLs can be /vehicles/<slug> instead of UUID.
--   Unique per user (a user can't have two vehicles with the same slug, but
--   different users can each have their own "st-120").
-- =============================================================================

ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS slug text;

CREATE UNIQUE INDEX IF NOT EXISTS vehicles_user_slug_unique
  ON vehicles (user_id, slug)
  WHERE slug IS NOT NULL;
