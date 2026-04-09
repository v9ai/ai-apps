ALTER TABLE "linkedin_posts" ADD COLUMN "skills" text;--> statement-breakpoint
ALTER TABLE "linkedin_posts" ADD COLUMN "analyzed_at" text;--> statement-breakpoint
ALTER TABLE "linkedin_posts" ADD COLUMN "job_embedding" vector(768);