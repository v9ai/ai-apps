ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "seniority" text;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "department" text;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "is_decision_maker" boolean DEFAULT false;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "authority_score" real DEFAULT 0.0;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "dm_reasons" text DEFAULT '[]';
