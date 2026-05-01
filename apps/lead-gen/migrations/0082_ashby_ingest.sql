CREATE UNIQUE INDEX IF NOT EXISTS opportunities_url_unique
  ON opportunities (url)
  WHERE url IS NOT NULL;

CREATE TABLE IF NOT EXISTS ashby_slugs (
  slug              TEXT PRIMARY KEY,
  first_seen        TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen         TIMESTAMPTZ NOT NULL DEFAULT now(),
  board_jobs_count  INTEGER
);
