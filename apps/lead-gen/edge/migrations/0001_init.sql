-- D1 schema for the chrome-extension "Import all opportunities" flow.
-- Mirrors the relevant subset of Postgres companies + opportunities
-- (apps/lead-gen/src/db/schema.ts:416 and packages/company-intel/src/schema.ts:20).

CREATE TABLE IF NOT EXISTS companies (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  key           TEXT    NOT NULL UNIQUE,
  name          TEXT    NOT NULL,
  linkedin_url  TEXT,
  website       TEXT,
  location      TEXT,
  created_at    TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS opportunities (
  id           TEXT    PRIMARY KEY,
  title        TEXT    NOT NULL,
  url          TEXT    UNIQUE,
  source       TEXT    NOT NULL DEFAULT 'linkedin',
  status       TEXT    NOT NULL DEFAULT 'open',
  raw_context  TEXT,
  metadata     TEXT,
  tags         TEXT,
  company_id   INTEGER REFERENCES companies(id) ON DELETE SET NULL,
  location     TEXT,
  salary       TEXT,
  archived     INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_opportunities_company_id ON opportunities(company_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_status     ON opportunities(status);
CREATE INDEX IF NOT EXISTS idx_opportunities_url        ON opportunities(url);
