-- ═══════════════════════════════════════
-- Full-Text Search: tsvector columns + GIN
-- ═══════════════════════════════════════

alter table public.papers
  add column fts tsvector
  generated always as (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(summary, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(content, '')), 'C')
  ) stored;

create index papers_fts_idx on public.papers using gin (fts);

alter table public.paper_sections
  add column fts tsvector
  generated always as (
    setweight(to_tsvector('english', coalesce(heading, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(content, '')), 'B')
  ) stored;

create index paper_sections_fts_idx on public.paper_sections using gin (fts);

alter table public.citations
  add column fts tsvector
  generated always as (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(authors, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(venue, '')), 'C')
  ) stored;

create index citations_fts_idx on public.citations using gin (fts);

alter table public.concepts
  add column fts tsvector
  generated always as (
    setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B')
  ) stored;

create index concepts_fts_idx on public.concepts using gin (fts);

-- ═══════════════════════════════════════
-- Pattern 1: Knowledge Graph RPCs
-- ═══════════════════════════════════════

-- Get all prerequisites (transitive)
create or replace function public.get_prerequisites(
  target_concept_id uuid,
  max_depth int default 10
)
returns table (
  concept_id uuid,
  concept_name text,
  depth int,
  path uuid[]
)
language sql stable
security invoker
set search_path = public, pg_catalog
as $$
  with recursive prereqs as (
    select
      ce.source_id as concept_id,
      c.name as concept_name,
      1 as depth,
      array[ce.target_id, ce.source_id] as path
    from concept_edges ce
    join concepts c on c.id = ce.source_id
    where ce.target_id = target_concept_id
      and ce.edge_type = 'prerequisite'

    union all

    select
      ce.source_id,
      c.name,
      p.depth + 1,
      p.path || ce.source_id
    from concept_edges ce
    join concepts c on c.id = ce.source_id
    join prereqs p on p.concept_id = ce.target_id
    where ce.edge_type = 'prerequisite'
      and p.depth < max_depth
      and ce.source_id <> all(p.path)
  )
  select distinct on (prereqs.concept_id)
    prereqs.concept_id,
    prereqs.concept_name,
    prereqs.depth,
    prereqs.path
  from prereqs
  order by prereqs.concept_id, prereqs.depth;
$$;

-- Get dependents (what a concept unlocks)
create or replace function public.get_dependents(
  source_concept_id uuid,
  max_depth int default 10
)
returns table (
  concept_id uuid,
  concept_name text,
  depth int,
  path uuid[]
)
language sql stable
security invoker
set search_path = public, pg_catalog
as $$
  with recursive deps as (
    select
      ce.target_id as concept_id,
      c.name as concept_name,
      1 as depth,
      array[ce.source_id, ce.target_id] as path
    from concept_edges ce
    join concepts c on c.id = ce.target_id
    where ce.source_id = source_concept_id
      and ce.edge_type = 'prerequisite'

    union all

    select
      ce.target_id,
      c.name,
      d.depth + 1,
      d.path || ce.target_id
    from concept_edges ce
    join concepts c on c.id = ce.target_id
    join deps d on d.concept_id = ce.source_id
    where ce.edge_type = 'prerequisite'
      and d.depth < max_depth
      and ce.target_id <> all(d.path)
  )
  select distinct on (deps.concept_id)
    deps.concept_id,
    deps.concept_name,
    deps.depth,
    deps.path
  from deps
  order by deps.concept_id, deps.depth;
$$;

-- Get concept neighborhood (subgraph within N hops)
create or replace function public.get_concept_neighborhood(
  center_concept_id uuid,
  max_hops int default 2
)
returns table (
  concept_id uuid,
  concept_name text,
  concept_type public.concept_type,
  hop int
)
language sql stable
security invoker
set search_path = public, pg_catalog
as $$
  with recursive neighborhood as (
    select center_concept_id as concept_id, 0 as hop, array[center_concept_id] as visited
    union all
    select
      case when ce.source_id = n.concept_id then ce.target_id else ce.source_id end,
      n.hop + 1,
      n.visited || case when ce.source_id = n.concept_id then ce.target_id else ce.source_id end
    from concept_edges ce
    join neighborhood n on (ce.source_id = n.concept_id or ce.target_id = n.concept_id)
    where n.hop < max_hops
      and case when ce.source_id = n.concept_id then ce.target_id else ce.source_id end <> all(n.visited)
  )
  select distinct
    c.id as concept_id,
    c.name as concept_name,
    c.concept_type,
    min(nh.hop) as hop
  from neighborhood nh
  join concepts c on c.id = nh.concept_id
  group by c.id, c.name, c.concept_type
  order by min(nh.hop), c.name;
$$;

-- ═══════════════════════════════════════
-- Pattern 2: Knowledge Tracing RPCs
-- ═══════════════════════════════════════

-- Get user knowledge map
create or replace function public.get_user_knowledge_map(target_user_id uuid)
returns table (
  concept_id uuid,
  concept_name text,
  concept_type public.concept_type,
  p_mastery float,
  mastery_level public.mastery_level,
  total_interactions int,
  prereq_mastery_avg float
)
language sql stable
security invoker
set search_path = public, pg_catalog
as $$
  select
    c.id as concept_id,
    c.name as concept_name,
    c.concept_type,
    coalesce(ks.p_mastery, 0) as p_mastery,
    coalesce(ks.mastery_level, 'novice') as mastery_level,
    coalesce(ks.total_interactions, 0) as total_interactions,
    coalesce(avg(prereq_ks.p_mastery), 0) as prereq_mastery_avg
  from concepts c
  left join knowledge_states ks
    on ks.concept_id = c.id and ks.user_id = target_user_id
  left join concept_edges ce
    on ce.target_id = c.id and ce.edge_type = 'prerequisite'
  left join knowledge_states prereq_ks
    on prereq_ks.concept_id = ce.source_id and prereq_ks.user_id = target_user_id
  group by c.id, c.name, c.concept_type, ks.p_mastery, ks.mastery_level, ks.total_interactions
  order by c.name;
$$;

-- Get recent interaction sequence (for DKT input)
create or replace function public.get_interaction_sequence(
  target_user_id uuid,
  seq_length int default 50
)
returns table (
  concept_id uuid,
  concept_name text,
  interaction_type public.interaction_type,
  is_correct boolean,
  response_time_ms int,
  created_at timestamptz
)
language sql stable
security invoker
set search_path = public, pg_catalog
as $$
  select
    ie.concept_id,
    c.name as concept_name,
    ie.interaction_type,
    ie.is_correct,
    ie.response_time_ms,
    ie.created_at
  from interaction_events ie
  left join concepts c on c.id = ie.concept_id
  where ie.user_id = target_user_id
    and ie.concept_id is not null
  order by ie.created_at desc
  limit seq_length;
$$;

-- ═══════════════════════════════════════
-- Pattern 3: Recommender RPCs
-- ═══════════════════════════════════════

-- Content-based: find similar papers
create or replace function public.find_similar_papers(
  query_embedding extensions.vector(1024),
  match_threshold float default 0.3,
  match_count int default 10,
  exclude_paper_id uuid default null
)
returns table (
  paper_id uuid,
  slug text,
  title text,
  category_name text,
  similarity float
)
language sql stable
security invoker
set search_path = public, pg_catalog
as $$
  select
    pe.paper_id,
    p.slug,
    p.title,
    cat.name as category_name,
    1 - (pe.embedding operator(extensions.<=>) query_embedding) as similarity
  from paper_embeddings pe
  join papers p on p.id = pe.paper_id
  join categories cat on cat.id = p.category_id
  where 1 - (pe.embedding operator(extensions.<=>) query_embedding) > match_threshold
    and (exclude_paper_id is null or pe.paper_id <> exclude_paper_id)
  order by pe.embedding operator(extensions.<=>) query_embedding
  limit match_count;
$$;

-- Content-based: find similar sections
create or replace function public.find_similar_sections(
  query_embedding extensions.vector(1024),
  match_threshold float default 0.3,
  match_count int default 10
)
returns table (
  section_id uuid,
  paper_id uuid,
  paper_slug text,
  paper_title text,
  heading text,
  similarity float
)
language sql stable
security invoker
set search_path = public, pg_catalog
as $$
  select
    se.section_id,
    se.paper_id,
    p.slug as paper_slug,
    p.title as paper_title,
    ps.heading,
    1 - (se.embedding operator(extensions.<=>) query_embedding) as similarity
  from section_embeddings se
  join paper_sections ps on ps.id = se.section_id
  join papers p on p.id = se.paper_id
  where 1 - (se.embedding operator(extensions.<=>) query_embedding) > match_threshold
  order by se.embedding operator(extensions.<=>) query_embedding
  limit match_count;
$$;

-- Collaborative filtering: recommend papers
create or replace function public.recommend_papers_collaborative(
  target_user_id uuid,
  rec_count int default 10
)
returns table (
  paper_id uuid,
  slug text,
  title text,
  score float
)
language sql stable
security invoker
set search_path = public, pg_catalog
as $$
  with my_papers as (
    select paper_id, read_progress, coalesce(rating, 3) as rating
    from user_paper_interactions
    where user_id = target_user_id
      and (read_progress > 0.3 or rating >= 3 or bookmarked)
  ),
  similar_users as (
    select
      upi.user_id,
      count(*)::float / greatest(
        (select count(*) from my_papers) +
        (select count(*) from user_paper_interactions upi2
         where upi2.user_id = upi.user_id and (upi2.read_progress > 0.3 or upi2.rating >= 3 or upi2.bookmarked))
        - count(*),
        1
      ) as similarity
    from user_paper_interactions upi
    join my_papers mp on mp.paper_id = upi.paper_id
    where upi.user_id <> target_user_id
      and (upi.read_progress > 0.3 or upi.rating >= 3 or upi.bookmarked)
    group by upi.user_id
    having count(*) >= 2
    order by similarity desc
    limit 20
  )
  select
    p.id as paper_id,
    p.slug,
    p.title,
    sum(su.similarity * coalesce(upi.rating, 3))::float as score
  from similar_users su
  join user_paper_interactions upi on upi.user_id = su.user_id
  join papers p on p.id = upi.paper_id
  where upi.paper_id not in (select paper_id from my_papers)
    and (upi.read_progress > 0.3 or upi.rating >= 3 or upi.bookmarked)
  group by p.id, p.slug, p.title
  order by score desc
  limit rec_count;
$$;

-- ═══════════════════════════════════════
-- Pattern 5: Search RPCs
-- ═══════════════════════════════════════

-- Unified full-text search
create or replace function public.search_content(
  query_text text,
  result_limit int default 20
)
returns table (
  result_type text,
  result_id uuid,
  title text,
  snippet text,
  rank float,
  paper_slug text,
  paper_title text
)
language sql stable
security invoker
set search_path = public, pg_catalog
as $$
  (
    select
      'paper'::text as result_type,
      p.id as result_id,
      p.title,
      ts_headline('english', p.content, websearch_to_tsquery('english', query_text),
        'MaxWords=40, MinWords=20, StartSel=**, StopSel=**') as snippet,
      ts_rank(p.fts, websearch_to_tsquery('english', query_text))::float as rank,
      p.slug as paper_slug,
      p.title as paper_title
    from papers p
    where p.fts @@ websearch_to_tsquery('english', query_text)
    order by rank desc
    limit result_limit
  )
  union all
  (
    select
      'section'::text,
      ps.id,
      ps.heading,
      ts_headline('english', ps.content, websearch_to_tsquery('english', query_text),
        'MaxWords=40, MinWords=20, StartSel=**, StopSel=**'),
      ts_rank(ps.fts, websearch_to_tsquery('english', query_text))::float,
      p.slug,
      p.title
    from paper_sections ps
    join papers p on p.id = ps.paper_id
    where ps.fts @@ websearch_to_tsquery('english', query_text)
    order by ts_rank(ps.fts, websearch_to_tsquery('english', query_text)) desc
    limit result_limit
  )
  union all
  (
    select
      'citation'::text,
      c.id,
      c.title,
      coalesce(c.authors, '') || case when c.year is not null then ' (' || c.year || ')' else '' end
        || case when c.venue is not null then ' - ' || c.venue else '' end,
      ts_rank(c.fts, websearch_to_tsquery('english', query_text))::float,
      null,
      null
    from citations c
    where c.fts @@ websearch_to_tsquery('english', query_text)
    order by ts_rank(c.fts, websearch_to_tsquery('english', query_text)) desc
    limit result_limit
  )
  union all
  (
    select
      'concept'::text,
      co.id,
      co.name,
      coalesce(co.description, ''),
      ts_rank(co.fts, websearch_to_tsquery('english', query_text))::float,
      null,
      null
    from concepts co
    where co.fts @@ websearch_to_tsquery('english', query_text)
    order by ts_rank(co.fts, websearch_to_tsquery('english', query_text)) desc
    limit result_limit
  )
  order by rank desc
  limit result_limit;
$$;

-- Hybrid search: FTS + vector
create or replace function public.hybrid_search_papers(
  query_text text,
  query_embedding extensions.vector(1024),
  match_count int default 10,
  fts_weight float default 0.3,
  vector_weight float default 0.7,
  match_threshold float default 0.2
)
returns table (
  paper_id uuid,
  slug text,
  title text,
  category_name text,
  fts_rank float,
  vector_similarity float,
  combined_score float
)
language sql stable
security invoker
set search_path = public, pg_catalog
as $$
  select
    p.id as paper_id,
    p.slug,
    p.title,
    cat.name as category_name,
    ts_rank(p.fts, websearch_to_tsquery('english', query_text))::float as fts_rank,
    (1 - (pe.embedding operator(extensions.<=>) query_embedding))::float as vector_similarity,
    (
      fts_weight * ts_rank(p.fts, websearch_to_tsquery('english', query_text))
      + vector_weight * (1 - (pe.embedding operator(extensions.<=>) query_embedding))
    )::float as combined_score
  from papers p
  join paper_embeddings pe on pe.paper_id = p.id
  join categories cat on cat.id = p.category_id
  where
    p.fts @@ websearch_to_tsquery('english', query_text)
    or 1 - (pe.embedding operator(extensions.<=>) query_embedding) > match_threshold
  order by combined_score desc
  limit match_count;
$$;
