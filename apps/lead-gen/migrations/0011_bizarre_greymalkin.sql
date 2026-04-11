ALTER TABLE "received_emails" ALTER COLUMN "resend_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "received_emails" ADD COLUMN "source" text DEFAULT 'email' NOT NULL;