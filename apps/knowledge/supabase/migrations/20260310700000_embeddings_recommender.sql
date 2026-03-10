-- Paper embeddings
create table public.paper_embeddings (
  id uuid primary key default gen_random_uuid(),
  paper_id uuid references public.papers(id) on delete cascade not null unique,
  content text not null,
  embedding extensions.vector(1024) not null,
  created_at timestamptz not null default now()
);

create index paper_embeddings_hnsw_idx on public.paper_embeddings
  using hnsw (embedding extensions.vector_cosine_ops);

-- Section embeddings
create table public.section_embeddings (
  id uuid primary key default gen_random_uuid(),
  section_id uuid references public.paper_sections(id) on delete cascade not null unique,
  paper_id uuid references public.papers(id) on delete cascade not null,
  content text not null,
  embedding extensions.vector(1024) not null,
  created_at timestamptz not null default now()
);

create index section_embeddings_hnsw_idx on public.section_embeddings
  using hnsw (embedding extensions.vector_cosine_ops);
create index section_embeddings_paper_idx on public.section_embeddings(paper_id);

-- Concept embeddings
create table public.concept_embeddings (
  id uuid primary key default gen_random_uuid(),
  concept_id uuid references public.concepts(id) on delete cascade not null unique,
  content text not null,
  embedding extensions.vector(1024) not null,
  created_at timestamptz not null default now()
);

create index concept_embeddings_hnsw_idx on public.concept_embeddings
  using hnsw (embedding extensions.vector_cosine_ops);

-- User-paper interactions (for collaborative filtering)
create table public.user_paper_interactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  paper_id uuid references public.papers(id) on delete cascade not null,
  read_progress float not null default 0,
  rating int check (rating >= 1 and rating <= 5),
  bookmarked boolean not null default false,
  time_spent_sec int not null default 0,
  first_viewed_at timestamptz not null default now(),
  last_viewed_at timestamptz not null default now(),
  unique (user_id, paper_id)
);

create index user_paper_interactions_user_idx on public.user_paper_interactions(user_id);
create index user_paper_interactions_paper_idx on public.user_paper_interactions(paper_id);

-- RLS
alter table public.paper_embeddings enable row level security;
alter table public.section_embeddings enable row level security;
alter table public.concept_embeddings enable row level security;
alter table public.user_paper_interactions enable row level security;

create policy "Public read paper embeddings" on public.paper_embeddings for select using (true);
create policy "Public read section embeddings" on public.section_embeddings for select using (true);
create policy "Public read concept embeddings" on public.concept_embeddings for select using (true);
create policy "Users manage own paper interactions" on public.user_paper_interactions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
