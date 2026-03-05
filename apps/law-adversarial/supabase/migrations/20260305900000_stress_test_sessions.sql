create type session_status as enum ('pending', 'running', 'completed', 'failed');

create table public.stress_test_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  brief_title text not null,
  brief_storage_path text,
  jurisdiction text,
  neo4j_graph_id text,
  status session_status not null default 'pending',
  config jsonb not null default '{}',
  overall_score float,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.stress_test_sessions enable row level security;
create policy "Users manage own sessions" on public.stress_test_sessions for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Storage bucket for briefs
insert into storage.buckets (id, name, public) values ('briefs', 'briefs', false);
create policy "Users upload own briefs" on storage.objects for insert
  with check (bucket_id = 'briefs' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "Users read own briefs" on storage.objects for select
  using (bucket_id = 'briefs' and auth.uid()::text = (storage.foldername(name))[1]);
