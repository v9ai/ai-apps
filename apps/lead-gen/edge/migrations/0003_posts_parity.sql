-- Bring D1 `posts` to parity with Neon `linkedin_posts`
-- (src/db/schema.ts:373-414) so D1 can become the canonical store.
--
-- Adds: tenant_id, type, contact_id, title/location/employment_type,
-- posted_at (ISO), raw_data + skills + analyzed_at (LLM-analysis layer),
-- voyager_* fields, and a TEXT job_embedding (JSON-of-floats — pgvector
-- has no D1 equivalent; similarity is computed in the worker).
--
-- Also denormalizes a small set of company fields onto every post row so
-- the analytics methods (src/lib/voyager/analytics.ts) don't need
-- cross-DB joins to Neon `companies`. Stale-on-company-update is acceptable
-- and gets fixed on the next upsert / nightly resync.

ALTER TABLE posts ADD COLUMN tenant_id              TEXT    NOT NULL DEFAULT 'public';
ALTER TABLE posts ADD COLUMN type                   TEXT    NOT NULL DEFAULT 'post' CHECK(type IN ('post','job'));
ALTER TABLE posts ADD COLUMN contact_id             INTEGER;
ALTER TABLE posts ADD COLUMN title                  TEXT;
ALTER TABLE posts ADD COLUMN content                TEXT;
ALTER TABLE posts ADD COLUMN location               TEXT;
ALTER TABLE posts ADD COLUMN employment_type        TEXT;
ALTER TABLE posts ADD COLUMN posted_at              TEXT;
ALTER TABLE posts ADD COLUMN raw_data               TEXT;
ALTER TABLE posts ADD COLUMN skills                 TEXT;
ALTER TABLE posts ADD COLUMN analyzed_at            TEXT;
ALTER TABLE posts ADD COLUMN job_embedding          TEXT;
ALTER TABLE posts ADD COLUMN voyager_urn            TEXT;
ALTER TABLE posts ADD COLUMN voyager_workplace_type TEXT;
ALTER TABLE posts ADD COLUMN voyager_salary_min     INTEGER;
ALTER TABLE posts ADD COLUMN voyager_salary_max     INTEGER;
ALTER TABLE posts ADD COLUMN voyager_salary_currency TEXT;
ALTER TABLE posts ADD COLUMN voyager_apply_url      TEXT;
ALTER TABLE posts ADD COLUMN voyager_poster_urn     TEXT;
ALTER TABLE posts ADD COLUMN voyager_listed_at      TEXT;
ALTER TABLE posts ADD COLUMN voyager_reposted       INTEGER NOT NULL DEFAULT 0;

ALTER TABLE posts ADD COLUMN company_name           TEXT;
ALTER TABLE posts ADD COLUMN company_industry       TEXT;
ALTER TABLE posts ADD COLUMN company_size_range     TEXT;
ALTER TABLE posts ADD COLUMN company_location       TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_posts_voyager_urn        ON posts(voyager_urn) WHERE voyager_urn IS NOT NULL;
CREATE INDEX        IF NOT EXISTS idx_posts_type               ON posts(type);
CREATE INDEX        IF NOT EXISTS idx_posts_contact_id         ON posts(contact_id);
CREATE INDEX        IF NOT EXISTS idx_posts_voyager_workplace  ON posts(voyager_workplace_type);
CREATE INDEX        IF NOT EXISTS idx_posts_tenant_company     ON posts(tenant_id, company_key);
CREATE INDEX        IF NOT EXISTS idx_posts_posted_at          ON posts(posted_at);

-- Neon dedupes by URL alone (idx_linkedin_posts_url UNIQUE). Mirror that
-- on D1 with (tenant_id, post_url) so multi-tenant rollouts don't collide
-- and so the existing UNIQUE(company_key, post_url) constraint becomes
-- redundant for new inserts. We keep the old constraint in place — it
-- already enforces dedup for the Durlston rows ingested via 0002, and
-- the new index is strictly tighter.
CREATE UNIQUE INDEX IF NOT EXISTS idx_posts_tenant_url         ON posts(tenant_id, post_url) WHERE post_url IS NOT NULL;
