ALTER TABLE "contact_emails" ADD COLUMN "reply_classification" text;--> statement-breakpoint
ALTER TABLE "received_emails" ADD COLUMN "classification" text;--> statement-breakpoint
ALTER TABLE "received_emails" ADD COLUMN "classification_confidence" real;--> statement-breakpoint
ALTER TABLE "received_emails" ADD COLUMN "classified_at" text;--> statement-breakpoint
ALTER TABLE "received_emails" ADD COLUMN "matched_contact_id" integer;--> statement-breakpoint
ALTER TABLE "received_emails" ADD COLUMN "matched_outbound_id" integer;--> statement-breakpoint
ALTER TABLE "received_emails" ADD CONSTRAINT "received_emails_matched_contact_id_contacts_id_fk" FOREIGN KEY ("matched_contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "received_emails" ADD CONSTRAINT "received_emails_matched_outbound_id_contact_emails_id_fk" FOREIGN KEY ("matched_outbound_id") REFERENCES "public"."contact_emails"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_received_emails_classification" ON "received_emails" USING btree ("classification");