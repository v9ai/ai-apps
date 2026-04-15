-- Migrate contact_reminders → generic reminders table
ALTER TABLE "contact_reminders" RENAME TO "reminders";

-- Add polymorphic entity columns
ALTER TABLE "reminders" ADD COLUMN "entity_type" text NOT NULL DEFAULT 'contact';
ALTER TABLE "reminders" ADD COLUMN "entity_id" integer;

-- Backfill entity_id from contact_id
UPDATE "reminders" SET entity_id = contact_id WHERE contact_id IS NOT NULL;

-- Make entity_id NOT NULL and drop contact_id
ALTER TABLE "reminders" ALTER COLUMN "entity_id" SET NOT NULL;
ALTER TABLE "reminders" DROP COLUMN "contact_id";

-- Remove temporary default
ALTER TABLE "reminders" ALTER COLUMN "entity_type" DROP DEFAULT;

-- Replace old index with composite entity index
DROP INDEX IF EXISTS "idx_contact_reminders_contact_id";
CREATE INDEX IF NOT EXISTS "idx_reminders_entity" ON "reminders"("entity_type", "entity_id");

-- Rename remaining indexes
ALTER INDEX IF EXISTS "idx_contact_reminders_remind_at" RENAME TO "idx_reminders_remind_at";
ALTER INDEX IF EXISTS "idx_contact_reminders_status" RENAME TO "idx_reminders_status";
