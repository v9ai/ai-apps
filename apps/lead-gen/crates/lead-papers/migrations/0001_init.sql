create table if not exists contacts (
  id          text primary key,
  name        text not null,
  affiliation text,
  email       text,
  tags        text[] not null default '{}',
  created_at  timestamptz not null default now()
);

create table if not exists gh_matches (
  contact_id     text primary key references contacts(id) on delete cascade,
  login          text,
  score          real not null,
  name_sim       real not null,
  affil_overlap  real not null,
  topic_cos      real not null,
  evidence       jsonb not null,
  arm_id         text,
  status         text not null check (status in ('matched','no_github','no_relevant_papers')),
  matched_at     timestamptz not null default now()
);

create index if not exists gh_matches_status_idx on gh_matches(status);
create index if not exists gh_matches_score_idx on gh_matches(score desc);

create table if not exists bandit_arms (
  pool        text not null,
  arm_id      text not null,
  pulls       integer not null default 0,
  reward_sum  double precision not null default 0,
  reward_sq   double precision not null default 0,
  last_pull   timestamptz,
  primary key (pool, arm_id)
);
