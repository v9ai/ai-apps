-- Add missing CRM columns to contact_emails
ALTER TABLE contact_emails ADD COLUMN cc_emails TEXT DEFAULT '[]';
ALTER TABLE contact_emails ADD COLUMN reply_to_emails TEXT DEFAULT '[]';
ALTER TABLE contact_emails ADD COLUMN html_content TEXT;
ALTER TABLE contact_emails ADD COLUMN attachments TEXT DEFAULT '[]';
ALTER TABLE contact_emails ADD COLUMN tags TEXT DEFAULT '[]';
ALTER TABLE contact_emails ADD COLUMN headers TEXT DEFAULT '[]';
ALTER TABLE contact_emails ADD COLUMN idempotency_key TEXT;

-- Add missing CRM columns to email_campaigns
ALTER TABLE email_campaigns ADD COLUMN total_emails_planned INTEGER;
ALTER TABLE email_campaigns ADD COLUMN add_unsubscribe_headers INTEGER NOT NULL DEFAULT 0;
ALTER TABLE email_campaigns ADD COLUMN unsubscribe_url TEXT;
ALTER TABLE email_campaigns ADD COLUMN add_anti_thread_header INTEGER NOT NULL DEFAULT 0;
ALTER TABLE email_campaigns ADD COLUMN created_by TEXT;

-- Add missing CRM column to email_templates
ALTER TABLE email_templates ADD COLUMN user_id TEXT;
