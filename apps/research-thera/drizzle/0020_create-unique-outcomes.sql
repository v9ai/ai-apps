-- Migration number: 0020 	 2026-02-28T08:31:41.002Z
CREATE TABLE IF NOT EXISTS unique_outcomes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  characteristic_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  observed_at TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_unique_outcomes_characteristic_id ON unique_outcomes (characteristic_id);
CREATE INDEX idx_unique_outcomes_user_id ON unique_outcomes (user_id);
