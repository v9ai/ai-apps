CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"channel" text NOT NULL,
	"direction" text NOT NULL,
	"contact_id" integer,
	"company_id" integer,
	"contact_email_id" integer,
	"sender_name" text,
	"sender_profile_url" text,
	"content" text,
	"subject" text,
	"sent_at" text NOT NULL,
	"classification" text,
	"classification_confidence" real,
	"raw_data" text,
	"created_at" text DEFAULT now()::text NOT NULL,
	"updated_at" text DEFAULT now()::text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "voyager_job_counts" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer,
	"query" text NOT NULL,
	"remote_count" integer DEFAULT 0 NOT NULL,
	"total_count" integer DEFAULT 0 NOT NULL,
	"counted_at" text DEFAULT now()::text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "voyager_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"li_at" text NOT NULL,
	"jsessionid" text NOT NULL,
	"csrf_token" text NOT NULL,
	"user_agent" text NOT NULL,
	"last_used" text DEFAULT now()::text NOT NULL,
	"request_count" integer DEFAULT 0 NOT NULL,
	"is_healthy" boolean DEFAULT true NOT NULL,
	"created_at" text DEFAULT now()::text NOT NULL,
	CONSTRAINT "voyager_sessions_session_id_unique" UNIQUE("session_id")
);
--> statement-breakpoint
CREATE TABLE "voyager_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"snapshot_date" text NOT NULL,
	"query" text NOT NULL,
	"total_jobs" integer DEFAULT 0 NOT NULL,
	"remote_jobs" integer DEFAULT 0 NOT NULL,
	"new_jobs_24h" integer DEFAULT 0 NOT NULL,
	"reposted_jobs" integer DEFAULT 0 NOT NULL,
	"top_companies" text,
	"top_skills" text,
	"salary_data" text,
	"location_breakdown" text,
	"industry_breakdown" text,
	"employment_types" text,
	"emerging_titles" text,
	"repost_analysis" text,
	"time_to_fill" text,
	"voyager_request_id" text,
	"raw_metadata" text,
	"created_at" text DEFAULT now()::text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "voyager_sync_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"sync_id" text NOT NULL,
	"query" text NOT NULL,
	"jobs_found" integer DEFAULT 0 NOT NULL,
	"jobs_new" integer DEFAULT 0 NOT NULL,
	"jobs_updated" integer DEFAULT 0 NOT NULL,
	"started_at" text NOT NULL,
	"completed_at" text,
	"errors" text,
	"created_at" text DEFAULT now()::text NOT NULL,
	CONSTRAINT "voyager_sync_log_sync_id_unique" UNIQUE("sync_id")
);
--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "authenticity_score" real;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "authenticity_verdict" text;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "authenticity_flags" text;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "verified_at" text;--> statement-breakpoint
ALTER TABLE "linkedin_posts" ADD COLUMN "voyager_urn" text;--> statement-breakpoint
ALTER TABLE "linkedin_posts" ADD COLUMN "voyager_workplace_type" text;--> statement-breakpoint
ALTER TABLE "linkedin_posts" ADD COLUMN "voyager_salary_min" integer;--> statement-breakpoint
ALTER TABLE "linkedin_posts" ADD COLUMN "voyager_salary_max" integer;--> statement-breakpoint
ALTER TABLE "linkedin_posts" ADD COLUMN "voyager_salary_currency" text;--> statement-breakpoint
ALTER TABLE "linkedin_posts" ADD COLUMN "voyager_apply_url" text;--> statement-breakpoint
ALTER TABLE "linkedin_posts" ADD COLUMN "voyager_poster_urn" text;--> statement-breakpoint
ALTER TABLE "linkedin_posts" ADD COLUMN "voyager_listed_at" text;--> statement-breakpoint
ALTER TABLE "linkedin_posts" ADD COLUMN "voyager_reposted" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_contact_email_id_contact_emails_id_fk" FOREIGN KEY ("contact_email_id") REFERENCES "public"."contact_emails"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voyager_job_counts" ADD CONSTRAINT "voyager_job_counts_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_messages_contact_id" ON "messages" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "idx_messages_company_id" ON "messages" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_messages_contact_email_id" ON "messages" USING btree ("contact_email_id");--> statement-breakpoint
CREATE INDEX "idx_messages_channel" ON "messages" USING btree ("channel");--> statement-breakpoint
CREATE INDEX "idx_messages_direction" ON "messages" USING btree ("direction");--> statement-breakpoint
CREATE INDEX "idx_messages_sent_at" ON "messages" USING btree ("sent_at");--> statement-breakpoint
CREATE INDEX "idx_voyager_job_counts_company_id" ON "voyager_job_counts" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_voyager_job_counts_query" ON "voyager_job_counts" USING btree ("query");--> statement-breakpoint
CREATE INDEX "idx_voyager_job_counts_counted_at" ON "voyager_job_counts" USING btree ("counted_at");--> statement-breakpoint
CREATE INDEX "idx_voyager_job_counts_company_query" ON "voyager_job_counts" USING btree ("company_id","query");--> statement-breakpoint
CREATE INDEX "idx_voyager_sessions_is_healthy" ON "voyager_sessions" USING btree ("is_healthy");--> statement-breakpoint
CREATE INDEX "idx_voyager_sessions_last_used" ON "voyager_sessions" USING btree ("last_used");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_voyager_snapshots_date_query" ON "voyager_snapshots" USING btree ("snapshot_date","query");--> statement-breakpoint
CREATE INDEX "idx_voyager_snapshots_date" ON "voyager_snapshots" USING btree ("snapshot_date");--> statement-breakpoint
CREATE INDEX "idx_voyager_sync_log_started_at" ON "voyager_sync_log" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "idx_voyager_sync_log_query" ON "voyager_sync_log" USING btree ("query");--> statement-breakpoint
CREATE INDEX "idx_companies_created_at" ON "companies" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_companies_updated_at" ON "companies" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "idx_contact_emails_parent_email_id" ON "contact_emails" USING btree ("parent_email_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_linkedin_posts_voyager_urn" ON "linkedin_posts" USING btree ("voyager_urn");--> statement-breakpoint
CREATE INDEX "idx_linkedin_posts_workplace_type" ON "linkedin_posts" USING btree ("voyager_workplace_type");