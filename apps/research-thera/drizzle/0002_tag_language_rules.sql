CREATE TABLE IF NOT EXISTS "tag_language_rules" (
  "tag" text NOT NULL,
  "user_id" text NOT NULL,
  "language" text NOT NULL,
  "created_at" text DEFAULT now() NOT NULL,
  "updated_at" text DEFAULT now() NOT NULL,
  PRIMARY KEY ("tag", "user_id")
);
