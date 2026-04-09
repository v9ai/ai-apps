CREATE TABLE IF NOT EXISTS "affirmations" (
  "id" serial PRIMARY KEY NOT NULL,
  "family_member_id" integer NOT NULL,
  "user_id" text NOT NULL,
  "text" text NOT NULL,
  "category" text DEFAULT 'encouragement' NOT NULL,
  "is_active" integer DEFAULT 1 NOT NULL,
  "created_at" text DEFAULT now() NOT NULL,
  "updated_at" text DEFAULT now() NOT NULL
);
