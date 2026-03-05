create type finding_type as enum ('logical', 'factual', 'legal', 'procedural', 'citation');
create type finding_severity as enum ('low', 'medium', 'high', 'critical');

create table public.findings (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.stress_test_sessions(id) on delete cascade not null,
  type finding_type not null,
  severity finding_severity not null,
  description text not null,
  confidence float,
  suggested_fix text,
  neo4j_node_id text,
  round int,
  created_at timestamptz not null default now()
);

create index findings_session_idx on public.findings(session_id);
create index findings_severity_idx on public.findings(session_id, severity);

alter table public.findings enable row level security;
create policy "Users view own findings" on public.findings for all
  using (exists (
    select 1 from public.stress_test_sessions s
    where s.id = findings.session_id and s.user_id = auth.uid()
  ));
