-- Add scheduling, delivery tracking, and follow-up columns to contact_emails
ALTER TABLE contact_emails ADD COLUMN scheduled_at TEXT;
ALTER TABLE contact_emails ADD COLUMN delivered_at TEXT;
ALTER TABLE contact_emails ADD COLUMN opened_at TEXT;
ALTER TABLE contact_emails ADD COLUMN error_message TEXT;
ALTER TABLE contact_emails ADD COLUMN parent_email_id INTEGER REFERENCES contact_emails(id);
ALTER TABLE contact_emails ADD COLUMN sequence_type TEXT;
ALTER TABLE contact_emails ADD COLUMN sequence_number TEXT;
ALTER TABLE contact_emails ADD COLUMN reply_received INTEGER NOT NULL DEFAULT 0;
ALTER TABLE contact_emails ADD COLUMN reply_received_at TEXT;
ALTER TABLE contact_emails ADD COLUMN followup_status TEXT;
ALTER TABLE contact_emails ADD COLUMN company_id INTEGER REFERENCES companies(id);

CREATE INDEX idx_contact_emails_status ON contact_emails(status);
CREATE INDEX idx_contact_emails_company_id ON contact_emails(company_id);
