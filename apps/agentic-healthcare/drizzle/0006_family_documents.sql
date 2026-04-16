-- Add contact fields to family_members
ALTER TABLE family_members ADD COLUMN phone text;
ALTER TABLE family_members ADD COLUMN email text;

-- Create family_documents table
CREATE TABLE IF NOT EXISTS "family_documents" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL,
  "family_member_id" uuid NOT NULL,
  "title" text NOT NULL,
  "document_type" text NOT NULL,
  "document_date" date,
  "source" text,
  "content" text,
  "external_url" text,
  "metadata" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "family_documents_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade,
  CONSTRAINT "family_documents_family_member_id_fk" FOREIGN KEY ("family_member_id") REFERENCES "public"."family_members"("id") ON DELETE cascade
);

CREATE INDEX IF NOT EXISTS "family_docs_user_idx" ON "family_documents" ("user_id");
CREATE INDEX IF NOT EXISTS "family_docs_member_idx" ON "family_documents" ("family_member_id");
CREATE INDEX IF NOT EXISTS "family_docs_date_idx" ON "family_documents" ("document_date");
