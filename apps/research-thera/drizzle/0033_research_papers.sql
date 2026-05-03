-- Dedicated research papers store, populated by the `papers_research` LangGraph
-- graph. Decoupled from any single owner (protocol / condition / medication)
-- via the research_paper_links join table so the same paper can be cited from
-- multiple places without duplication.

CREATE TABLE IF NOT EXISTS research_papers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doi             TEXT UNIQUE,
  source          TEXT NOT NULL, -- 'openalex' | 'crossref' | 'semantic_scholar' | 'arxiv' | 'pubmed' | 'europe_pmc' | 'biorxiv'
  source_id       TEXT NOT NULL,
  title           TEXT NOT NULL,
  authors         JSONB NOT NULL DEFAULT '[]'::jsonb,
  year            INTEGER,
  abstract        TEXT,
  tldr            TEXT,
  url             TEXT,
  pdf_url         TEXT,
  citation_count  INTEGER,
  fields_of_study JSONB,
  venue           TEXT,
  rerank_score    REAL,
  created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (source, source_id)
);

CREATE INDEX IF NOT EXISTS idx_research_papers_source
  ON research_papers(source, source_id);

CREATE TABLE IF NOT EXISTS research_paper_links (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paper_id     UUID NOT NULL REFERENCES research_papers(id) ON DELETE CASCADE,
  owner_kind   TEXT NOT NULL, -- 'protocol' | 'condition' | 'medication' | 'ad_hoc'
  owner_id     TEXT NOT NULL,
  rerank_score REAL,
  created_at   TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (paper_id, owner_kind, owner_id)
);

CREATE INDEX IF NOT EXISTS idx_research_paper_links_owner
  ON research_paper_links(owner_kind, owner_id);
