-- Remove formulation_status column from family_member_characteristics
-- Uses table-swap pattern for D1 compatibility
PRAGMA foreign_keys = OFF;

CREATE TABLE family_member_characteristics_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  family_member_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  severity TEXT,
  frequency_per_week INTEGER,
  duration_weeks INTEGER,
  age_of_onset INTEGER,
  impairment_domains TEXT,
  externalized_name TEXT,
  strengths TEXT,
  risk_tier TEXT DEFAULT 'NONE' NOT NULL,
  tags TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
);

INSERT INTO family_member_characteristics_new
  SELECT id, family_member_id, user_id, category, title, description, severity,
         frequency_per_week, duration_weeks, age_of_onset, impairment_domains,
         externalized_name, strengths, risk_tier, tags, created_at, updated_at
  FROM family_member_characteristics;

DROP TABLE family_member_characteristics;
ALTER TABLE family_member_characteristics_new RENAME TO family_member_characteristics;

PRAGMA foreign_keys = ON;
