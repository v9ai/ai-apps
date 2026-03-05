-- Medications table + embedding table + match RPC

create table public.medications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  dosage text,
  frequency text,
  notes text,
  start_date date,
  end_date date,
  created_at timestamptz not null default now()
);

alter table public.medications enable row level security;

create policy "Users can manage their own medications"
  on public.medications
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Medication embeddings
create table public.medication_embeddings (
  id uuid primary key default gen_random_uuid(),
  medication_id uuid references public.medications(id) on delete cascade not null unique,
  user_id uuid references auth.users(id) on delete cascade not null,
  content text not null,
  embedding extensions.vector(1024) not null,
  created_at timestamptz not null default now()
);

alter table public.medication_embeddings enable row level security;

create policy "Users can manage their own medication embeddings"
  on public.medication_embeddings
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index medication_embeddings_embedding_idx
  on public.medication_embeddings
  using hnsw (embedding extensions.vector_cosine_ops);

-- Match medications RPC
create or replace function public.match_medications(
  query_embedding extensions.vector(1024),
  match_threshold float default 0.5,
  match_count int default 5
)
returns table (
  id uuid,
  medication_id uuid,
  content text,
  similarity float
)
language sql
stable
security invoker
set search_path = extensions, public, pg_catalog
as $$
  select
    me.id,
    me.medication_id,
    me.content,
    1 - (me.embedding <=> query_embedding) as similarity
  from public.medication_embeddings me
  where me.user_id = auth.uid()
    and 1 - (me.embedding <=> query_embedding) > match_threshold
  order by me.embedding <=> query_embedding
  limit match_count;
$$;
