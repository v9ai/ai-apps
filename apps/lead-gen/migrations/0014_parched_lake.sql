CREATE TABLE "reply_drafts" (
	"id" serial PRIMARY KEY NOT NULL,
	"received_email_id" integer NOT NULL,
	"contact_id" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"draft_type" text DEFAULT 'reply' NOT NULL,
	"subject" text NOT NULL,
	"body_text" text NOT NULL,
	"body_html" text,
	"generation_model" text,
	"thread_context" text,
	"approved_at" text,
	"sent_at" text,
	"sent_resend_id" text,
	"created_at" text DEFAULT now()::text NOT NULL,
	"updated_at" text DEFAULT now()::text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "conversation_stage" text;--> statement-breakpoint
ALTER TABLE "reply_drafts" ADD CONSTRAINT "reply_drafts_received_email_id_received_emails_id_fk" FOREIGN KEY ("received_email_id") REFERENCES "public"."received_emails"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reply_drafts" ADD CONSTRAINT "reply_drafts_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_reply_drafts_received_email_id" ON "reply_drafts" USING btree ("received_email_id");--> statement-breakpoint
CREATE INDEX "idx_reply_drafts_contact_id" ON "reply_drafts" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "idx_reply_drafts_status" ON "reply_drafts" USING btree ("status");