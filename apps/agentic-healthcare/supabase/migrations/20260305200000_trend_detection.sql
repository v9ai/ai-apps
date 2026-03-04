-- RPC for finding similar markers over time, joining with actual marker data
create or replace function public.find_similar_markers_over_time(
  query_embedding extensions.vector(1536),
  match_threshold float default 0.5,
  match_count int default 50,
  exact_marker_name text default null
)
returns table (
  marker_id uuid,
  test_id uuid,
  marker_name text,
  content text,
  similarity float,
  value text,
  unit text,
  flag text,
  test_date date,
  file_name text
)
language sql stable
security invoker
set search_path = extensions, public, pg_catalog
as $$
  select
    bme.marker_id,
    bme.test_id,
    bme.marker_name,
    bme.content,
    1 - (bme.embedding <=> query_embedding) as similarity,
    bm.value,
    bm.unit,
    bm.flag,
    bt.test_date,
    bt.file_name
  from public.blood_marker_embeddings bme
  join public.blood_markers bm on bm.id = bme.marker_id
  join public.blood_tests bt on bt.id = bme.test_id
  where bme.user_id = auth.uid()
    and 1 - (bme.embedding <=> query_embedding) > match_threshold
    and (exact_marker_name is null or bme.marker_name = exact_marker_name)
  order by bt.test_date asc nulls last, bme.embedding <=> query_embedding
  limit match_count;
$$;
