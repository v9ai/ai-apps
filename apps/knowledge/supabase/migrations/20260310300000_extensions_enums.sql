-- Ensure extensions (idempotent)
create extension if not exists vector with schema extensions;
create extension if not exists pg_trgm with schema extensions;

-- Enum types
create type public.concept_type as enum (
  'topic', 'skill', 'competency', 'technique', 'theory', 'tool'
);

create type public.edge_type as enum (
  'prerequisite', 'related', 'part_of', 'builds_on', 'contrasts_with', 'applies_to'
);

create type public.interaction_type as enum (
  'view', 'read_start', 'read_complete', 'bookmark', 'highlight',
  'search', 'concept_click', 'citation_click', 'nav_next', 'nav_prev'
);

create type public.mastery_level as enum (
  'novice', 'beginner', 'intermediate', 'proficient', 'expert'
);
