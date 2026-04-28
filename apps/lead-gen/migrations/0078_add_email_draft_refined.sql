-- Two-pass email composition bookkeeping.
-- The LangGraph email_compose graph now produces both a draft (pass 1)
-- and a refined (pass 2) version. We persist both for A/B comparison and
-- prompt-version regression analysis.

ALTER TABLE contact_emails
  ADD COLUMN IF NOT EXISTS draft_body text,
  ADD COLUMN IF NOT EXISTS refined_body text,
  ADD COLUMN IF NOT EXISTS prompt_version text,
  ADD COLUMN IF NOT EXISTS model text,
  ADD COLUMN IF NOT EXISTS prompt_tokens integer,
  ADD COLUMN IF NOT EXISTS completion_tokens integer;
