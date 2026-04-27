-- Per-family-member preferred display language.
--
-- Drives "consumer-facing" output in workflows that emit text the family
-- reads — the medication deep-research graph reads this and switches the
-- LLM extraction prompt to Romanian for members whose preferred_language
-- is 'ro'. Null = inherit caller's explicit language or default to 'en'.

ALTER TABLE family_members
  ADD COLUMN IF NOT EXISTS preferred_language text;

-- Bogdan: Romanian-speaking child. Seed the value so the medication
-- deep-research workflow auto-picks Romanian for his data.
UPDATE family_members
SET preferred_language = 'ro'
WHERE slug = 'bogdan' AND preferred_language IS NULL;
