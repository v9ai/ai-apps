-- Learning sessions: tracks each study/quiz/review interaction
CREATE TABLE IF NOT EXISTS learning_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  application_id INTEGER NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  session_type TEXT NOT NULL CHECK(session_type IN ('study', 'quiz', 'flashcard', 'mock_interview')),
  domain TEXT NOT NULL CHECK(domain IN ('concepts', 'interview', 'coding', 'backend')),
  topic_key TEXT NOT NULL,
  score REAL,
  total_questions INTEGER,
  correct_answers INTEGER,
  confidence TEXT CHECK(confidence IN ('not_ready', 'familiar', 'confident', 'mastery')),
  duration_ms INTEGER,
  answers_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_learning_sessions_app ON learning_sessions(application_id);
CREATE INDEX idx_learning_sessions_user ON learning_sessions(user_email);
CREATE INDEX idx_learning_sessions_domain ON learning_sessions(application_id, domain);

-- Topic mastery: aggregated mastery level per topic per application
CREATE TABLE IF NOT EXISTS topic_mastery (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  application_id INTEGER NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  domain TEXT NOT NULL CHECK(domain IN ('concepts', 'interview', 'coding', 'backend')),
  topic_key TEXT NOT NULL,
  mastery_level TEXT NOT NULL DEFAULT 'unfamiliar' CHECK(mastery_level IN ('unfamiliar', 'familiar', 'confident', 'mastery')),
  confidence_score REAL DEFAULT 0,
  total_sessions INTEGER DEFAULT 0,
  last_quiz_score REAL,
  streak_days INTEGER DEFAULT 0,
  next_review_at TEXT,
  last_studied_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX idx_topic_mastery_unique ON topic_mastery(application_id, user_email, domain, topic_key);
CREATE INDEX idx_topic_mastery_review ON topic_mastery(next_review_at);
