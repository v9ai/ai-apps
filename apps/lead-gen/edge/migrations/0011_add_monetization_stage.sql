-- Add monetization stage classification to gh_repos.
-- Set by the classify_llm node based on README + site signals:
--   oss_only          — pure open source, no commercial signals
--   experimenting     — exploring monetization (waitlist, early access, "interested in commercial use")
--   has_pricing       — published pricing tiers / sign-up flow exists
--   has_paying_users  — customer logos, testimonials, "trusted by", case studies
--
-- SQLite ALTER TABLE doesn't support CHECK constraints; the enum is enforced
-- in Python via Literal["oss_only","experimenting","has_pricing","has_paying_users"].
-- Index drives sorting/filtering in any future "ready-to-pitch" query.

ALTER TABLE gh_repos ADD COLUMN monetization_stage TEXT;

CREATE INDEX IF NOT EXISTS idx_gh_repos_monetization_stage
  ON gh_repos(monetization_stage);
