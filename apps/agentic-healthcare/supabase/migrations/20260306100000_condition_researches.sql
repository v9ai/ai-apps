create table condition_researches (
  id uuid primary key default gen_random_uuid(),
  condition_id uuid references conditions(id) on delete cascade not null unique,
  user_id uuid references auth.users(id) on delete cascade not null,
  papers jsonb not null default '[]',
  synthesis text,
  paper_count int not null default 0,
  search_query text,
  created_at timestamptz not null default now()
);

alter table condition_researches enable row level security;

create policy "Users can manage own condition researches"
  on condition_researches for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
