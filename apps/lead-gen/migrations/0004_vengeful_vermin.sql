CREATE TABLE "contact_reminders" (
	"id" serial PRIMARY KEY NOT NULL,
	"contact_id" integer NOT NULL,
	"remind_at" text NOT NULL,
	"recurrence" text DEFAULT 'none' NOT NULL,
	"note" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"snoozed_until" text,
	"created_at" text DEFAULT now()::text NOT NULL,
	"updated_at" text DEFAULT now()::text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "seniority" text;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "department" text;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "is_decision_maker" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "authority_score" real DEFAULT 0;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "dm_reasons" text;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "next_touch_score" real DEFAULT 0;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "last_contacted_at" text;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "ai_profile" text;--> statement-breakpoint
ALTER TABLE "contact_reminders" ADD CONSTRAINT "contact_reminders_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_contact_reminders_contact_id" ON "contact_reminders" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "idx_contact_reminders_remind_at" ON "contact_reminders" USING btree ("remind_at");--> statement-breakpoint
CREATE INDEX "idx_contact_reminders_status" ON "contact_reminders" USING btree ("status");