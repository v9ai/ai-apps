-- User profiles (extends auth.users)
create table public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_profiles enable row level security;
create policy "Users manage own profile" on public.user_profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- Knowledge states: per-user, per-concept BKT
create table public.knowledge_states (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  concept_id uuid references public.concepts(id) on delete cascade not null,
  p_mastery float not null default 0.0,
  p_transit float not null default 0.1,
  p_slip float not null default 0.1,
  p_guess float not null default 0.2,
  total_interactions int not null default 0,
  correct_interactions int not null default 0,
  mastery_level public.mastery_level not null default 'novice',
  last_interaction_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (user_id, concept_id)
);

create index knowledge_states_user_idx on public.knowledge_states(user_id);
create index knowledge_states_concept_idx on public.knowledge_states(concept_id);
create index knowledge_states_mastery_idx on public.knowledge_states(user_id, mastery_level);

alter table public.knowledge_states enable row level security;
create policy "Users manage own knowledge states" on public.knowledge_states
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Interaction events: time-ordered sequences
create table public.interaction_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  concept_id uuid references public.concepts(id) on delete set null,
  paper_id uuid references public.papers(id) on delete set null,
  section_id uuid references public.paper_sections(id) on delete set null,
  interaction_type public.interaction_type not null,
  is_correct boolean,
  response_time_ms int,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index interaction_events_user_time_idx
  on public.interaction_events(user_id, created_at desc);
create index interaction_events_user_concept_idx
  on public.interaction_events(user_id, concept_id, created_at desc);
create index interaction_events_paper_idx
  on public.interaction_events(paper_id);
create index interaction_events_type_idx
  on public.interaction_events(interaction_type);

alter table public.interaction_events enable row level security;
create policy "Users manage own interactions" on public.interaction_events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
