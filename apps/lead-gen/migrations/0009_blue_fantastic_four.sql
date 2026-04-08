CREATE TABLE "company_similarities" (
	"company_id" integer NOT NULL,
	"similar_company_id" integer NOT NULL,
	"cosine_sim" real NOT NULL,
	"feature_score" real NOT NULL,
	"combined_score" real NOT NULL,
	"computed_at" text DEFAULT now()::text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "extracted_entities" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer,
	"contact_id" integer,
	"entity_type" text NOT NULL,
	"entity_text" text NOT NULL,
	"normalized_value" text,
	"source_url" text,
	"model_id" text NOT NULL,
	"confidence" real NOT NULL,
	"relation_type" text,
	"related_entity_id" integer,
	"created_at" text DEFAULT now()::text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feature_drift" (
	"id" serial PRIMARY KEY NOT NULL,
	"feature_name" text NOT NULL,
	"window_start" text NOT NULL,
	"window_end" text NOT NULL,
	"count" integer NOT NULL,
	"mean" real,
	"stddev" real,
	"p50" real,
	"psi" real,
	"ks_statistic" real,
	"ks_p_value" real,
	"drift_detected" boolean DEFAULT false NOT NULL,
	"computed_at" text DEFAULT now()::text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lead_temperature" (
	"id" serial PRIMARY KEY NOT NULL,
	"contact_id" integer NOT NULL,
	"temperature" real NOT NULL,
	"intensity" real NOT NULL,
	"trend" text,
	"event_count" integer DEFAULT 0 NOT NULL,
	"last_event_at" text,
	"computed_at" text DEFAULT now()::text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ml_predictions" (
	"id" serial PRIMARY KEY NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" integer NOT NULL,
	"model_name" text NOT NULL,
	"model_version" text NOT NULL,
	"prediction_json" text NOT NULL,
	"confidence" real,
	"expires_at" text NOT NULL,
	"computed_at" text DEFAULT now()::text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "send_time_stats" (
	"id" serial PRIMARY KEY NOT NULL,
	"hour_utc" integer NOT NULL,
	"day_of_week" integer NOT NULL,
	"seniority" text,
	"industry" text,
	"sends" integer DEFAULT 0 NOT NULL,
	"opens" integer DEFAULT 0 NOT NULL,
	"replies" integer DEFAULT 0 NOT NULL,
	"updated_at" text DEFAULT now()::text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "weekly_engagement_stats" (
	"id" serial PRIMARY KEY NOT NULL,
	"week_start" text NOT NULL,
	"sends" integer DEFAULT 0 NOT NULL,
	"delivered" integer DEFAULT 0 NOT NULL,
	"opens" integer DEFAULT 0 NOT NULL,
	"clicks" integer DEFAULT 0 NOT NULL,
	"replies" integer DEFAULT 0 NOT NULL,
	"bounces" integer DEFAULT 0 NOT NULL,
	"industry" text,
	"seniority" text,
	"created_at" text DEFAULT now()::text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "hf_org_name" text;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "hf_presence_score" real DEFAULT 0;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "embedding" vector(384);--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "rank_score" real DEFAULT 0;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "rank_score_version" text;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "data_quality_score" real;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "anomaly_score" real;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "graph_embedding" text;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "graph_cluster_id" integer;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "graph_intent_boost" real DEFAULT 0;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "cf_factors" text;--> statement-breakpoint
ALTER TABLE "company_similarities" ADD CONSTRAINT "company_similarities_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_similarities" ADD CONSTRAINT "company_similarities_similar_company_id_companies_id_fk" FOREIGN KEY ("similar_company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extracted_entities" ADD CONSTRAINT "extracted_entities_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extracted_entities" ADD CONSTRAINT "extracted_entities_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_temperature" ADD CONSTRAINT "lead_temperature_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_company_sim_by_company" ON "company_similarities" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_extracted_entities_company" ON "extracted_entities" USING btree ("company_id","entity_type");--> statement-breakpoint
CREATE INDEX "idx_extracted_entities_type" ON "extracted_entities" USING btree ("entity_type");--> statement-breakpoint
CREATE INDEX "idx_feature_drift_feature_window" ON "feature_drift" USING btree ("feature_name","window_start");--> statement-breakpoint
CREATE INDEX "idx_lead_temperature_contact" ON "lead_temperature" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "idx_ml_predictions_entity" ON "ml_predictions" USING btree ("entity_type","entity_id","model_name");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_send_time_stats_slot" ON "send_time_stats" USING btree ("hour_utc","day_of_week","seniority","industry");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_weekly_stats_week_segment" ON "weekly_engagement_stats" USING btree ("week_start","industry","seniority");