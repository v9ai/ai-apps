CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "applications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_email" text NOT NULL,
	"job_id" text,
	"resume_url" text,
	"questions" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"notes" text,
	"job_title" text,
	"company_name" text,
	"job_description" text,
	"ai_interview_questions" text,
	"tech_dismissed_tags" text,
	"ai_tech_stack" text,
	"created_at" text DEFAULT now()::text NOT NULL,
	"updated_at" text DEFAULT now()::text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ashby_boards" (
	"id" serial PRIMARY KEY NOT NULL,
	"board_name" text NOT NULL,
	"discovered_at" text DEFAULT now()::text NOT NULL,
	"last_synced_at" text,
	"job_count" integer DEFAULT 0,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" text DEFAULT now()::text NOT NULL,
	"updated_at" text DEFAULT now()::text NOT NULL,
	CONSTRAINT "ashby_boards_board_name_unique" UNIQUE("board_name")
);
--> statement-breakpoint
CREATE TABLE "ats_boards" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"url" text NOT NULL,
	"vendor" text NOT NULL,
	"board_type" text NOT NULL,
	"confidence" real NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"first_seen_at" text NOT NULL,
	"last_seen_at" text NOT NULL,
	"source_type" text NOT NULL,
	"source_url" text NOT NULL,
	"crawl_id" text,
	"capture_timestamp" text,
	"observed_at" text NOT NULL,
	"method" text NOT NULL,
	"extractor_version" text,
	"warc_filename" text,
	"warc_offset" integer,
	"warc_length" integer,
	"warc_digest" text,
	"created_at" text DEFAULT now()::text NOT NULL,
	"updated_at" text DEFAULT now()::text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blocked_companies" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"reason" text,
	"created_at" text DEFAULT now()::text NOT NULL,
	CONSTRAINT "blocked_companies_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"logo_url" text,
	"website" text,
	"description" text,
	"industry" text,
	"size" text,
	"location" text,
	"canonical_domain" text,
	"category" text DEFAULT 'UNKNOWN' NOT NULL,
	"tags" text,
	"services" text,
	"service_taxonomy" text,
	"industries" text,
	"linkedin_url" text,
	"job_board_url" text,
	"score" real DEFAULT 0.5 NOT NULL,
	"score_reasons" text,
	"ashby_industry_tags" text,
	"ashby_tech_signals" text,
	"ashby_size_signal" text,
	"ashby_enriched_at" text,
	"ai_tier" integer DEFAULT 0 NOT NULL,
	"ai_classification_reason" text,
	"ai_classification_confidence" real DEFAULT 0.5,
	"deep_analysis" text,
	"email" text,
	"emails" text,
	"github_url" text,
	"last_seen_crawl_id" text,
	"last_seen_capture_timestamp" text,
	"last_seen_source_url" text,
	"created_at" text DEFAULT now()::text NOT NULL,
	"updated_at" text DEFAULT now()::text NOT NULL,
	CONSTRAINT "companies_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "company_facts" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"field" text NOT NULL,
	"value_json" text,
	"value_text" text,
	"normalized_value" text,
	"confidence" real NOT NULL,
	"source_type" text NOT NULL,
	"source_url" text NOT NULL,
	"crawl_id" text,
	"capture_timestamp" text,
	"observed_at" text NOT NULL,
	"method" text NOT NULL,
	"extractor_version" text,
	"http_status" integer,
	"mime" text,
	"content_hash" text,
	"warc_filename" text,
	"warc_offset" integer,
	"warc_length" integer,
	"warc_digest" text,
	"created_at" text DEFAULT now()::text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "company_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"source_url" text NOT NULL,
	"crawl_id" text,
	"capture_timestamp" text,
	"fetched_at" text NOT NULL,
	"http_status" integer,
	"mime" text,
	"content_hash" text,
	"text_sample" text,
	"jsonld" text,
	"extracted" text,
	"source_type" text NOT NULL,
	"method" text NOT NULL,
	"extractor_version" text,
	"warc_filename" text,
	"warc_offset" integer,
	"warc_length" integer,
	"warc_digest" text,
	"created_at" text DEFAULT now()::text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contact_emails" (
	"id" serial PRIMARY KEY NOT NULL,
	"contact_id" integer NOT NULL,
	"resend_id" text NOT NULL,
	"from_email" text NOT NULL,
	"to_emails" text NOT NULL,
	"subject" text NOT NULL,
	"text_content" text,
	"status" text DEFAULT 'sent' NOT NULL,
	"sent_at" text,
	"scheduled_at" text,
	"delivered_at" text,
	"opened_at" text,
	"recipient_name" text,
	"error_message" text,
	"parent_email_id" integer,
	"sequence_type" text,
	"sequence_number" text,
	"reply_received" boolean DEFAULT false,
	"reply_received_at" text,
	"followup_status" text,
	"company_id" integer,
	"cc_emails" text DEFAULT '[]',
	"reply_to_emails" text DEFAULT '[]',
	"html_content" text,
	"attachments" text DEFAULT '[]',
	"tags" text DEFAULT '[]',
	"headers" text DEFAULT '[]',
	"idempotency_key" text,
	"created_at" text DEFAULT now()::text NOT NULL,
	"updated_at" text DEFAULT now()::text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" serial PRIMARY KEY NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"linkedin_url" text,
	"email" text,
	"emails" text,
	"company" text,
	"company_id" integer,
	"position" text,
	"user_id" text,
	"nb_status" text,
	"nb_result" text,
	"nb_flags" text,
	"nb_suggested_correction" text,
	"nb_retry_token" text,
	"nb_execution_time_ms" integer,
	"email_verified" boolean DEFAULT false,
	"bounced_emails" text,
	"github_handle" text,
	"telegram_handle" text,
	"do_not_contact" boolean DEFAULT false,
	"tags" text,
	"created_at" text DEFAULT now()::text NOT NULL,
	"updated_at" text DEFAULT now()::text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_campaigns" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" integer,
	"name" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"sequence" text,
	"delay_days" text,
	"start_at" text,
	"mode" text,
	"from_email" text,
	"reply_to" text,
	"total_recipients" integer DEFAULT 0 NOT NULL,
	"emails_sent" integer DEFAULT 0 NOT NULL,
	"emails_scheduled" integer DEFAULT 0 NOT NULL,
	"emails_failed" integer DEFAULT 0 NOT NULL,
	"recipient_emails" text,
	"total_emails_planned" integer,
	"add_unsubscribe_headers" integer DEFAULT 0 NOT NULL,
	"unsubscribe_url" text,
	"add_anti_thread_header" integer DEFAULT 0 NOT NULL,
	"created_by" text,
	"created_at" text DEFAULT now()::text NOT NULL,
	"updated_at" text DEFAULT now()::text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"subject" text,
	"html_content" text,
	"text_content" text,
	"category" text,
	"tags" text,
	"variables" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"user_id" text,
	"created_at" text DEFAULT now()::text NOT NULL,
	"updated_at" text DEFAULT now()::text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "greenhouse_boards" (
	"id" serial PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"url" text,
	"first_seen" text DEFAULT now()::text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" text DEFAULT now()::text NOT NULL,
	"updated_at" text DEFAULT now()::text NOT NULL,
	CONSTRAINT "greenhouse_boards_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "job_report_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"job_id" integer NOT NULL,
	"event_type" text NOT NULL,
	"actor" text,
	"payload" text,
	"created_at" text DEFAULT now()::text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_skill_tags" (
	"job_id" integer NOT NULL,
	"tag" text NOT NULL,
	"level" text NOT NULL,
	"confidence" real,
	"evidence" text,
	"extracted_at" text NOT NULL,
	"version" text NOT NULL,
	CONSTRAINT "job_skill_tags_pk" PRIMARY KEY("job_id","tag")
);
--> statement-breakpoint
CREATE TABLE "job_sources" (
	"id" serial PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"company_key" text NOT NULL,
	"canonical_url" text,
	"first_seen_at" text DEFAULT now()::text NOT NULL,
	"last_synced_at" text,
	"last_fetched_at" text,
	"consecutive_errors" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"external_id" text NOT NULL,
	"source_id" text,
	"source_kind" text NOT NULL,
	"company_id" integer,
	"company_key" text NOT NULL,
	"title" text NOT NULL,
	"location" text,
	"url" text NOT NULL,
	"description" text,
	"posted_at" text NOT NULL,
	"score" real,
	"score_reason" text,
	"status" text,
	"is_remote_eu" boolean,
	"remote_eu_confidence" text,
	"remote_eu_reason" text,
	"role_ai_engineer" boolean,
	"role_confidence" text,
	"role_reason" text,
	"role_source" text,
	"ats_data" text,
	"absolute_url" text,
	"internal_job_id" integer,
	"requisition_id" text,
	"company_name" text,
	"first_published" text,
	"language" text,
	"metadata" text,
	"departments" text,
	"offices" text,
	"questions" text,
	"location_questions" text,
	"compliance" text,
	"demographic_questions" text,
	"data_compliance" text,
	"ashby_department" text,
	"ashby_team" text,
	"ashby_employment_type" text,
	"ashby_is_remote" boolean,
	"ashby_is_listed" boolean,
	"ashby_published_at" text,
	"ashby_job_url" text,
	"ashby_apply_url" text,
	"ashby_secondary_locations" text,
	"ashby_compensation" text,
	"ashby_address" text,
	"country" text,
	"workplace_type" text,
	"categories" text,
	"ats_created_at" text,
	"applied" boolean DEFAULT false NOT NULL,
	"applied_at" text,
	"recruiter_id" integer,
	"archived" boolean DEFAULT false NOT NULL,
	"salary_min" integer,
	"salary_max" integer,
	"salary_currency" text,
	"visa_sponsorship" boolean,
	"enrichment_status" text,
	"report_reason" text,
	"report_confidence" real,
	"report_reasoning" text,
	"report_tags" text,
	"report_action" text,
	"report_trace_id" text,
	"report_reviewed_at" text,
	"created_at" text DEFAULT now()::text NOT NULL,
	"updated_at" text DEFAULT now()::text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lever_boards" (
	"id" serial PRIMARY KEY NOT NULL,
	"site" text NOT NULL,
	"url" text,
	"first_seen" text DEFAULT now()::text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" text DEFAULT now()::text NOT NULL,
	"updated_at" text DEFAULT now()::text NOT NULL,
	CONSTRAINT "lever_boards_site_unique" UNIQUE("site")
);
--> statement-breakpoint
CREATE TABLE "opportunities" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"url" text,
	"source" text,
	"status" text DEFAULT 'open' NOT NULL,
	"reward_usd" real,
	"reward_text" text,
	"start_date" text,
	"end_date" text,
	"deadline" text,
	"first_seen" text,
	"last_seen" text,
	"score" integer,
	"raw_context" text,
	"metadata" text,
	"applied" boolean DEFAULT false NOT NULL,
	"applied_at" text,
	"application_status" text,
	"application_notes" text,
	"tags" text,
	"company_id" integer,
	"contact_id" integer,
	"created_at" text DEFAULT now()::text NOT NULL,
	"updated_at" text DEFAULT now()::text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "received_emails" (
	"id" serial PRIMARY KEY NOT NULL,
	"resend_id" text NOT NULL,
	"from_email" text,
	"to_emails" text DEFAULT '[]' NOT NULL,
	"cc_emails" text DEFAULT '[]',
	"reply_to_emails" text DEFAULT '[]',
	"subject" text,
	"message_id" text,
	"html_content" text,
	"text_content" text,
	"attachments" text DEFAULT '[]',
	"received_at" text NOT NULL,
	"archived_at" text,
	"created_at" text DEFAULT now()::text NOT NULL,
	"updated_at" text DEFAULT now()::text NOT NULL,
	CONSTRAINT "received_emails_resend_id_unique" UNIQUE("resend_id")
);
--> statement-breakpoint
CREATE TABLE "resumes" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"filename" text,
	"raw_text" text,
	"created_at" text DEFAULT now()::text NOT NULL,
	"updated_at" text DEFAULT now()::text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "skill_aliases" (
	"alias" text PRIMARY KEY NOT NULL,
	"tag" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'todo' NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"due_date" text,
	"completed_at" text,
	"entity_type" text,
	"entity_id" text,
	"tags" text,
	"created_at" text DEFAULT now()::text NOT NULL,
	"updated_at" text DEFAULT now()::text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" timestamp with time zone,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "user_preferences" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"field" text NOT NULL,
	"value_json" text,
	"value_text" text,
	"value_number" real,
	"confidence" real DEFAULT 1 NOT NULL,
	"source" text NOT NULL,
	"context" text,
	"observed_at" text NOT NULL,
	"created_at" text DEFAULT now()::text NOT NULL,
	"updated_at" text DEFAULT now()::text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"email_notifications" boolean DEFAULT true NOT NULL,
	"daily_digest" boolean DEFAULT false NOT NULL,
	"new_job_alerts" boolean DEFAULT true NOT NULL,
	"preferred_locations" text,
	"preferred_skills" text,
	"excluded_companies" text,
	"dark_mode" boolean DEFAULT true NOT NULL,
	"jobs_per_page" integer DEFAULT 20 NOT NULL,
	"created_at" text DEFAULT now()::text NOT NULL,
	"updated_at" text DEFAULT now()::text NOT NULL,
	CONSTRAINT "user_settings_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ats_boards" ADD CONSTRAINT "ats_boards_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_facts" ADD CONSTRAINT "company_facts_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_snapshots" ADD CONSTRAINT "company_snapshots_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_emails" ADD CONSTRAINT "contact_emails_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_emails" ADD CONSTRAINT "contact_emails_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_campaigns" ADD CONSTRAINT "email_campaigns_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_report_events" ADD CONSTRAINT "job_report_events_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_skill_tags" ADD CONSTRAINT "job_skill_tags_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_recruiter_id_contacts_id_fk" FOREIGN KEY ("recruiter_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_user_settings_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user_settings"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_ats_boards_company_url" ON "ats_boards" USING btree ("company_id","url");--> statement-breakpoint
CREATE INDEX "idx_ats_boards_vendor" ON "ats_boards" USING btree ("vendor");--> statement-breakpoint
CREATE INDEX "idx_blocked_companies_name" ON "blocked_companies" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_company_facts_company_field" ON "company_facts" USING btree ("company_id","field");--> statement-breakpoint
CREATE INDEX "idx_company_snapshots_company_hash" ON "company_snapshots" USING btree ("company_id","content_hash");--> statement-breakpoint
CREATE INDEX "idx_contact_emails_contact_id" ON "contact_emails" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "idx_contact_emails_resend_id" ON "contact_emails" USING btree ("resend_id");--> statement-breakpoint
CREATE INDEX "idx_contact_emails_status" ON "contact_emails" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_contact_emails_company_id" ON "contact_emails" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_contacts_email" ON "contacts" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_contacts_company_id" ON "contacts" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_contacts_linkedin_url" ON "contacts" USING btree ("linkedin_url");--> statement-breakpoint
CREATE INDEX "idx_email_campaigns_company_id" ON "email_campaigns" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_email_campaigns_status" ON "email_campaigns" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_email_templates_category" ON "email_templates" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_report_events_job" ON "job_report_events" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "idx_job_skill_tags_tag_job" ON "job_skill_tags" USING btree ("tag","job_id");--> statement-breakpoint
CREATE INDEX "idx_job_skill_tags_job_id" ON "job_skill_tags" USING btree ("job_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_job_sources_kind_key" ON "job_sources" USING btree ("kind","company_key");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_jobs_source_company_external" ON "jobs" USING btree ("source_kind","company_key","external_id");--> statement-breakpoint
CREATE INDEX "idx_jobs_external_id" ON "jobs" USING btree ("external_id");--> statement-breakpoint
CREATE INDEX "idx_jobs_posted_at_created_at" ON "jobs" USING btree ("posted_at","created_at");--> statement-breakpoint
CREATE INDEX "idx_jobs_is_remote_eu" ON "jobs" USING btree ("is_remote_eu");--> statement-breakpoint
CREATE INDEX "idx_jobs_company_key" ON "jobs" USING btree ("company_key");--> statement-breakpoint
CREATE INDEX "idx_jobs_source_kind" ON "jobs" USING btree ("source_kind");--> statement-breakpoint
CREATE INDEX "idx_jobs_remote_eu_posted" ON "jobs" USING btree ("is_remote_eu","posted_at","created_at");--> statement-breakpoint
CREATE INDEX "idx_opportunities_status" ON "opportunities" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_opportunities_company_id" ON "opportunities" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_opportunities_contact_id" ON "opportunities" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "idx_received_emails_from" ON "received_emails" USING btree ("from_email");--> statement-breakpoint
CREATE INDEX "idx_received_emails_message_id" ON "received_emails" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "idx_received_emails_received_at" ON "received_emails" USING btree ("received_at");--> statement-breakpoint
CREATE INDEX "idx_received_emails_resend_id" ON "received_emails" USING btree ("resend_id");--> statement-breakpoint
CREATE INDEX "idx_tasks_status" ON "tasks" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_tasks_priority" ON "tasks" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "idx_tasks_due_date" ON "tasks" USING btree ("due_date");--> statement-breakpoint
CREATE INDEX "idx_user_preferences_user_field" ON "user_preferences" USING btree ("user_id","field");