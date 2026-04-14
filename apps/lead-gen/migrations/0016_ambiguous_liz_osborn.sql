CREATE TABLE "crawl_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"seed_url" text NOT NULL,
	"company_slug" text NOT NULL,
	"status" text DEFAULT 'running' NOT NULL,
	"saved" integer DEFAULT 0 NOT NULL,
	"skipped" integer DEFAULT 0 NOT NULL,
	"filtered" integer DEFAULT 0 NOT NULL,
	"targets" integer DEFAULT 0 NOT NULL,
	"visited" integer DEFAULT 0 NOT NULL,
	"total_remote_jobs" integer DEFAULT 0 NOT NULL,
	"duration_ms" integer DEFAULT 0 NOT NULL,
	"entries" text,
	"error" text,
	"started_at" text NOT NULL,
	"completed_at" text,
	"created_at" text DEFAULT now()::text NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_crawl_logs_seed_url" ON "crawl_logs" USING btree ("seed_url");--> statement-breakpoint
CREATE INDEX "idx_crawl_logs_started_at" ON "crawl_logs" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "idx_crawl_logs_status" ON "crawl_logs" USING btree ("status");