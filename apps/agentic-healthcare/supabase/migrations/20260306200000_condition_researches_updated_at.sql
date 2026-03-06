alter table condition_researches add column if not exists updated_at timestamptz not null default now();

create or replace function update_condition_researches_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_condition_researches_updated_at
  before update on condition_researches
  for each row execute function update_condition_researches_updated_at();
