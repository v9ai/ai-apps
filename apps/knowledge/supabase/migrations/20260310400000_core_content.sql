-- Categories (9 research domains)
create table public.categories (
  id serial primary key,
  name text unique not null,
  slug text unique not null,
  icon text not null,
  description text not null,
  gradient_from text not null,
  gradient_to text not null,
  sort_order int not null,
  paper_range_lo int not null,
  paper_range_hi int not null
);

-- Papers (55 research papers)
create table public.papers (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  number int unique not null,
  title text not null,
  category_id int references public.categories(id) not null,
  word_count int not null default 0,
  reading_time_min int not null default 1,
  content text not null,
  summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index papers_category_idx on public.papers(category_id);
create index papers_number_idx on public.papers(number);

-- Paper sections (chunked content)
create table public.paper_sections (
  id uuid primary key default gen_random_uuid(),
  paper_id uuid references public.papers(id) on delete cascade not null,
  heading text not null,
  heading_level int not null default 2,
  content text not null,
  section_order int not null,
  word_count int not null default 0
);

create index paper_sections_paper_idx on public.paper_sections(paper_id);

-- Citations (extracted references)
create table public.citations (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  authors text,
  year int,
  url text not null,
  venue text,
  normalized_title text not null
);

create unique index citations_normalized_title_year_idx
  on public.citations(normalized_title, coalesce(year, 0));

-- Junction: paper <-> citation
create table public.paper_citations (
  paper_id uuid references public.papers(id) on delete cascade not null,
  citation_id uuid references public.citations(id) on delete cascade not null,
  primary key (paper_id, citation_id)
);

-- RLS: public read
alter table public.categories enable row level security;
alter table public.papers enable row level security;
alter table public.paper_sections enable row level security;
alter table public.citations enable row level security;
alter table public.paper_citations enable row level security;

create policy "Public read categories" on public.categories for select using (true);
create policy "Public read papers" on public.papers for select using (true);
create policy "Public read paper_sections" on public.paper_sections for select using (true);
create policy "Public read citations" on public.citations for select using (true);
create policy "Public read paper_citations" on public.paper_citations for select using (true);
