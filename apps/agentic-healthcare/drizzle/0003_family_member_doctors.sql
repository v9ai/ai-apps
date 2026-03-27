CREATE TABLE "family_member_doctors" (
  "family_member_id" uuid NOT NULL REFERENCES "family_members"("id") ON DELETE cascade,
  "doctor_id" uuid NOT NULL REFERENCES "doctors"("id") ON DELETE cascade,
  PRIMARY KEY ("family_member_id", "doctor_id")
);
--> statement-breakpoint
CREATE INDEX "fmd_family_idx" ON "family_member_doctors" ("family_member_id");
--> statement-breakpoint
CREATE INDEX "fmd_doctor_idx" ON "family_member_doctors" ("doctor_id");
--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "family_member_id" uuid REFERENCES "family_members"("id") ON DELETE set null;
