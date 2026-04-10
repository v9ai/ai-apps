-- Migration: Add Voyager API data storage
-- New columns on linkedin_posts + 3 new tables: voyager_job_counts, voyager_sessions, voyager_sync_log

-- 1. New columns on linkedin_posts for Voyager API fields
ALTER TABLE "linkedin_posts" ADD COLUMN IF NOT EXISTS "voyager_urn" text;
ALTER TABLE "linkedin_posts" ADD COLUMN IF NOT EXISTS "voyager_workplace_type" text;
ALTER TABLE "linkedin_posts" ADD COLUMN IF NOT EXISTS "voyager_salary_min" integer;
ALTER TABLE "linkedin_posts" ADD COLUMN IF NOT EXISTS "voyager_salary_max" integer;
ALTER TABLE "linkedin_posts" ADD COLUMN IF NOT EXISTS "voyager_salary_currency" text;
ALTER TABLE "linkedin_posts" ADD COLUMN IF NOT EXISTS "voyager_apply_url" text;
ALTER TABLE "linkedin_posts" ADD COLUMN IF NOT EXISTS "voyager_poster_urn" text;
ALTER TABLE "linkedin_posts" ADD COLUMN IF NOT EXISTS "voyager_listed_at" text;
ALTER TABLE "linkedin_posts" ADD COLUMN IF NOT EXISTS "voyager_reposted" boolean DEFAULT false;

-- Indexes on new linkedin_posts columns
CREATE UNIQUE INDEX IF NOT EXISTS "idx_linkedin_posts_voyager_urn" ON "linkedin_posts" ("voyager_urn");
CREATE INDEX IF NOT EXISTS "idx_linkedin_posts_workplace_type" ON "linkedin_posts" ("voyager_workplace_type");

-- 2. voyager_job_counts — remote job count snapshots per company/query
CREATE TABLE IF NOT EXISTS "voyager_job_counts" (
  "id" serial PRIMARY KEY,
  "company_id" integer REFERENCES "companies"("id") ON DELETE CASCADE,
  "query" text NOT NULL,
  "remote_count" integer NOT NULL DEFAULT 0,
  "total_count" integer NOT NULL DEFAULT 0,
  "counted_at" text NOT NULL DEFAULT now()::text
);

CREATE INDEX IF NOT EXISTS "idx_voyager_job_counts_company_id" ON "voyager_job_counts" ("company_id");
CREATE INDEX IF NOT EXISTS "idx_voyager_job_counts_query" ON "voyager_job_counts" ("query");
CREATE INDEX IF NOT EXISTS "idx_voyager_job_counts_counted_at" ON "voyager_job_counts" ("counted_at");
CREATE INDEX IF NOT EXISTS "idx_voyager_job_counts_company_query" ON "voyager_job_counts" ("company_id", "query");

-- 3. voyager_sessions — LinkedIn API session management
CREATE TABLE IF NOT EXISTS "voyager_sessions" (
  "id" serial PRIMARY KEY,
  "session_id" text NOT NULL UNIQUE,
  "li_at" text NOT NULL,
  "jsessionid" text NOT NULL,
  "csrf_token" text NOT NULL,
  "user_agent" text NOT NULL,
  "last_used" text NOT NULL DEFAULT now()::text,
  "request_count" integer NOT NULL DEFAULT 0,
  "is_healthy" boolean NOT NULL DEFAULT true,
  "created_at" text NOT NULL DEFAULT now()::text
);

CREATE INDEX IF NOT EXISTS "idx_voyager_sessions_is_healthy" ON "voyager_sessions" ("is_healthy");
CREATE INDEX IF NOT EXISTS "idx_voyager_sessions_last_used" ON "voyager_sessions" ("last_used");

-- 4. voyager_sync_log — sync operation tracking
CREATE TABLE IF NOT EXISTS "voyager_sync_log" (
  "id" serial PRIMARY KEY,
  "sync_id" text NOT NULL UNIQUE,
  "query" text NOT NULL,
  "jobs_found" integer NOT NULL DEFAULT 0,
  "jobs_new" integer NOT NULL DEFAULT 0,
  "jobs_updated" integer NOT NULL DEFAULT 0,
  "started_at" text NOT NULL,
  "completed_at" text,
  "errors" text,
  "created_at" text NOT NULL DEFAULT now()::text
);

CREATE INDEX IF NOT EXISTS "idx_voyager_sync_log_started_at" ON "voyager_sync_log" ("started_at");
CREATE INDEX IF NOT EXISTS "idx_voyager_sync_log_query" ON "voyager_sync_log" ("query");
