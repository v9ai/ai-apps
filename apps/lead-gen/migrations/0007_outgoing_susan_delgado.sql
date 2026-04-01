CREATE TABLE "intent_signals" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"signal_type" text NOT NULL,
	"source_type" text NOT NULL,
	"source_url" text,
	"raw_text" text NOT NULL,
	"evidence" text,
	"confidence" real NOT NULL,
	"detected_at" text NOT NULL,
	"decays_at" text NOT NULL,
	"decay_days" integer NOT NULL,
	"metadata" text,
	"model_version" text,
	"created_at" text DEFAULT now()::text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "intent_score" real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "intent_score_updated_at" text;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "intent_signals_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "intent_top_signal" text;--> statement-breakpoint
ALTER TABLE "intent_signals" ADD CONSTRAINT "intent_signals_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_intent_signals_company_type" ON "intent_signals" USING btree ("company_id","signal_type");--> statement-breakpoint
CREATE INDEX "idx_intent_signals_company_detected" ON "intent_signals" USING btree ("company_id","detected_at");--> statement-breakpoint
CREATE INDEX "idx_intent_signals_decays_at" ON "intent_signals" USING btree ("decays_at");