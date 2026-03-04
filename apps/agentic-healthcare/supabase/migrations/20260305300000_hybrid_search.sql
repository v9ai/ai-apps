-- Add tsvector generated column for full-text search on marker embeddings
alter table public.blood_marker_embeddings
  add column fts tsvector
  generated always as (to_tsvector('english', content)) stored;

-- GIN index for fast full-text search
create index blood_marker_embeddings_fts_idx
  on public.blood_marker_embeddings
  using gin (fts);

-- Hybrid search: combines FTS rank + vector similarity with configurable weights
create or replace function public.hybrid_search_markers(
  query_text text,
  query_embedding extensions.vector(1536),
  match_count int default 10,
  fts_weight float default 0.3,
  vector_weight float default 0.7,
  match_threshold float default 0.3
)
returns table (
  marker_id uuid,
  test_id uuid,
  marker_name text,
  content text,
  fts_rank float,
  vector_similarity float,
  combined_score float
)
language sql stable
security invoker
set search_path = extensions, public, pg_catalog
as $$
  select
    bme.marker_id,
    bme.test_id,
    bme.marker_name,
    bme.content,
    ts_rank(bme.fts, websearch_to_tsquery('english', query_text))::float as fts_rank,
    (1 - (bme.embedding <=> query_embedding))::float as vector_similarity,
    (
      fts_weight * ts_rank(bme.fts, websearch_to_tsquery('english', query_text))
      + vector_weight * (1 - (bme.embedding <=> query_embedding))
    )::float as combined_score
  from public.blood_marker_embeddings bme
  where bme.user_id = auth.uid()
    and (
      bme.fts @@ websearch_to_tsquery('english', query_text)
      or 1 - (bme.embedding <=> query_embedding) > match_threshold
    )
  order by combined_score desc
  limit match_count;
$$;
