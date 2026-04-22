create table if not exists topics (
  id          integer primary key autoincrement,
  query       text not null unique,
  last_run_at text
);

create table if not exists runs (
  id          integer primary key autoincrement,
  topic_id    integer references topics(id),
  started_at  text not null default (datetime('now')),
  finished_at text,
  stats_json  text
);

create table if not exists papers (
  id                    text primary key,
  doi                   text,
  arxiv_id              text,
  title                 text not null,
  year                  integer,
  venue                 text,
  citation_count        integer,
  influential_citations integer,
  source                text not null,
  pdf_url               text,
  html_url              text,
  fields_json           text default '[]',
  authors_json          text default '[]',
  affiliations_json     text default '[]',
  abstract_text         text,
  fetch_status          text,
  fetch_format          text,
  fetched_at            text,
  updated_at            text not null default (datetime('now'))
);
create index if not exists papers_doi_idx   on papers(doi);
create index if not exists papers_arxiv_idx on papers(arxiv_id);

create table if not exists paper_topics (
  topic_id   integer not null,
  paper_id   text    not null,
  rank_score real,
  primary key (topic_id, paper_id)
);

create table if not exists authors (
  id              text primary key,
  display_name    text not null,
  name_variants   text default '[]',
  primary_affil   text,
  orcid           text,
  email_hints     text default '[]',
  paper_count     integer not null default 0,
  year_min        integer,
  year_max        integer,
  total_citations integer default 0,
  h_index         integer default 0,
  first_seen_at   text not null default (datetime('now'))
);

create table if not exists paper_authors (
  paper_id       text not null,
  author_id      text not null,
  position       text,
  position_index integer,
  primary key (paper_id, author_id)
);
create index if not exists paper_authors_author_idx on paper_authors(author_id);

create table if not exists paper_code_links (
  paper_id text not null,
  url      text not null,
  host     text,
  login    text,
  repo     text,
  intent   text,
  context  text,
  primary key (paper_id, url)
);

create table if not exists author_coauthors (
  author_id    text not null,
  coauthor_id  text not null,
  co_count     integer not null default 1,
  years_json   text default '[]',
  primary key (author_id, coauthor_id)
);

create table if not exists bandit_arms (
  pool       text not null,
  arm_id     text not null,
  pulls      integer not null default 0,
  reward_sum real    not null default 0,
  reward_sq  real    not null default 0,
  last_pull  text,
  primary key (pool, arm_id)
);

create table if not exists fetch_cache (
  key        text primary key,
  format     text,
  source_url text,
  fetched_at text not null default (datetime('now'))
);

create table if not exists contact_match_state (
  contact_id      text primary key,
  author_id       text,
  status          text not null,
  score           real,
  login           text,
  arm_id          text,
  evidence_ref    text,
  updated_at      text not null default (datetime('now'))
);
create index if not exists cms_status_idx on contact_match_state(status);
