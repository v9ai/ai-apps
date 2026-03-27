-- Drop jobs-related tables (CRM pivot — jobs removed from application)

-- Drop dependent tables first
DROP TABLE IF EXISTS "job_report_events";
DROP TABLE IF EXISTS "job_skill_tags";
DROP TABLE IF EXISTS "skill_aliases";
DROP TABLE IF EXISTS "jobs";
DROP TABLE IF EXISTS "ashby_boards";
DROP TABLE IF EXISTS "greenhouse_boards";
DROP TABLE IF EXISTS "lever_boards";
DROP TABLE IF EXISTS "job_sources";
DROP TABLE IF EXISTS "user_preferences";

-- Remove job-specific columns from user_settings
ALTER TABLE "user_settings"
  DROP COLUMN IF EXISTS "new_job_alerts",
  DROP COLUMN IF EXISTS "jobs_per_page",
  DROP COLUMN IF EXISTS "preferred_locations",
  DROP COLUMN IF EXISTS "preferred_skills";
