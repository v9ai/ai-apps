-- Block-list of opportunity locations. The pattern is the lowercased,
-- trimmed substring; a row is hidden if its (lowercased) location contains
-- any pattern. label preserves the original casing for display.

CREATE TABLE IF NOT EXISTS "blocked_locations" (
  "id"         serial PRIMARY KEY,
  "tenant_id"  text NOT NULL DEFAULT COALESCE(NULLIF(current_setting('app.tenant', true), ''), 'vadim'),
  "pattern"    text NOT NULL,
  "label"      text,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "blocked_locations_tenant_pattern_uniq"
  ON "blocked_locations" ("tenant_id", "pattern");
