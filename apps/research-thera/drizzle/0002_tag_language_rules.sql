CREATE TABLE IF NOT EXISTS "tag_language_rules" (
  "tag" text PRIMARY KEY NOT NULL,
  "language" text NOT NULL,
  "created_at" text DEFAULT now() NOT NULL
);

INSERT INTO "tag_language_rules" ("tag", "language")
VALUES ('sex-therapy', 'ro')
ON CONFLICT ("tag") DO NOTHING;
