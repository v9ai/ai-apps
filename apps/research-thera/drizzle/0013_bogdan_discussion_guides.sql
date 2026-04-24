CREATE TABLE IF NOT EXISTS "bogdan_discussion_guides" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "family_member_id" integer NOT NULL,
  "child_age" integer,
  "behavior_summary" text NOT NULL,
  "developmental_context" text NOT NULL,
  "conversation_starters" text NOT NULL,
  "talking_points" text NOT NULL,
  "language_guide" text NOT NULL,
  "anticipated_reactions" text NOT NULL,
  "follow_up_plan" text NOT NULL,
  "model" text NOT NULL DEFAULT 'deepseek-chat',
  "created_at" text NOT NULL DEFAULT NOW(),
  "updated_at" text NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "bogdan_discussion_guides_user_id_idx" ON "bogdan_discussion_guides" ("user_id");
CREATE INDEX IF NOT EXISTS "bogdan_discussion_guides_created_at_idx" ON "bogdan_discussion_guides" ("created_at");
