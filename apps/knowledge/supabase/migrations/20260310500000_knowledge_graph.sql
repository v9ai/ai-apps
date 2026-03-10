-- Concepts: graph nodes
create table public.concepts (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  description text,
  concept_type public.concept_type not null default 'topic',
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index concepts_type_idx on public.concepts(concept_type);
create index concepts_name_trgm_idx on public.concepts using gin (name extensions.gin_trgm_ops);

-- Concept edges: adjacency list
create table public.concept_edges (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references public.concepts(id) on delete cascade not null,
  target_id uuid references public.concepts(id) on delete cascade not null,
  edge_type public.edge_type not null,
  weight float not null default 1.0,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique (source_id, target_id, edge_type)
);

create index concept_edges_source_idx on public.concept_edges(source_id);
create index concept_edges_target_idx on public.concept_edges(target_id);
create index concept_edges_type_idx on public.concept_edges(edge_type);

-- Junction: paper <-> concept
create table public.paper_concepts (
  paper_id uuid references public.papers(id) on delete cascade not null,
  concept_id uuid references public.concepts(id) on delete cascade not null,
  relevance float not null default 1.0,
  primary key (paper_id, concept_id)
);

-- RLS: public read
alter table public.concepts enable row level security;
alter table public.concept_edges enable row level security;
alter table public.paper_concepts enable row level security;

create policy "Public read concepts" on public.concepts for select using (true);
create policy "Public read concept_edges" on public.concept_edges for select using (true);
create policy "Public read paper_concepts" on public.paper_concepts for select using (true);
