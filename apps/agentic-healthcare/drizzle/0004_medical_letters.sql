CREATE TABLE IF NOT EXISTS "medical_letters" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL,
  "doctor_id" uuid NOT NULL,
  "file_name" text NOT NULL,
  "file_path" text NOT NULL,
  "description" text,
  "letter_date" date,
  "uploaded_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "medical_letters_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade,
  CONSTRAINT "medical_letters_doctor_id_doctors_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctors"("id") ON DELETE cascade
);

CREATE INDEX IF NOT EXISTS "medical_letters_user_idx" ON "medical_letters" ("user_id");
CREATE INDEX IF NOT EXISTS "medical_letters_doctor_idx" ON "medical_letters" ("doctor_id");
