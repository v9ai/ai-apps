ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "lora_tier" text;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "lora_reasons" jsonb;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "lora_scored_at" text;
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_lora_tier_check" CHECK (lora_tier IS NULL OR lora_tier IN ('A','B','C','D'));
CREATE INDEX IF NOT EXISTS "idx_contacts_lora_tier" ON "contacts" ("lora_tier") WHERE lora_tier IS NOT NULL;
