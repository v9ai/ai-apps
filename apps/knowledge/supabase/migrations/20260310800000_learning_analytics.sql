-- Analytics event log
create table public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  session_id text,
  event_name text not null,
  event_category text not null,
  paper_id uuid references public.papers(id) on delete set null,
  properties jsonb not null default '{}',
  duration_ms int,
  created_at timestamptz not null default now()
);

create index analytics_events_user_time_idx
  on public.analytics_events(user_id, created_at desc);
create index analytics_events_name_time_idx
  on public.analytics_events(event_name, created_at desc);
create index analytics_events_paper_time_idx
  on public.analytics_events(paper_id, created_at desc);
create index analytics_events_session_idx
  on public.analytics_events(session_id, created_at desc);

alter table public.analytics_events enable row level security;

create policy "Users insert own analytics" on public.analytics_events
  for insert with check (auth.uid() = user_id or user_id is null);
create policy "Users read own analytics" on public.analytics_events
  for select using (auth.uid() = user_id);

-- Materialized view: paper engagement
create materialized view public.mv_paper_engagement as
select
  p.id as paper_id,
  p.slug,
  p.title,
  count(distinct ae.user_id) as unique_readers,
  count(ae.id) as total_views,
  avg(ae.duration_ms)::int as avg_duration_ms,
  count(ae.id) filter (where ae.event_name = 'read_complete') as completions,
  count(distinct ae.user_id) filter (where ae.event_name = 'read_complete')::float /
    greatest(count(distinct ae.user_id), 1) as completion_rate,
  max(ae.created_at) as last_activity
from papers p
left join analytics_events ae on ae.paper_id = p.id
group by p.id, p.slug, p.title;

create unique index mv_paper_engagement_paper_idx on public.mv_paper_engagement(paper_id);

-- Materialized view: daily activity
create materialized view public.mv_daily_activity as
select
  date_trunc('day', ae.created_at)::date as activity_date,
  ae.event_name,
  count(*) as event_count,
  count(distinct ae.user_id) as unique_users,
  count(distinct ae.paper_id) as papers_touched
from analytics_events ae
where ae.created_at > now() - interval '90 days'
group by date_trunc('day', ae.created_at)::date, ae.event_name;

create unique index mv_daily_activity_date_event_idx
  on public.mv_daily_activity(activity_date, event_name);

-- Materialized view: category engagement
create materialized view public.mv_category_engagement as
select
  cat.id as category_id,
  cat.name as category_name,
  count(distinct ae.user_id) as unique_readers,
  count(ae.id) as total_events,
  avg(ae.duration_ms)::int as avg_duration_ms
from categories cat
join papers p on p.category_id = cat.id
left join analytics_events ae on ae.paper_id = p.id
group by cat.id, cat.name;

create unique index mv_category_engagement_cat_idx on public.mv_category_engagement(category_id);

-- RPC: refresh all materialized views
create or replace function public.refresh_analytics_views()
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  refresh materialized view concurrently mv_paper_engagement;
  refresh materialized view concurrently mv_daily_activity;
  refresh materialized view concurrently mv_category_engagement;
end;
$$;

-- RPC: user engagement summary
create or replace function public.get_user_engagement_summary(target_user_id uuid)
returns table (
  papers_started bigint,
  papers_completed bigint,
  total_time_spent_min bigint,
  current_streak_days bigint,
  categories_explored bigint,
  favorite_category text
)
language sql stable
security invoker
set search_path = public, pg_catalog
as $$
  with user_activity as (
    select
      count(distinct paper_id) filter (where event_name = 'read_start') as papers_started,
      count(distinct paper_id) filter (where event_name = 'read_complete') as papers_completed,
      coalesce(sum(duration_ms) / 60000, 0) as total_time_spent_min
    from analytics_events
    where user_id = target_user_id
  ),
  active_days as (
    select distinct date_trunc('day', created_at)::date as dt
    from analytics_events
    where user_id = target_user_id
      and created_at > now() - interval '365 days'
  ),
  numbered_days as (
    select dt, dt - make_interval(days => (row_number() over (order by dt))::int) as grp
    from active_days
  ),
  streak_groups as (
    select grp, count(*) as streak_len
    from numbered_days
    group by grp
  ),
  current_streak as (
    select coalesce(
      (select sg.streak_len from streak_groups sg
       join numbered_days nd on nd.grp = sg.grp
       where nd.dt = current_date or nd.dt = current_date - 1
       order by sg.streak_len desc
       limit 1),
      0
    ) as current_streak_days
  ),
  fav_cat as (
    select cat.name as favorite_category
    from analytics_events ae
    join papers p on p.id = ae.paper_id
    join categories cat on cat.id = p.category_id
    where ae.user_id = target_user_id
    group by cat.name
    order by count(*) desc
    limit 1
  )
  select
    ua.papers_started,
    ua.papers_completed,
    ua.total_time_spent_min,
    cs.current_streak_days,
    (select count(distinct cat.id)
     from analytics_events ae2
     join papers p2 on p2.id = ae2.paper_id
     join categories cat on cat.id = p2.category_id
     where ae2.user_id = target_user_id),
    coalesce(fc.favorite_category, 'None')
  from user_activity ua
  cross join current_streak cs
  left join fav_cat fc on true;
$$;

-- RPC: reading velocity with window functions
create or replace function public.get_reading_velocity(
  target_user_id uuid,
  window_days int default 7
)
returns table (
  week_start date,
  papers_read bigint,
  total_time_min bigint,
  running_avg_papers float
)
language sql stable
security invoker
set search_path = public, pg_catalog
as $$
  with weekly as (
    select
      date_trunc('week', created_at)::date as week_start,
      count(distinct paper_id) as papers_read,
      coalesce(sum(duration_ms) / 60000, 0) as total_time_min
    from analytics_events
    where user_id = target_user_id
      and event_name in ('read_start', 'read_complete', 'page_view')
      and created_at > now() - (window_days * 12) * interval '1 day'
    group by date_trunc('week', created_at)::date
  )
  select
    w.week_start,
    w.papers_read,
    w.total_time_min,
    avg(w.papers_read) over (
      order by w.week_start
      rows between 3 preceding and current row
    )::float as running_avg_papers
  from weekly w
  order by w.week_start;
$$;
