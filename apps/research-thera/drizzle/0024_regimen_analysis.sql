CREATE TABLE IF NOT EXISTS regimen_analysis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  slug text NOT NULL,
  severity_overall text,
  summary text,
  flags jsonb NOT NULL DEFAULT '[]'::jsonb,
  missing_facts jsonb NOT NULL DEFAULT '[]'::jsonb,
  meds_count integer NOT NULL DEFAULT 0,
  language text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT regimen_analysis_user_slug_unique UNIQUE (user_id, slug)
);

CREATE INDEX IF NOT EXISTS regimen_analysis_user_idx ON regimen_analysis (user_id);
