-- Argument graph stored in Supabase (replaces Neo4j)
create table argument_graph_nodes (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references stress_test_sessions(id) on delete cascade,
  text text not null,
  strength double precision default 0.5,
  confidence double precision default 0.5,
  source_agent text not null,
  round integer not null,
  created_at timestamptz default now()
);

create index idx_graph_nodes_session on argument_graph_nodes(session_id);

create table argument_graph_edges (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references stress_test_sessions(id) on delete cascade,
  source_id uuid not null references argument_graph_nodes(id) on delete cascade,
  target_id uuid not null references argument_graph_nodes(id) on delete cascade,
  type text not null, -- 'ATTACKS' or 'SUPPORTS'
  strength double precision default 0.5,
  edge_subtype text, -- 'rebut', 'undermine', 'evidential', etc.
  created_by text,
  round integer not null,
  created_at timestamptz default now()
);

create index idx_graph_edges_session on argument_graph_edges(session_id);

-- Drop neo4j_graph_id column from stress_test_sessions
alter table stress_test_sessions drop column if exists neo4j_graph_id;
