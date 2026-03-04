-- Condition embeddings table
create table public.condition_embeddings (
  id uuid primary key default gen_random_uuid(),
  condition_id uuid references public.conditions(id) on delete cascade not null unique,
  user_id uuid references auth.users(id) on delete cascade not null,
  content text not null,
  embedding extensions.vector(1536) not null,
  created_at timestamptz not null default now()
);

-- HNSW index for fast cosine similarity search
create index condition_embeddings_embedding_idx
  on public.condition_embeddings
  using hnsw (embedding extensions.vector_cosine_ops);

-- RLS
alter table public.condition_embeddings enable row level security;

create policy "Users can manage their own condition embeddings"
  on public.condition_embeddings for all
  using (auth.uid() = user_id);

-- RPC function for condition similarity search
create or replace function public.match_conditions(
  query_embedding extensions.vector(1536),
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
