CREATE TABLE "linkedin_posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" text DEFAULT 'post' NOT NULL,
	"url" text NOT NULL,
	"company_id" integer,
	"contact_id" integer,
	"title" text,
	"content" text,
	"author_name" text,
	"author_url" text,
	"location" text,
	"employment_type" text,
	"posted_at" text,
	"scraped_at" text DEFAULT now()::text NOT NULL,
	"raw_data" text,
	"created_at" text DEFAULT now()::text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "linkedin_posts" ADD CONSTRAINT "linkedin_posts_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "linkedin_posts" ADD CONSTRAINT "linkedin_posts_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_linkedin_posts_url" ON "linkedin_posts" USING btree ("url");--> statement-breakpoint
CREATE INDEX "idx_linkedin_posts_type" ON "linkedin_posts" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_linkedin_posts_company_id" ON "linkedin_posts" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_linkedin_posts_contact_id" ON "linkedin_posts" USING btree ("contact_id");