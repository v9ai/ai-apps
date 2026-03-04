-- Blood marker embeddings table (one embedding per marker)
create table public.blood_marker_embeddings (
  id uuid primary key default gen_random_uuid(),
  marker_id uuid references public.blood_markers(id) on delete cascade not null,
  test_id uuid references public.blood_tests(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  marker_name text not null,
  content text not null,
  embedding extensions.vector(1536) not null,
  created_at timestamptz not null default now()
);

-- HNSW index for fast cosine similarity search
create index blood_marker_embeddings_embedding_idx
  on public.blood_marker_embeddings
  using hnsw (embedding extensions.vector_cosine_ops);

-- Index for trend grouping: find same marker across tests for a user
create index blood_marker_embeddings_user_marker_idx
  on public.blood_marker_embeddings (user_id, marker_name);

-- RLS
alter table public.blood_marker_embeddings enable row level security;

create policy "Users can manage their own marker embeddings"
  on public.blood_marker_embeddings for all
  using (auth.uid() = user_id);

-- RPC function for marker similarity search
create or replace function public.match_markers(
  query_embedding extensions.vector(1536),
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

-- Drop and recreate match_blood_tests with additional return columns
drop function if exists public.match_blood_tests(extensions.vector, float, int);

create or replace function public.match_blood_tests(
  query_embedding extensions.vector(1536),
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
