-- Health State Embeddings: encode each entire blood panel into a single 1024-dim vector
-- for trajectory analysis across multiple tests.

create table if not exists health_state_embeddings (
  id uuid primary key default gen_random_uuid(),
  test_id uuid not null unique references blood_tests(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  derived_metrics jsonb not null default '{}',
  embedding extensions.vector(1024) not null,
  created_at timestamptz not null default now()
);

create index if not exists health_state_embeddings_user_idx on health_state_embeddings(user_id);
create index if not exists health_state_embeddings_hnsw_idx on health_state_embeddings
  using hnsw (embedding extensions.vector_cosine_ops);

alter table health_state_embeddings enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where policyname = 'Users manage own health state embeddings'
  ) then
    create policy "Users manage own health state embeddings"
      on health_state_embeddings for all
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;

-- RPC: cosine similarity search against a query embedding
create or replace function match_health_states(
  query_embedding extensions.vector(1024),
  match_threshold float default 0.3,
  match_count int default 10
)
returns table (
  id uuid,
  test_id uuid,
  content text,
  derived_metrics jsonb,
  similarity float
)
language sql stable
security invoker
set search_path = extensions, public, pg_catalog
as $$
  select
    hse.id,
    hse.test_id,
    hse.content,
    hse.derived_metrics,
    1 - (hse.embedding <=> query_embedding) as similarity
  from health_state_embeddings hse
  where hse.user_id = auth.uid()
    and 1 - (hse.embedding <=> query_embedding) > match_threshold
  order by hse.embedding <=> query_embedding
  limit match_count;
$$;

-- RPC: returns all states ordered by date with similarity-to-latest computed in SQL
create or replace function get_health_trajectory_with_similarity()
returns table (
  id uuid,
  test_id uuid,
  content text,
  derived_metrics jsonb,
  created_at timestamptz,
  file_name text,
  test_date date,
  similarity_to_latest float
)
language sql stable
security invoker
set search_path = extensions, public, pg_catalog
as $$
  with latest as (
    select hse.embedding
    from health_state_embeddings hse
    join blood_tests bt on bt.id = hse.test_id
    where hse.user_id = auth.uid()
    order by coalesce(bt.test_date, bt.uploaded_at) desc
    limit 1
  )
  select
    hse.id,
    hse.test_id,
    hse.content,
    hse.derived_metrics,
    hse.created_at,
    bt.file_name,
    bt.test_date,
    case
      when (select count(*) from latest) = 0 then null
      else 1 - (hse.embedding <=> (select embedding from latest))
    end::float as similarity_to_latest
  from health_state_embeddings hse
  join blood_tests bt on bt.id = hse.test_id
  where hse.user_id = auth.uid()
  order by coalesce(bt.test_date, bt.uploaded_at) asc;
$$;
