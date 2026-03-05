create type agent_type as enum ('attacker', 'defender', 'judge', 'system');

create table public.audit_trail (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.stress_test_sessions(id) on delete cascade not null,
  agent agent_type not null,
  action text not null,
  input_summary text,
  output_summary text,
  confidence float,
  round int,
  citations_used text[] default '{}',
  created_at timestamptz not null default now()
);

create index audit_trail_session_idx on public.audit_trail(session_id);
create index audit_trail_round_idx on public.audit_trail(session_id, round);

alter table public.audit_trail enable row level security;
create policy "Users view own audit trails" on public.audit_trail for all
  using (exists (
    select 1 from public.stress_test_sessions s
    where s.id = audit_trail.session_id and s.user_id = auth.uid()
  ));
