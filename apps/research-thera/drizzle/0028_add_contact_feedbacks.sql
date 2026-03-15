-- Migration: Add contact_feedbacks table
CREATE TABLE IF NOT EXISTS contact_feedbacks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  contact_id INTEGER NOT NULL,
  family_member_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  subject TEXT,
  feedback_date TEXT NOT NULL,
  content TEXT NOT NULL,
  tags TEXT, -- JSON array
  source TEXT, -- e.g. "email", "meeting", "report", "phone"
  extracted INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE INDEX IF NOT EXISTS idx_contact_feedbacks_contact_id ON contact_feedbacks(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_feedbacks_family_member_id ON contact_feedbacks(family_member_id);
CREATE INDEX IF NOT EXISTS idx_contact_feedbacks_user_id ON contact_feedbacks(user_id);
