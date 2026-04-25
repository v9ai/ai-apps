-- Paper-author enrichment columns. Each new fan-out branch in
-- contact_enrich_paper_author_graph.py owns one column.
--
-- gh_match_* and github_handle were added in earlier migrations
-- (0069 + the one that added github_handle on contacts) — keep them.

ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "github_profile"   jsonb;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "orcid_profile"    jsonb;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "scholar_profile"  jsonb;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "homepage_url"     text;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "homepage_extract" jsonb;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "email_candidates" jsonb;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "enrich_status"    jsonb;

CREATE INDEX IF NOT EXISTS "idx_contacts_github_profile_login"
  ON "contacts" ((github_profile->>'login'))
  WHERE github_profile IS NOT NULL;

CREATE INDEX IF NOT EXISTS "idx_contacts_orcid_present"
  ON "contacts" (id) WHERE orcid_profile IS NOT NULL;

CREATE INDEX IF NOT EXISTS "idx_contacts_email_candidates_first"
  ON "contacts" ((email_candidates->0->>'email'))
  WHERE email_candidates IS NOT NULL;

-- One-shot cleanup: drop noisy openalex:topic:* free-text tags so the next
-- batch enrichment run re-derives clean topic:<slug> tags from the controlled
-- vocabulary in topic_taxonomy.py. _merge_tags_with_topics now strips both
-- prefixes before re-deriving so this is idempotent.
UPDATE "contacts"
SET "tags" = (
  SELECT COALESCE(jsonb_agg(t)::text, '[]')
  FROM jsonb_array_elements_text(tags::jsonb) t
  WHERE t NOT LIKE 'openalex:topic:%'
)
WHERE "tags" ILIKE '%openalex:topic:%';
