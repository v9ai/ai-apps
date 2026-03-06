-- Add CRM columns to companies
ALTER TABLE companies ADD COLUMN email TEXT;
ALTER TABLE companies ADD COLUMN emails TEXT;
ALTER TABLE companies ADD COLUMN github_url TEXT;

-- Add job application tracking columns to jobs
ALTER TABLE jobs ADD COLUMN applied INTEGER NOT NULL DEFAULT 0;
ALTER TABLE jobs ADD COLUMN applied_at TEXT;
ALTER TABLE jobs ADD COLUMN recruiter_id INTEGER REFERENCES contacts(id) ON DELETE SET NULL;
ALTER TABLE jobs ADD COLUMN archived INTEGER NOT NULL DEFAULT 0;

-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo',
  priority TEXT NOT NULL DEFAULT 'medium',
  due_date TEXT,
  completed_at TEXT,
  entity_type TEXT,
  entity_id TEXT,
  tags TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);

-- Create email_campaigns table
CREATE TABLE IF NOT EXISTS email_campaigns (
  id TEXT PRIMARY KEY,
  company_id INTEGER REFERENCES companies(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  sequence TEXT,
  delay_days TEXT,
  start_at TEXT,
  mode TEXT,
  from_email TEXT,
  reply_to TEXT,
  total_recipients INTEGER NOT NULL DEFAULT 0,
  emails_sent INTEGER NOT NULL DEFAULT 0,
  emails_scheduled INTEGER NOT NULL DEFAULT 0,
  emails_failed INTEGER NOT NULL DEFAULT 0,
  recipient_emails TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_company_id ON email_campaigns(company_id);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_status ON email_campaigns(status);

-- Create email_templates table
CREATE TABLE IF NOT EXISTS email_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  subject TEXT,
  html_content TEXT,
  text_content TEXT,
  category TEXT,
  tags TEXT,
  variables TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_email_templates_category ON email_templates(category);

-- Create blocked_companies table
CREATE TABLE IF NOT EXISTS blocked_companies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  reason TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_blocked_companies_name ON blocked_companies(name);
