-- Make goal_id nullable and add characteristic_id to goal_stories
-- Uses table-swap pattern (same as 0021) for D1 compatibility
PRAGMA foreign_keys = OFF;

CREATE TABLE goal_stories_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  goal_id INTEGER,
  characteristic_id INTEGER,
  language TEXT NOT NULL,
  minutes INTEGER NOT NULL,
  text TEXT NOT NULL,
  audio_key TEXT,
  audio_url TEXT,
  audio_generated_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
);

INSERT INTO goal_stories_new
  SELECT id, goal_id, NULL, language, minutes, text, audio_key, audio_url, audio_generated_at, created_at, updated_at
  FROM goal_stories;

DROP TABLE goal_stories;
ALTER TABLE goal_stories_new RENAME TO goal_stories;

PRAGMA foreign_keys = ON;
