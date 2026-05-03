-- Add top-contributors evidence to gh_lead_research.
-- The repo's top GitHub contributors are the highest-signal source for
-- decision-maker discovery on small-org leads — they're typically the
-- founders / early team. Stored as a JSON array of:
--   { login, name, blog, twitter_username, email, bio, contributions }
-- distilled from the GitHub /repos/:owner/:repo/contributors + /users/:login
-- endpoints (already wrapped by leadgen_agent.gh_patterns_graph.GhClient).

ALTER TABLE gh_lead_research ADD COLUMN contributors_json TEXT;
