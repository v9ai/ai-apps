-- Migration: Add pipeline tables for CF Workers (Neon PostgreSQL)
-- Replaces the SQLite/D1 equivalents from migrations 0013 and 0018.

CREATE TABLE IF NOT EXISTS greenhouse_boards (
  id SERIAL PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  url TEXT,
  first_seen TEXT NOT NULL DEFAULT (now())::text,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TEXT NOT NULL DEFAULT (now())::text,
  updated_at TEXT NOT NULL DEFAULT (now())::text
);

CREATE TABLE IF NOT EXISTS lever_boards (
  id SERIAL PRIMARY KEY,
  site TEXT NOT NULL UNIQUE,
  url TEXT,
  first_seen TEXT NOT NULL DEFAULT (now())::text,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TEXT NOT NULL DEFAULT (now())::text,
  updated_at TEXT NOT NULL DEFAULT (now())::text
);

CREATE TABLE IF NOT EXISTS job_sources (
  id SERIAL PRIMARY KEY,
  kind TEXT NOT NULL,
  company_key TEXT NOT NULL,
  canonical_url TEXT,
  first_seen_at TEXT NOT NULL DEFAULT (now())::text,
  last_synced_at TEXT,
  last_fetched_at TEXT,
  consecutive_errors INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT uq_job_sources_kind_key UNIQUE (kind, company_key)
);

CREATE INDEX IF NOT EXISTS idx_job_sources_kind ON job_sources(kind);
CREATE INDEX IF NOT EXISTS idx_job_sources_company_key ON job_sources(company_key);
CREATE INDEX IF NOT EXISTS idx_job_sources_last_fetched ON job_sources(last_fetched_at NULLS FIRST);
