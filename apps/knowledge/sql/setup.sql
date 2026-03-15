-- ═══════════════════════════════════════
-- Extensions (run BEFORE drizzle-kit push)
-- ═══════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ═══════════════════════════════════════
-- Full-Text Search: tsvector columns + GIN
-- (run AFTER drizzle-kit push creates tables)
-- ═══════════════════════════════════════

ALTER TABLE papers
  ADD COLUMN IF NOT EXISTS fts tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(summary, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(content, '')), 'C')
  ) STORED;

CREATE INDEX IF NOT EXISTS papers_fts_idx ON papers USING gin (fts);

ALTER TABLE paper_sections
  ADD COLUMN IF NOT EXISTS fts tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(heading, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(content, '')), 'B')
  ) STORED;

CREATE INDEX IF NOT EXISTS paper_sections_fts_idx ON paper_sections USING gin (fts);

ALTER TABLE citations
  ADD COLUMN IF NOT EXISTS fts tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(authors, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(venue, '')), 'C')
  ) STORED;

CREATE INDEX IF NOT EXISTS citations_fts_idx ON citations USING gin (fts);

ALTER TABLE concepts
  ADD COLUMN IF NOT EXISTS fts tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B')
  ) STORED;

CREATE INDEX IF NOT EXISTS concepts_fts_idx ON concepts USING gin (fts);

-- Trigram index for fuzzy concept search
CREATE INDEX IF NOT EXISTS concepts_name_trgm_idx ON concepts USING gin (name gin_trgm_ops);

-- HNSW vector indexes for similarity search
CREATE INDEX IF NOT EXISTS paper_embeddings_hnsw_idx ON paper_embeddings
  USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS section_embeddings_hnsw_idx ON section_embeddings
  USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS concept_embeddings_hnsw_idx ON concept_embeddings
  USING hnsw (embedding vector_cosine_ops);

-- ═══════════════════════════════════════
-- Materialized Views
-- ═══════════════════════════════════════

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_paper_engagement AS
SELECT
  p.id AS paper_id,
  p.slug,
  p.title,
  count(DISTINCT ae.user_id) AS unique_readers,
  count(ae.id) AS total_views,
  avg(ae.duration_ms)::int AS avg_duration_ms,
  count(ae.id) FILTER (WHERE ae.event_name = 'read_complete') AS completions,
  count(DISTINCT ae.user_id) FILTER (WHERE ae.event_name = 'read_complete')::float /
    greatest(count(DISTINCT ae.user_id), 1) AS completion_rate,
  max(ae.created_at) AS last_activity
FROM papers p
LEFT JOIN analytics_events ae ON ae.paper_id = p.id
GROUP BY p.id, p.slug, p.title;

CREATE UNIQUE INDEX IF NOT EXISTS mv_paper_engagement_paper_idx ON mv_paper_engagement(paper_id);

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_daily_activity AS
SELECT
  date_trunc('day', ae.created_at)::date AS activity_date,
  ae.event_name,
  count(*) AS event_count,
  count(DISTINCT ae.user_id) AS unique_users,
  count(DISTINCT ae.paper_id) AS papers_touched
FROM analytics_events ae
WHERE ae.created_at > now() - interval '90 days'
GROUP BY date_trunc('day', ae.created_at)::date, ae.event_name;

CREATE UNIQUE INDEX IF NOT EXISTS mv_daily_activity_date_event_idx
  ON mv_daily_activity(activity_date, event_name);

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_category_engagement AS
SELECT
  cat.id AS category_id,
  cat.name AS category_name,
  count(DISTINCT ae.user_id) AS unique_readers,
  count(ae.id) AS total_events,
  avg(ae.duration_ms)::int AS avg_duration_ms
FROM categories cat
JOIN papers p ON p.category_id = cat.id
LEFT JOIN analytics_events ae ON ae.paper_id = p.id
GROUP BY cat.id, cat.name;

CREATE UNIQUE INDEX IF NOT EXISTS mv_category_engagement_cat_idx ON mv_category_engagement(category_id);

-- ═══════════════════════════════════════
-- RPCs: Knowledge Graph
-- ═══════════════════════════════════════

CREATE OR REPLACE FUNCTION get_prerequisites(
  target_concept_id uuid,
  max_depth int DEFAULT 10
)
RETURNS TABLE (
  concept_id uuid,
  concept_name text,
  depth int,
  path uuid[]
)
LANGUAGE sql STABLE
SET search_path = public, pg_catalog
AS $$
  WITH RECURSIVE prereqs AS (
    SELECT
      ce.source_id AS concept_id,
      c.name AS concept_name,
      1 AS depth,
      ARRAY[ce.target_id, ce.source_id] AS path
    FROM concept_edges ce
    JOIN concepts c ON c.id = ce.source_id
    WHERE ce.target_id = target_concept_id
      AND ce.edge_type = 'prerequisite'

    UNION ALL

    SELECT
      ce.source_id,
      c.name,
      p.depth + 1,
      p.path || ce.source_id
    FROM concept_edges ce
    JOIN concepts c ON c.id = ce.source_id
    JOIN prereqs p ON p.concept_id = ce.target_id
    WHERE ce.edge_type = 'prerequisite'
      AND p.depth < max_depth
      AND ce.source_id <> ALL(p.path)
  )
  SELECT DISTINCT ON (prereqs.concept_id)
    prereqs.concept_id,
    prereqs.concept_name,
    prereqs.depth,
    prereqs.path
  FROM prereqs
  ORDER BY prereqs.concept_id, prereqs.depth;
$$;

CREATE OR REPLACE FUNCTION get_dependents(
  source_concept_id uuid,
  max_depth int DEFAULT 10
)
RETURNS TABLE (
  concept_id uuid,
  concept_name text,
  depth int,
  path uuid[]
)
LANGUAGE sql STABLE
SET search_path = public, pg_catalog
AS $$
  WITH RECURSIVE deps AS (
    SELECT
      ce.target_id AS concept_id,
      c.name AS concept_name,
      1 AS depth,
      ARRAY[ce.source_id, ce.target_id] AS path
    FROM concept_edges ce
    JOIN concepts c ON c.id = ce.target_id
    WHERE ce.source_id = source_concept_id
      AND ce.edge_type = 'prerequisite'

    UNION ALL

    SELECT
      ce.target_id,
      c.name,
      d.depth + 1,
      d.path || ce.target_id
    FROM concept_edges ce
    JOIN concepts c ON c.id = ce.target_id
    JOIN deps d ON d.concept_id = ce.source_id
    WHERE ce.edge_type = 'prerequisite'
      AND d.depth < max_depth
      AND ce.target_id <> ALL(d.path)
  )
  SELECT DISTINCT ON (deps.concept_id)
    deps.concept_id,
    deps.concept_name,
    deps.depth,
    deps.path
  FROM deps
  ORDER BY deps.concept_id, deps.depth;
$$;

CREATE OR REPLACE FUNCTION get_concept_neighborhood(
  center_concept_id uuid,
  max_hops int DEFAULT 2
)
RETURNS TABLE (
  concept_id uuid,
  concept_name text,
  concept_type concept_type,
  hop int
)
LANGUAGE sql STABLE
SET search_path = public, pg_catalog
AS $$
  WITH RECURSIVE neighborhood AS (
    SELECT center_concept_id AS concept_id, 0 AS hop, ARRAY[center_concept_id] AS visited
    UNION ALL
    SELECT
      CASE WHEN ce.source_id = n.concept_id THEN ce.target_id ELSE ce.source_id END,
      n.hop + 1,
      n.visited || CASE WHEN ce.source_id = n.concept_id THEN ce.target_id ELSE ce.source_id END
    FROM concept_edges ce
    JOIN neighborhood n ON (ce.source_id = n.concept_id OR ce.target_id = n.concept_id)
    WHERE n.hop < max_hops
      AND CASE WHEN ce.source_id = n.concept_id THEN ce.target_id ELSE ce.source_id END <> ALL(n.visited)
  )
  SELECT DISTINCT
    c.id AS concept_id,
    c.name AS concept_name,
    c.concept_type,
    min(nh.hop) AS hop
  FROM neighborhood nh
  JOIN concepts c ON c.id = nh.concept_id
  GROUP BY c.id, c.name, c.concept_type
  ORDER BY min(nh.hop), c.name;
$$;

-- ═══════════════════════════════════════
-- RPCs: Knowledge Tracing
-- ═══════════════════════════════════════

CREATE OR REPLACE FUNCTION get_user_knowledge_map(target_user_id uuid)
RETURNS TABLE (
  concept_id uuid,
  concept_name text,
  concept_type concept_type,
  p_mastery float,
  mastery_level mastery_level,
  total_interactions int,
  prereq_mastery_avg float
)
LANGUAGE sql STABLE
SET search_path = public, pg_catalog
AS $$
  SELECT
    c.id AS concept_id,
    c.name AS concept_name,
    c.concept_type,
    coalesce(ks.p_mastery, 0) AS p_mastery,
    coalesce(ks.mastery_level, 'novice') AS mastery_level,
    coalesce(ks.total_interactions, 0) AS total_interactions,
    coalesce(avg(prereq_ks.p_mastery), 0) AS prereq_mastery_avg
  FROM concepts c
  LEFT JOIN knowledge_states ks
    ON ks.concept_id = c.id AND ks.user_id = target_user_id
  LEFT JOIN concept_edges ce
    ON ce.target_id = c.id AND ce.edge_type = 'prerequisite'
  LEFT JOIN knowledge_states prereq_ks
    ON prereq_ks.concept_id = ce.source_id AND prereq_ks.user_id = target_user_id
  GROUP BY c.id, c.name, c.concept_type, ks.p_mastery, ks.mastery_level, ks.total_interactions
  ORDER BY c.name;
$$;

CREATE OR REPLACE FUNCTION get_interaction_sequence(
  target_user_id uuid,
  seq_length int DEFAULT 50
)
RETURNS TABLE (
  concept_id uuid,
  concept_name text,
  interaction_type interaction_type,
  is_correct boolean,
  response_time_ms int,
  created_at timestamptz
)
LANGUAGE sql STABLE
SET search_path = public, pg_catalog
AS $$
  SELECT
    ie.concept_id,
    c.name AS concept_name,
    ie.interaction_type,
    ie.is_correct,
    ie.response_time_ms,
    ie.created_at
  FROM interaction_events ie
  LEFT JOIN concepts c ON c.id = ie.concept_id
  WHERE ie.user_id = target_user_id
    AND ie.concept_id IS NOT NULL
  ORDER BY ie.created_at DESC
  LIMIT seq_length;
$$;

-- ═══════════════════════════════════════
-- RPCs: Recommender
-- ═══════════════════════════════════════

CREATE OR REPLACE FUNCTION find_similar_papers(
  query_embedding vector(1024),
  match_threshold float DEFAULT 0.3,
  match_count int DEFAULT 10,
  exclude_paper_id uuid DEFAULT NULL
)
RETURNS TABLE (
  paper_id uuid,
  slug text,
  title text,
  category_name text,
  similarity float
)
LANGUAGE sql STABLE
SET search_path = public, pg_catalog
AS $$
  SELECT
    pe.paper_id,
    p.slug,
    p.title,
    cat.name AS category_name,
    1 - (pe.embedding <=> query_embedding) AS similarity
  FROM paper_embeddings pe
  JOIN papers p ON p.id = pe.paper_id
  JOIN categories cat ON cat.id = p.category_id
  WHERE 1 - (pe.embedding <=> query_embedding) > match_threshold
    AND (exclude_paper_id IS NULL OR pe.paper_id <> exclude_paper_id)
  ORDER BY pe.embedding <=> query_embedding
  LIMIT match_count;
$$;

CREATE OR REPLACE FUNCTION find_similar_sections(
  query_embedding vector(1024),
  match_threshold float DEFAULT 0.3,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  section_id uuid,
  paper_id uuid,
  paper_slug text,
  paper_title text,
  heading text,
  similarity float
)
LANGUAGE sql STABLE
SET search_path = public, pg_catalog
AS $$
  SELECT
    se.section_id,
    se.paper_id,
    p.slug AS paper_slug,
    p.title AS paper_title,
    ps.heading,
    1 - (se.embedding <=> query_embedding) AS similarity
  FROM section_embeddings se
  JOIN paper_sections ps ON ps.id = se.section_id
  JOIN papers p ON p.id = se.paper_id
  WHERE 1 - (se.embedding <=> query_embedding) > match_threshold
  ORDER BY se.embedding <=> query_embedding
  LIMIT match_count;
$$;

CREATE OR REPLACE FUNCTION recommend_papers_collaborative(
  target_user_id uuid,
  rec_count int DEFAULT 10
)
RETURNS TABLE (
  paper_id uuid,
  slug text,
  title text,
  score float
)
LANGUAGE sql STABLE
SET search_path = public, pg_catalog
AS $$
  WITH my_papers AS (
    SELECT paper_id, read_progress, coalesce(rating, 3) AS rating
    FROM user_paper_interactions
    WHERE user_id = target_user_id
      AND (read_progress > 0.3 OR rating >= 3 OR bookmarked)
  ),
  similar_users AS (
    SELECT
      upi.user_id,
      count(*)::float / greatest(
        (SELECT count(*) FROM my_papers) +
        (SELECT count(*) FROM user_paper_interactions upi2
         WHERE upi2.user_id = upi.user_id AND (upi2.read_progress > 0.3 OR upi2.rating >= 3 OR upi2.bookmarked))
        - count(*),
        1
      ) AS similarity
    FROM user_paper_interactions upi
    JOIN my_papers mp ON mp.paper_id = upi.paper_id
    WHERE upi.user_id <> target_user_id
      AND (upi.read_progress > 0.3 OR upi.rating >= 3 OR upi.bookmarked)
    GROUP BY upi.user_id
    HAVING count(*) >= 2
    ORDER BY similarity DESC
    LIMIT 20
  )
  SELECT
    p.id AS paper_id,
    p.slug,
    p.title,
    sum(su.similarity * coalesce(upi.rating, 3))::float AS score
  FROM similar_users su
  JOIN user_paper_interactions upi ON upi.user_id = su.user_id
  JOIN papers p ON p.id = upi.paper_id
  WHERE upi.paper_id NOT IN (SELECT paper_id FROM my_papers)
    AND (upi.read_progress > 0.3 OR upi.rating >= 3 OR upi.bookmarked)
  GROUP BY p.id, p.slug, p.title
  ORDER BY score DESC
  LIMIT rec_count;
$$;

-- ═══════════════════════════════════════
-- RPCs: Search
-- ═══════════════════════════════════════

CREATE OR REPLACE FUNCTION search_content(
  query_text text,
  result_limit int DEFAULT 20
)
RETURNS TABLE (
  result_type text,
  result_id uuid,
  title text,
  snippet text,
  rank float,
  paper_slug text,
  paper_title text
)
LANGUAGE sql STABLE
SET search_path = public, pg_catalog
AS $$
  (
    SELECT
      'paper'::text AS result_type,
      p.id AS result_id,
      p.title,
      ts_headline('english', p.content, websearch_to_tsquery('english', query_text),
        'MaxWords=40, MinWords=20, StartSel=**, StopSel=**') AS snippet,
      ts_rank(p.fts, websearch_to_tsquery('english', query_text))::float AS rank,
      p.slug AS paper_slug,
      p.title AS paper_title
    FROM papers p
    WHERE p.fts @@ websearch_to_tsquery('english', query_text)
    ORDER BY rank DESC
    LIMIT result_limit
  )
  UNION ALL
  (
    SELECT
      'section'::text,
      ps.id,
      ps.heading,
      ts_headline('english', ps.content, websearch_to_tsquery('english', query_text),
        'MaxWords=40, MinWords=20, StartSel=**, StopSel=**'),
      ts_rank(ps.fts, websearch_to_tsquery('english', query_text))::float,
      p.slug,
      p.title
    FROM paper_sections ps
    JOIN papers p ON p.id = ps.paper_id
    WHERE ps.fts @@ websearch_to_tsquery('english', query_text)
    ORDER BY ts_rank(ps.fts, websearch_to_tsquery('english', query_text)) DESC
    LIMIT result_limit
  )
  UNION ALL
  (
    SELECT
      'citation'::text,
      c.id,
      c.title,
      coalesce(c.authors, '') || CASE WHEN c.year IS NOT NULL THEN ' (' || c.year || ')' ELSE '' END
        || CASE WHEN c.venue IS NOT NULL THEN ' - ' || c.venue ELSE '' END,
      ts_rank(c.fts, websearch_to_tsquery('english', query_text))::float,
      NULL,
      NULL
    FROM citations c
    WHERE c.fts @@ websearch_to_tsquery('english', query_text)
    ORDER BY ts_rank(c.fts, websearch_to_tsquery('english', query_text)) DESC
    LIMIT result_limit
  )
  UNION ALL
  (
    SELECT
      'concept'::text,
      co.id,
      co.name,
      coalesce(co.description, ''),
      ts_rank(co.fts, websearch_to_tsquery('english', query_text))::float,
      NULL,
      NULL
    FROM concepts co
    WHERE co.fts @@ websearch_to_tsquery('english', query_text)
    ORDER BY ts_rank(co.fts, websearch_to_tsquery('english', query_text)) DESC
    LIMIT result_limit
  )
  ORDER BY rank DESC
  LIMIT result_limit;
$$;

CREATE OR REPLACE FUNCTION hybrid_search_papers(
  query_text text,
  query_embedding vector(1024),
  match_count int DEFAULT 10,
  fts_weight float DEFAULT 0.3,
  vector_weight float DEFAULT 0.7,
  match_threshold float DEFAULT 0.2
)
RETURNS TABLE (
  paper_id uuid,
  slug text,
  title text,
  category_name text,
  fts_rank float,
  vector_similarity float,
  combined_score float
)
LANGUAGE sql STABLE
SET search_path = public, pg_catalog
AS $$
  SELECT
    p.id AS paper_id,
    p.slug,
    p.title,
    cat.name AS category_name,
    ts_rank(p.fts, websearch_to_tsquery('english', query_text))::float AS fts_rank,
    (1 - (pe.embedding <=> query_embedding))::float AS vector_similarity,
    (
      fts_weight * ts_rank(p.fts, websearch_to_tsquery('english', query_text))
      + vector_weight * (1 - (pe.embedding <=> query_embedding))
    )::float AS combined_score
  FROM papers p
  JOIN paper_embeddings pe ON pe.paper_id = p.id
  JOIN categories cat ON cat.id = p.category_id
  WHERE
    p.fts @@ websearch_to_tsquery('english', query_text)
    OR 1 - (pe.embedding <=> query_embedding) > match_threshold
  ORDER BY combined_score DESC
  LIMIT match_count;
$$;

-- ═══════════════════════════════════════
-- RPCs: Analytics
-- ═══════════════════════════════════════

CREATE OR REPLACE FUNCTION refresh_analytics_views()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_paper_engagement;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_activity;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_category_engagement;
END;
$$;

CREATE OR REPLACE FUNCTION get_user_engagement_summary(target_user_id uuid)
RETURNS TABLE (
  papers_started bigint,
  papers_completed bigint,
  total_time_spent_min bigint,
  current_streak_days bigint,
  categories_explored bigint,
  favorite_category text
)
LANGUAGE sql STABLE
SET search_path = public, pg_catalog
AS $$
  WITH user_activity AS (
    SELECT
      count(DISTINCT paper_id) FILTER (WHERE event_name = 'read_start') AS papers_started,
      count(DISTINCT paper_id) FILTER (WHERE event_name = 'read_complete') AS papers_completed,
      coalesce(sum(duration_ms) / 60000, 0) AS total_time_spent_min
    FROM analytics_events
    WHERE user_id = target_user_id
  ),
  active_days AS (
    SELECT DISTINCT date_trunc('day', created_at)::date AS dt
    FROM analytics_events
    WHERE user_id = target_user_id
      AND created_at > now() - interval '365 days'
  ),
  numbered_days AS (
    SELECT dt, dt - make_interval(days => (row_number() OVER (ORDER BY dt))::int) AS grp
    FROM active_days
  ),
  streak_groups AS (
    SELECT grp, count(*) AS streak_len
    FROM numbered_days
    GROUP BY grp
  ),
  current_streak AS (
    SELECT coalesce(
      (SELECT sg.streak_len FROM streak_groups sg
       JOIN numbered_days nd ON nd.grp = sg.grp
       WHERE nd.dt = current_date OR nd.dt = current_date - 1
       ORDER BY sg.streak_len DESC
       LIMIT 1),
      0
    ) AS current_streak_days
  ),
  fav_cat AS (
    SELECT cat.name AS favorite_category
    FROM analytics_events ae
    JOIN papers p ON p.id = ae.paper_id
    JOIN categories cat ON cat.id = p.category_id
    WHERE ae.user_id = target_user_id
    GROUP BY cat.name
    ORDER BY count(*) DESC
    LIMIT 1
  )
  SELECT
    ua.papers_started,
    ua.papers_completed,
    ua.total_time_spent_min,
    cs.current_streak_days,
    (SELECT count(DISTINCT cat.id)
     FROM analytics_events ae2
     JOIN papers p2 ON p2.id = ae2.paper_id
     JOIN categories cat ON cat.id = p2.category_id
     WHERE ae2.user_id = target_user_id),
    coalesce(fc.favorite_category, 'None')
  FROM user_activity ua
  CROSS JOIN current_streak cs
  LEFT JOIN fav_cat fc ON true;
$$;

CREATE OR REPLACE FUNCTION get_reading_velocity(
  target_user_id uuid,
  window_days int DEFAULT 7
)
RETURNS TABLE (
  week_start date,
  papers_read bigint,
  total_time_min bigint,
  running_avg_papers float
)
LANGUAGE sql STABLE
SET search_path = public, pg_catalog
AS $$
  WITH weekly AS (
    SELECT
      date_trunc('week', created_at)::date AS week_start,
      count(DISTINCT paper_id) AS papers_read,
      coalesce(sum(duration_ms) / 60000, 0) AS total_time_min
    FROM analytics_events
    WHERE user_id = target_user_id
      AND event_name IN ('read_start', 'read_complete', 'page_view')
      AND created_at > now() - (window_days * 12) * interval '1 day'
    GROUP BY date_trunc('week', created_at)::date
  )
  SELECT
    w.week_start,
    w.papers_read,
    w.total_time_min,
    avg(w.papers_read) OVER (
      ORDER BY w.week_start
      ROWS BETWEEN 3 PRECEDING AND CURRENT ROW
    )::float AS running_avg_papers
  FROM weekly w
  ORDER BY w.week_start;
$$;
