-- Mirror of Neon `companies.blocked = true` rows, keyed in the
-- companyKey() format used by edge/src/index.ts. Populated by
-- apps/lead-gen/scripts/sync-blocklist-d1.ts; read by handleJobsD1Import
-- to drop blocked companies before insert.

CREATE TABLE IF NOT EXISTS blocked_company_keys (
  key        TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  source     TEXT NOT NULL DEFAULT 'neon-sync',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
