CREATE TABLE "brain_health_protocols" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"target_areas" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"notes" text,
	"start_date" date,
	"end_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "brain_health_protocols_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "cognitive_baselines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"protocol_id" uuid NOT NULL,
	"memory_score" real,
	"focus_score" real,
	"processing_speed_score" real,
	"mood_score" real,
	"sleep_score" real,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cognitive_baselines_protocol_id_unique" UNIQUE("protocol_id")
);
--> statement-breakpoint
CREATE TABLE "cognitive_check_ins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"protocol_id" uuid NOT NULL,
	"memory_score" real,
	"focus_score" real,
	"processing_speed_score" real,
	"mood_score" real,
	"sleep_score" real,
	"side_effects" text,
	"notes" text,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "doctors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"specialty" text,
	"phone" text,
	"email" text,
	"address" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "family_member_doctors" (
	"family_member_id" uuid NOT NULL,
	"doctor_id" uuid NOT NULL,
	CONSTRAINT "family_member_doctors_family_member_id_doctor_id_pk" PRIMARY KEY("family_member_id","doctor_id")
);
--> statement-breakpoint
CREATE TABLE "family_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"relationship" text,
	"date_of_birth" date,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "medical_letters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"doctor_id" uuid NOT NULL,
	"file_name" text NOT NULL,
	"file_path" text NOT NULL,
	"description" text,
	"letter_date" date,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memory_baseline" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"overall_score" real,
	"short_term_score" real,
	"long_term_score" real,
	"working_memory_score" real,
	"recall_speed" real,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "memory_baseline_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "memory_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"overall_score" real,
	"short_term_score" real,
	"long_term_score" real,
	"working_memory_score" real,
	"recall_speed" real,
	"category" text DEFAULT 'observation' NOT NULL,
	"description" text,
	"context" text,
	"protocol_id" uuid,
	"logged_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "protocol_researches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"protocol_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"supplement_findings" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"papers" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"synthesis" text,
	"paper_count" text,
	"supplement_count" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"error_message" text,
	"duration_ms" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "protocol_supplements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"protocol_id" uuid NOT NULL,
	"name" text NOT NULL,
	"dosage" text NOT NULL,
	"frequency" text NOT NULL,
	"mechanism" text,
	"target_areas" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"notes" text,
	"url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "doctor_id" uuid;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "family_member_id" uuid;--> statement-breakpoint
ALTER TABLE "brain_health_protocols" ADD CONSTRAINT "brain_health_protocols_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cognitive_baselines" ADD CONSTRAINT "cognitive_baselines_protocol_id_brain_health_protocols_id_fk" FOREIGN KEY ("protocol_id") REFERENCES "public"."brain_health_protocols"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cognitive_check_ins" ADD CONSTRAINT "cognitive_check_ins_protocol_id_brain_health_protocols_id_fk" FOREIGN KEY ("protocol_id") REFERENCES "public"."brain_health_protocols"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctors" ADD CONSTRAINT "doctors_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_member_doctors" ADD CONSTRAINT "family_member_doctors_family_member_id_family_members_id_fk" FOREIGN KEY ("family_member_id") REFERENCES "public"."family_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_member_doctors" ADD CONSTRAINT "family_member_doctors_doctor_id_doctors_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_members" ADD CONSTRAINT "family_members_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medical_letters" ADD CONSTRAINT "medical_letters_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medical_letters" ADD CONSTRAINT "medical_letters_doctor_id_doctors_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory_baseline" ADD CONSTRAINT "memory_baseline_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory_entries" ADD CONSTRAINT "memory_entries_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory_entries" ADD CONSTRAINT "memory_entries_protocol_id_brain_health_protocols_id_fk" FOREIGN KEY ("protocol_id") REFERENCES "public"."brain_health_protocols"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protocol_researches" ADD CONSTRAINT "protocol_researches_protocol_id_brain_health_protocols_id_fk" FOREIGN KEY ("protocol_id") REFERENCES "public"."brain_health_protocols"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protocol_supplements" ADD CONSTRAINT "protocol_supplements_protocol_id_brain_health_protocols_id_fk" FOREIGN KEY ("protocol_id") REFERENCES "public"."brain_health_protocols"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bhp_user_idx" ON "brain_health_protocols" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "bhp_status_idx" ON "brain_health_protocols" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "cb_protocol_idx" ON "cognitive_baselines" USING btree ("protocol_id");--> statement-breakpoint
CREATE INDEX "cci_protocol_idx" ON "cognitive_check_ins" USING btree ("protocol_id");--> statement-breakpoint
CREATE INDEX "cci_recorded_idx" ON "cognitive_check_ins" USING btree ("recorded_at");--> statement-breakpoint
CREATE INDEX "doctors_user_idx" ON "doctors" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "fmd_family_idx" ON "family_member_doctors" USING btree ("family_member_id");--> statement-breakpoint
CREATE INDEX "fmd_doctor_idx" ON "family_member_doctors" USING btree ("doctor_id");--> statement-breakpoint
CREATE INDEX "family_members_user_idx" ON "family_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "medical_letters_user_idx" ON "medical_letters" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "medical_letters_doctor_idx" ON "medical_letters" USING btree ("doctor_id");--> statement-breakpoint
CREATE UNIQUE INDEX "mb_user_idx" ON "memory_baseline" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "me_user_idx" ON "memory_entries" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "me_logged_idx" ON "memory_entries" USING btree ("logged_at");--> statement-breakpoint
CREATE INDEX "me_category_idx" ON "memory_entries" USING btree ("category");--> statement-breakpoint
CREATE INDEX "pr_protocol_idx" ON "protocol_researches" USING btree ("protocol_id");--> statement-breakpoint
CREATE INDEX "pr_user_idx" ON "protocol_researches" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "pr_status_idx" ON "protocol_researches" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ps_protocol_idx" ON "protocol_supplements" USING btree ("protocol_id");--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_doctor_id_doctors_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctors"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_family_member_id_family_members_id_fk" FOREIGN KEY ("family_member_id") REFERENCES "public"."family_members"("id") ON DELETE set null ON UPDATE no action;