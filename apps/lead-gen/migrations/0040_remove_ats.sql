-- Remove all ATS-related tables and columns (not in Drizzle schema, not referenced in app)

DROP TABLE IF EXISTS "ats_boards";
DROP TABLE IF EXISTS "ashby_boards";
DROP TABLE IF EXISTS "greenhouse_boards";
DROP TABLE IF EXISTS "lever_boards";

ALTER TABLE "jobs"
  DROP COLUMN IF EXISTS "ats_data",
  DROP COLUMN IF EXISTS "ats_created_at";
