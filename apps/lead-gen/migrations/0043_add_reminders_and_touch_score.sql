-- ML touch score fields on contacts
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "next_touch_score" real DEFAULT 0.0;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "last_contacted_at" text;

-- Per-contact reminder table
CREATE TABLE IF NOT EXISTS "contact_reminders" (
  "id"            serial PRIMARY KEY,
  "contact_id"    integer NOT NULL REFERENCES "contacts"("id") ON DELETE CASCADE,
  "remind_at"     text NOT NULL,
  "recurrence"    text NOT NULL DEFAULT 'none',
  "note"          text,
  "status"        text NOT NULL DEFAULT 'pending',
  "snoozed_until" text,
  "created_at"    text NOT NULL DEFAULT now()::text,
  "updated_at"    text NOT NULL DEFAULT now()::text
);

CREATE INDEX IF NOT EXISTS "idx_contact_reminders_contact_id" ON "contact_reminders"("contact_id");
CREATE INDEX IF NOT EXISTS "idx_contact_reminders_remind_at"  ON "contact_reminders"("remind_at");
CREATE INDEX IF NOT EXISTS "idx_contact_reminders_status"     ON "contact_reminders"("status");
