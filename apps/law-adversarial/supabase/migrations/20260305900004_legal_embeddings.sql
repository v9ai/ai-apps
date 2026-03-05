create extension if not exists vector with schema extensions;

create type legal_source_type as enum ('case', 'statute', 'brief', 'argument');

create table public.legal_embeddings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  source_type legal_source_type not null,
  source_ref text not null,
  content_summary text not null,
  embedding extensions.vector(1024) not null,
  jurisdiction text,
  created_at timestamptz not null default now()
);

create index legal_embeddings_user_idx on public.legal_embeddings(user_id);
create index legal_embeddings_hnsw_idx on public.legal_embeddings
  using hnsw (embedding extensions.vector_cosine_ops);

alter table public.legal_embeddings enable row level security;
create policy "Users manage own legal embeddings" on public.legal_embeddings for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- RPC for similarity search
create or replace function public.match_legal_docs(
  query_embedding extensions.vector(1024),
  match_threshold float default 0.3,
  match_count int default 10
)
returns table (
  id uuid,
  source_type legal_source_type,
  source_ref text,
  content_summary text,
  jurisdiction text,
  similarity float
)
language sql stable
security invoker
set search_path = extensions, public, pg_catalog
as $$
  select
    le.id,
    le.source_type,
    le.source_ref,
    le.content_summary,
    le.jurisdiction,
    1 - (le.embedding <=> query_embedding) as similarity
  from public.legal_embeddings le
  where le.user_id = auth.uid()
    and 1 - (le.embedding <=> query_embedding) > match_threshold
  order by le.embedding <=> query_embedding
  limit match_count;
$$;
