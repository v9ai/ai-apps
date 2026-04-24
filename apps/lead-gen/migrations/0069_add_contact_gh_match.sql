ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "gh_match_score" real;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "gh_match_status" text;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "gh_match_arm" text;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "gh_match_evidence_ref" text;
