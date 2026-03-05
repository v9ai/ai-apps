create table public.eval_runs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.stress_test_sessions(id) on delete cascade,
  metric_type text not null,
  score float not null,
  details jsonb default '{}',
  created_at timestamptz not null default now()
);

create index eval_runs_session_idx on public.eval_runs(session_id);

alter table public.eval_runs enable row level security;
create policy "Users view own eval runs" on public.eval_runs for all
  using (exists (
    select 1 from public.stress_test_sessions s
    where s.id = eval_runs.session_id and s.user_id = auth.uid()
  ));
