PRAGMA foreign_keys = OFF;
--> statement-breakpoint
CREATE TABLE goals_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  family_member_id INTEGER,
  user_id TEXT NOT NULL,
  slug TEXT UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  target_date TEXT,
  status TEXT DEFAULT 'active' NOT NULL,
  priority TEXT DEFAULT 'medium' NOT NULL,
  therapeutic_text TEXT,
  therapeutic_text_language TEXT,
  therapeutic_text_generated_at TEXT,
  story_language TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
  parent_goal_id INTEGER REFERENCES goals_new(id)
);
--> statement-breakpoint
INSERT INTO goals_new (id, family_member_id, user_id, slug, title, description, target_date, status, priority, therapeutic_text, therapeutic_text_language, therapeutic_text_generated_at, story_language, created_at, updated_at, parent_goal_id)
  SELECT id, family_member_id, user_id, slug, title, description, target_date, status, priority, therapeutic_text, therapeutic_text_language, therapeutic_text_generated_at, story_language, created_at, updated_at, parent_goal_id
  FROM goals;
--> statement-breakpoint
DROP TABLE goals;
--> statement-breakpoint
ALTER TABLE goals_new RENAME TO goals;
--> statement-breakpoint
PRAGMA foreign_keys = ON;
