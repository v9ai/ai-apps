-- Cloudflare email routing: `{forwarding_alias}@vadim.blog` → contact.email
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "forwarding_alias" text;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "forwarding_alias_rule_id" text;
