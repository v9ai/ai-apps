ALTER TABLE "contacts" ADD COLUMN "to_be_deleted" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "deletion_score" real;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "deletion_reasons" text;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "deletion_flagged_at" text;