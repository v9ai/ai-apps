-- Blood tests table
create table public.blood_tests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  file_name text not null,
  file_path text not null,
  status text not null default 'pending', -- pending | processing | done | error
  error_message text,
  uploaded_at timestamptz not null default now()
);

-- Blood markers table
create table public.blood_markers (
  id uuid primary key default gen_random_uuid(),
  test_id uuid references public.blood_tests(id) on delete cascade not null,
  name text not null,
  value text,
  unit text,
  reference_range text,
  flag text -- low | normal | high
);

-- RLS
alter table public.blood_tests enable row level security;
alter table public.blood_markers enable row level security;

create policy "Users can manage their own blood tests"
  on public.blood_tests for all
  using (auth.uid() = user_id);

create policy "Users can manage their own blood markers"
  on public.blood_markers for all
  using (
    exists (
      select 1 from public.blood_tests
      where blood_tests.id = blood_markers.test_id
      and blood_tests.user_id = auth.uid()
    )
  );

-- Storage bucket
insert into storage.buckets (id, name, public)
values ('blood-tests', 'blood-tests', false);

create policy "Users can upload their own files"
  on storage.objects for insert
  with check (bucket_id = 'blood-tests' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can read their own files"
  on storage.objects for select
  using (bucket_id = 'blood-tests' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can delete their own files"
  on storage.objects for delete
  using (bucket_id = 'blood-tests' and auth.uid()::text = (storage.foldername(name))[1]);
