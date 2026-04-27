CREATE TABLE IF NOT EXISTS "condition_deep_research" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL,
  "family_member_id" integer REFERENCES "family_members"("id") ON DELETE CASCADE,
  "condition_slug" text NOT NULL,
  "condition_name" text NOT NULL,
  "language" text NOT NULL DEFAULT 'ro',
  "pathophysiology" jsonb,
  "age_manifestations" jsonb,
  "evidence_based_treatments" jsonb,
  "comorbidities" jsonb,
  "red_flags" jsonb,
  "source_urls" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "fresh_until" timestamp with time zone,
  "generated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "condition_deep_research_user_idx"
  ON "condition_deep_research" ("user_id");

CREATE INDEX IF NOT EXISTS "condition_deep_research_fm_idx"
  ON "condition_deep_research" ("family_member_id");

CREATE UNIQUE INDEX IF NOT EXISTS "condition_deep_research_dedup_idx"
  ON "condition_deep_research" ("user_id", "family_member_id", "condition_slug", "language");
