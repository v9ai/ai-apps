ALTER TABLE "journal_entries" ADD COLUMN IF NOT EXISTS "is_vault" integer NOT NULL DEFAULT 0;
