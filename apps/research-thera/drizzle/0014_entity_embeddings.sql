CREATE TABLE IF NOT EXISTS entity_embeddings (
  entity_type TEXT NOT NULL,
  entity_id INTEGER NOT NULL,
  family_member_id INTEGER,
  text TEXT NOT NULL,
  embedding vector(384) NOT NULL,
  model TEXT NOT NULL DEFAULT 'all-MiniLM-L6-v2',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS entity_embeddings_fm_type_idx
  ON entity_embeddings (family_member_id, entity_type);

CREATE INDEX IF NOT EXISTS entity_embeddings_hnsw_idx
  ON entity_embeddings USING hnsw (embedding vector_cosine_ops);
