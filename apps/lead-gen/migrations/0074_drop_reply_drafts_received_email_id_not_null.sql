-- Allow cold-outreach drafts (no inbound email) to live in reply_drafts.
-- The "outreach" addition to the draft_type enum is TS-only (column is plain text, no CHECK constraint).
-- Already applied to production Neon (twilight-pond-00008257/neondb) on 2026-04-25 via Neon MCP.

ALTER TABLE "reply_drafts" ALTER COLUMN "received_email_id" DROP NOT NULL;
