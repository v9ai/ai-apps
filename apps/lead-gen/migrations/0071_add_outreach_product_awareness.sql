-- Wire products.gtm_analysis.outreach_templates + products.icp_analysis.personas
-- into email_outreach_graph. Intervention #2 from the outreach-awareness plan.
--
-- email_campaigns:
--   product_id — optional link to the product being pitched. When set, the
--   graph loads icp_analysis.personas + gtm_analysis.outreach_templates and
--   substitutes them into the draft prompt. Kept nullable so existing
--   company-only campaigns (no product context) keep working unchanged.
--   product_aware_mode — explicit opt-in flag. When false, legacy free-form
--   draft path runs even if product_id is set (useful for A/B toggling).
--   persona_match_threshold — min fuzzy score (0–1) to use a persona-matched
--   template. Below this, falls through to legacy path.
--
-- email_templates:
--   product_id / persona_title / channel — templates produced by gtm_graph
--   carry these so match_persona can pick the right one. `source` records
--   provenance ("gtm_graph" vs "user") so template eval can filter.
--   template_key — stable unique handle (e.g. "ingestible:vp_eng:email_day0")
--   so gtm_graph re-runs UPSERT without duplicating rows.
--
-- contact_persona_scores:
--   Cache of per-(contact, product, persona) scores so match_persona doesn't
--   re-run rapidfuzz on every draft. Unique on (contact_id, product_id,
--   persona_title); product_score index supports "who should I email next
--   for product X" queries.

ALTER TABLE "email_campaigns"
  ADD COLUMN IF NOT EXISTS "product_id" integer REFERENCES "products" ("id") ON DELETE SET NULL;

ALTER TABLE "email_campaigns"
  ADD COLUMN IF NOT EXISTS "product_aware_mode" boolean NOT NULL DEFAULT false;

ALTER TABLE "email_campaigns"
  ADD COLUMN IF NOT EXISTS "persona_match_threshold" real;

CREATE INDEX IF NOT EXISTS "idx_email_campaigns_product_id"
  ON "email_campaigns" ("product_id");

ALTER TABLE "email_templates"
  ADD COLUMN IF NOT EXISTS "product_id" integer REFERENCES "products" ("id") ON DELETE SET NULL;

ALTER TABLE "email_templates"
  ADD COLUMN IF NOT EXISTS "persona_title" text;

ALTER TABLE "email_templates"
  ADD COLUMN IF NOT EXISTS "channel" text;

ALTER TABLE "email_templates"
  ADD COLUMN IF NOT EXISTS "source" text;

ALTER TABLE "email_templates"
  ADD COLUMN IF NOT EXISTS "template_key" text;

CREATE UNIQUE INDEX IF NOT EXISTS "idx_email_templates_template_key"
  ON "email_templates" ("template_key");

CREATE TABLE IF NOT EXISTS "contact_persona_scores" (
  "id"            serial PRIMARY KEY,
  "tenant_id"     text NOT NULL DEFAULT COALESCE(NULLIF(current_setting('app.tenant', true), ''), 'vadim'),
  "contact_id"    integer NOT NULL REFERENCES "contacts" ("id") ON DELETE CASCADE,
  "product_id"    integer NOT NULL REFERENCES "products" ("id") ON DELETE CASCADE,
  "persona_title" text    NOT NULL,
  "score"         real    NOT NULL,
  "method"        text    NOT NULL,
  "rationale"     text,
  "scored_at"     text    NOT NULL DEFAULT now()::text
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_contact_persona_unique"
  ON "contact_persona_scores" ("contact_id", "product_id", "persona_title");

CREATE INDEX IF NOT EXISTS "idx_cps_product_score"
  ON "contact_persona_scores" ("product_id", "score");
