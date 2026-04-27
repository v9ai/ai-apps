CREATE TABLE IF NOT EXISTS allergies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  kind text NOT NULL DEFAULT 'allergy',
  name text NOT NULL,
  severity text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS allergies_user_idx ON allergies(user_id);

CREATE TABLE IF NOT EXISTS allergy_embeddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  allergy_id uuid NOT NULL UNIQUE REFERENCES allergies(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  content text NOT NULL,
  embedding vector(1024) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS allergy_emb_user_idx ON allergy_embeddings(user_id);
