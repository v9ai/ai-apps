-- Enable pgvector extension
create extension if not exists vector with schema extensions;

-- Blood test embeddings table (one embedding per test)
create table public.blood_test_embeddings (
  id uuid primary key default gen_random_uuid(),
  test_id uuid references public.blood_tests(id) on delete cascade not null unique,
  user_id uuid references auth.users(id) on delete cascade not null,
  content text not null,
  embedding extensions.vector(1536) not null,
  created_at timestamptz not null default now()
);

-- HNSW index for fast cosine similarity search
create index blood_test_embeddings_embedding_idx
  on public.blood_test_embeddings
  using hnsw (embedding extensions.vector_cosine_ops);

-- RLS
alter table public.blood_test_embeddings enable row level security;

create policy "Users can manage their own embeddings"
  on public.blood_test_embeddings for all
  using (auth.uid() = user_id);

-- RPC function for similarity search scoped to the authenticated user
create or replace function public.match_blood_tests(
  query_embedding extensions.vector(1536),
  match_threshold float default 0.5,
  match_count int default 5
)
returns table (
  id uuid,
  test_id uuid,
  content text,
  similarity float
)
language sql stable
security invoker
set search_path = extensions, public, pg_catalog
as $$
  select
    bte.id,
    bte.test_id,
    bte.content,
    1 - (bte.embedding <=> query_embedding) as similarity
  from public.blood_test_embeddings bte
  where bte.user_id = auth.uid()
    and 1 - (bte.embedding <=> query_embedding) > match_threshold
  order by bte.embedding <=> query_embedding
  limit match_count;
$$;
