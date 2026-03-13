CREATE TABLE IF NOT EXISTS teacher_feedbacks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  family_member_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  teacher_name TEXT NOT NULL,
  subject TEXT,
  feedback_date TEXT NOT NULL,
  content TEXT NOT NULL,
  tags TEXT,
  source TEXT,
  extracted INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
