-- LinkedIn posts (company-authored or person-authored) keyed by company slug.
-- Mirrors the local SQLite schema in apps/lead-gen/src/lib/posts-db.ts:32-48,
-- minus the people FK (so company-authored posts can be ingested directly).

CREATE TABLE IF NOT EXISTS posts (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  company_key     TEXT    NOT NULL,
  author_kind     TEXT    NOT NULL CHECK(author_kind IN ('company','person')),
  author_name     TEXT,
  author_url      TEXT,
  post_url        TEXT,
  post_text       TEXT,
  posted_date     TEXT,
  reactions_count INTEGER NOT NULL DEFAULT 0,
  comments_count  INTEGER NOT NULL DEFAULT 0,
  reposts_count   INTEGER NOT NULL DEFAULT 0,
  media_type      TEXT    NOT NULL DEFAULT 'none',
  is_repost       INTEGER NOT NULL DEFAULT 0,
  original_author TEXT,
  scraped_at      TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(company_key, post_url)
);

CREATE INDEX IF NOT EXISTS idx_posts_company_key ON posts(company_key);
CREATE INDEX IF NOT EXISTS idx_posts_post_url    ON posts(post_url);
