-- Partial unique index on contacts.github_handle for GitHub contributor upserts.
-- Allows ON CONFLICT (github_handle) WHERE github_handle IS NOT NULL in the
-- export_contributors binary (crates/github-patterns).
CREATE UNIQUE INDEX IF NOT EXISTS idx_contacts_github_handle
  ON contacts(github_handle)
  WHERE github_handle IS NOT NULL;
