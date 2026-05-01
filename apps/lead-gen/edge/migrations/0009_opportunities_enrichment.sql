-- Voyager-enriched per-job fields captured by the chrome extension's
-- "Import all opportunities" button. The first six get typed columns
-- because they're queried/sorted in the leads UI; the long tail
-- (voyager_urn, state, easy_apply, formatted_industries, ...) lives
-- inside the existing `metadata` JSON column.

ALTER TABLE opportunities ADD COLUMN posted_at          TEXT;
ALTER TABLE opportunities ADD COLUMN workplace_type     TEXT;
ALTER TABLE opportunities ADD COLUMN employment_type    TEXT;
ALTER TABLE opportunities ADD COLUMN experience_level   TEXT;
ALTER TABLE opportunities ADD COLUMN applicant_count    INTEGER;
ALTER TABLE opportunities ADD COLUMN external_apply_url TEXT;

CREATE INDEX IF NOT EXISTS idx_opportunities_posted_at      ON opportunities(posted_at);
CREATE INDEX IF NOT EXISTS idx_opportunities_workplace_type ON opportunities(workplace_type);
