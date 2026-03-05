-- Symptoms table + embedding table + match RPC

create table public.symptoms (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  description text not null,
  severity text check (severity in ('mild', 'moderate', 'severe')),
  logged_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.symptoms enable row level security;

create policy "Users can manage their own symptoms"
  on public.symptoms
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Symptom embeddings
create table public.symptom_embeddings (
  id uuid primary key default gen_random_uuid(),
  symptom_id uuid references public.symptoms(id) on delete cascade not null unique,
  user_id uuid references auth.users(id) on delete cascade not null,
  content text not null,
  embedding extensions.vector(1024) not null,
  created_at timestamptz not null default now()
);

alter table public.symptom_embeddings enable row level security;

create policy "Users can manage their own symptom embeddings"
  on public.symptom_embeddings
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index symptom_embeddings_embedding_idx
  on public.symptom_embeddings
  using hnsw (embedding extensions.vector_cosine_ops);

-- Match symptoms RPC
create or replace function public.match_symptoms(
  query_embedding extensions.vector(1024),
  match_threshold float default 0.5,
  match_count int default 5
)
returns table (
  id uuid,
  symptom_id uuid,
  content text,
  similarity float
)
language sql
stable
security invoker
set search_path = extensions, public, pg_catalog
as $$
  select
    se.id,
    se.symptom_id,
    se.content,
    1 - (se.embedding <=> query_embedding) as similarity
  from public.symptom_embeddings se
  where se.user_id = auth.uid()
    and 1 - (se.embedding <=> query_embedding) > match_threshold
  order by se.embedding <=> query_embedding
  limit match_count;
$$;
