create table conditions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  notes text,
  created_at timestamptz default now() not null
);

alter table conditions enable row level security;

create policy "Users can manage their own conditions"
  on conditions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
