-- Appointments table + embedding table + match RPC

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  provider text,
  notes text,
  appointment_date date,
  created_at timestamptz not null default now()
);

alter table public.appointments enable row level security;

create policy "Users can manage their own appointments"
  on public.appointments
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Appointment embeddings
create table public.appointment_embeddings (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid references public.appointments(id) on delete cascade not null unique,
  user_id uuid references auth.users(id) on delete cascade not null,
  content text not null,
  embedding extensions.vector(1024) not null,
  created_at timestamptz not null default now()
);

alter table public.appointment_embeddings enable row level security;

create policy "Users can manage their own appointment embeddings"
  on public.appointment_embeddings
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index appointment_embeddings_embedding_idx
  on public.appointment_embeddings
  using hnsw (embedding extensions.vector_cosine_ops);

-- Match appointments RPC
create or replace function public.match_appointments(
  query_embedding extensions.vector(1024),
  match_threshold float default 0.5,
  match_count int default 5
)
returns table (
  id uuid,
  appointment_id uuid,
  content text,
  similarity float
)
language sql
stable
security invoker
set search_path = extensions, public, pg_catalog
as $$
  select
    ae.id,
    ae.appointment_id,
    ae.content,
    1 - (ae.embedding <=> query_embedding) as similarity
  from public.appointment_embeddings ae
  where ae.user_id = auth.uid()
    and 1 - (ae.embedding <=> query_embedding) > match_threshold
  order by ae.embedding <=> query_embedding
  limit match_count;
$$;
