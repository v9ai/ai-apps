CREATE TABLE IF NOT EXISTS psych_screening_assessments (
  id                       SERIAL PRIMARY KEY,
  user_id                  TEXT NOT NULL,
  family_member_id         INTEGER NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  recommendation           TEXT NOT NULL,
  confidence               REAL NOT NULL,
  iatrogenic_likelihood    REAL,
  rationale                TEXT NOT NULL,
  red_flags                JSONB,
  supporting_observations  JSONB,
  differential             JSONB,
  recommended_next_steps   JSONB,
  observation_window       JSONB,
  citations                JSONB,
  data_snapshot            JSONB,
  critique                 JSONB,
  language                 TEXT NOT NULL DEFAULT 'ro',
  model                    TEXT,
  job_id                   TEXT REFERENCES generation_jobs(id),
  created_at               TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_psych_screen_member
  ON psych_screening_assessments(family_member_id, created_at DESC);
