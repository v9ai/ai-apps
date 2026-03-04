-- Switch all embedding columns from vector(1536) to vector(1024)
-- for Qwen text-embedding-v3 via DashScope

-- Drop dependent functions first
drop function if exists public.match_blood_tests(extensions.vector, float, int);
drop function if exists public.match_markers(extensions.vector, float, int);
drop function if exists public.match_conditions(extensions.vector, float, int);
drop function if exists public.find_similar_markers_over_time(extensions.vector, float, int, text);
drop function if exists public.hybrid_search_markers(text, extensions.vector, int, float, float, float);

-- Drop indexes that reference the old column type
drop index if exists public.blood_test_embeddings_embedding_idx;
drop index if exists public.blood_marker_embeddings_embedding_idx;
drop index if exists public.condition_embeddings_embedding_idx;

-- Drop the generated fts column before altering (it references content, not embedding, but
-- we need to drop hybrid search's dependency on the embedding column type)
alter table public.blood_marker_embeddings drop column if exists fts;

-- Alter columns
alter table public.blood_test_embeddings
  alter column embedding type extensions.vector(1024);

alter table public.blood_marker_embeddings
  alter column embedding type extensions.vector(1024);

alter table public.condition_embeddings
  alter column embedding type extensions.vector(1024);

-- Recreate HNSW indexes
create index blood_test_embeddings_embedding_idx
  on public.blood_test_embeddings
  using hnsw (embedding extensions.vector_cosine_ops);

create index blood_marker_embeddings_embedding_idx
  on public.blood_marker_embeddings
  using hnsw (embedding extensions.vector_cosine_ops);

create index condition_embeddings_embedding_idx
  on public.condition_embeddings
  using hnsw (embedding extensions.vector_cosine_ops);

-- Re-add fts generated column + GIN index
alter table public.blood_marker_embeddings
  add column fts tsvector
  generated always as (to_tsvector('english', content)) stored;

create index blood_marker_embeddings_fts_idx
  on public.blood_marker_embeddings
  using gin (fts);

-- Recreate all RPC functions with vector(1024)

create or replace function public.match_blood_tests(
  query_embedding extensions.vector(1024),
  match_threshold float default 0.5,
  match_count int default 5
)
returns table (
  id uuid,
  test_id uuid,
  content text,
  similarity float,
  file_name text,
  test_date date
)
language sql stable
security invoker
set search_path = extensions, public, pg_catalog
as $$
  select
    bte.id,
    bte.test_id,
    bte.content,
    1 - (bte.embedding <=> query_embedding) as similarity,
    bt.file_name,
    bt.test_date
  from public.blood_test_embeddings bte
  join public.blood_tests bt on bt.id = bte.test_id
  where bte.user_id = auth.uid()
    and 1 - (bte.embedding <=> query_embedding) > match_threshold
  order by bte.embedding <=> query_embedding
  limit match_count;
$$;

create or replace function public.match_markers(
  query_embedding extensions.vector(1024),
  match_threshold float default 0.5,
  match_count int default 10
)
returns table (
  id uuid,
  marker_id uuid,
  test_id uuid,
  marker_name text,
  content text,
  similarity float
)
language sql stable
security invoker
set search_path = extensions, public, pg_catalog
as $$
  select
    bme.id,
    bme.marker_id,
    bme.test_id,
    bme.marker_name,
    bme.content,
    1 - (bme.embedding <=> query_embedding) as similarity
  from public.blood_marker_embeddings bme
  where bme.user_id = auth.uid()
    and 1 - (bme.embedding <=> query_embedding) > match_threshold
  order by bme.embedding <=> query_embedding
  limit match_count;
$$;

create or replace function public.match_conditions(
  query_embedding extensions.vector(1024),
  match_threshold float default 0.5,
  match_count int default 5
)
returns table (
  id uuid,
  condition_id uuid,
  content text,
  similarity float
)
language sql stable
security invoker
set search_path = extensions, public, pg_catalog
as $$
  select
    ce.id,
    ce.condition_id,
    ce.content,
    1 - (ce.embedding <=> query_embedding) as similarity
  from public.condition_embeddings ce
  where ce.user_id = auth.uid()
    and 1 - (ce.embedding <=> query_embedding) > match_threshold
  order by ce.embedding <=> query_embedding
  limit match_count;
$$;

create or replace function public.find_similar_markers_over_time(
  query_embedding extensions.vector(1024),
  match_threshold float default 0.5,
  match_count int default 50,
  exact_marker_name text default null
)
returns table (
  marker_id uuid,
  test_id uuid,
  marker_name text,
  content text,
  similarity float,
  value text,
  unit text,
  flag text,
  test_date date,
  file_name text
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
    1 - (bme.embedding <=> query_embedding) as similarity,
    bm.value,
    bm.unit,
    bm.flag,
    bt.test_date,
    bt.file_name
  from public.blood_marker_embeddings bme
  join public.blood_markers bm on bm.id = bme.marker_id
  join public.blood_tests bt on bt.id = bme.test_id
  where bme.user_id = auth.uid()
    and 1 - (bme.embedding <=> query_embedding) > match_threshold
    and (exact_marker_name is null or bme.marker_name = exact_marker_name)
  order by bt.test_date asc nulls last, bme.embedding <=> query_embedding
  limit match_count;
$$;

create or replace function public.hybrid_search_markers(
  query_text text,
  query_embedding extensions.vector(1024),
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
