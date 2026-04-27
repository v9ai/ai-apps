-- Rename `contacts.ai_profile` → `contacts.profile`. Drops the redundant
-- `ai_` prefix on the column that holds the synthesized contact-enrichment
-- payload (LinkedIn + GitHub + paper signals merged by gatherAIContactProfile).
-- Other `*_profile` columns on this table (linkedin_profile, github_profile,
-- openalex_profile, orcid_profile, scholar_profile) hold raw per-source data;
-- this column is the merged synthesis layer.

ALTER TABLE contacts RENAME COLUMN ai_profile TO profile;
