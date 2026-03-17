-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE "research_embeddings" (
	"id" serial PRIMARY KEY NOT NULL,
	"goal_id" integer,
	"entity_type" text NOT NULL,
	"entity_id" integer NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"embedding" vector(1536),
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "research_embeddings_entity_type_entity_id_key" UNIQUE("entity_type","entity_id")
);
--> statement-breakpoint
CREATE TABLE "claim_cards" (
	"id" text PRIMARY KEY NOT NULL,
	"note_id" integer,
	"claim" text NOT NULL,
	"scope" text,
	"verdict" text NOT NULL,
	"confidence" integer NOT NULL,
	"evidence" text NOT NULL,
	"queries" text NOT NULL,
	"provenance" text NOT NULL,
	"notes" text,
	"created_at" text DEFAULT now() NOT NULL,
	"updated_at" text DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notes_claims" (
	"note_id" integer NOT NULL,
	"claim_id" text NOT NULL,
	"created_at" text DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "journal_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"family_member_id" integer,
	"title" text,
	"content" text NOT NULL,
	"mood" text,
	"mood_score" integer,
	"tags" text,
	"goal_id" integer,
	"is_private" integer DEFAULT 1 NOT NULL,
	"entry_date" text NOT NULL,
	"created_at" text DEFAULT now() NOT NULL,
	"updated_at" text DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "behavior_observations" (
	"id" serial PRIMARY KEY NOT NULL,
	"family_member_id" integer NOT NULL,
	"goal_id" integer,
	"issue_id" integer,
	"user_id" text NOT NULL,
	"observed_at" text NOT NULL,
	"observation_type" text NOT NULL,
	"frequency" integer,
	"intensity" text,
	"context" text,
	"notes" text,
	"created_at" text DEFAULT now() NOT NULL,
	"updated_at" text DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "unique_outcomes" (
	"id" serial PRIMARY KEY NOT NULL,
	"issue_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"observed_at" text NOT NULL,
	"description" text NOT NULL,
	"created_at" text DEFAULT now() NOT NULL,
	"updated_at" text DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_settings" (
	"user_id" text PRIMARY KEY NOT NULL,
	"story_language" text DEFAULT 'English' NOT NULL,
	"story_minutes" integer DEFAULT 10 NOT NULL,
	"created_at" text DEFAULT now() NOT NULL,
	"updated_at" text DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "relationships" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"subject_type" text NOT NULL,
	"subject_id" integer NOT NULL,
	"related_type" text NOT NULL,
	"related_id" integer NOT NULL,
	"relationship_type" text NOT NULL,
	"context" text,
	"start_date" text,
	"status" text DEFAULT 'active',
	"created_at" text DEFAULT now() NOT NULL,
	"updated_at" text DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "family_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"slug" text,
	"first_name" text NOT NULL,
	"name" text,
	"age_years" integer,
	"relationship" text,
	"date_of_birth" text,
	"bio" text,
	"email" text,
	"phone" text,
	"location" text,
	"occupation" text,
	"created_at" text DEFAULT now() NOT NULL,
	"updated_at" text DEFAULT now() NOT NULL,
	CONSTRAINT "family_members_slug_key" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "family_member_shares" (
	"family_member_id" integer NOT NULL,
	"email" text NOT NULL,
	"role" text DEFAULT 'VIEWER' NOT NULL,
	"created_at" text DEFAULT now() NOT NULL,
	"created_by" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"slug" text,
	"first_name" text NOT NULL,
	"last_name" text,
	"role" text,
	"age_years" integer,
	"notes" text,
	"created_at" text DEFAULT now() NOT NULL,
	"updated_at" text DEFAULT now() NOT NULL,
	CONSTRAINT "contacts_slug_key" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "issues" (
	"id" serial PRIMARY KEY NOT NULL,
	"feedback_id" integer,
	"family_member_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"category" text NOT NULL,
	"severity" text NOT NULL,
	"recommendations" text,
	"created_at" text DEFAULT now() NOT NULL,
	"updated_at" text DEFAULT now() NOT NULL,
	"related_family_member_id" integer,
	"journal_entry_id" integer
);
--> statement-breakpoint
CREATE TABLE "contact_feedbacks" (
	"id" serial PRIMARY KEY NOT NULL,
	"contact_id" integer NOT NULL,
	"family_member_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"subject" text,
	"feedback_date" text NOT NULL,
	"content" text NOT NULL,
	"tags" text,
	"source" text,
	"extracted" integer DEFAULT 0 NOT NULL,
	"extracted_issues" text,
	"created_at" text DEFAULT now() NOT NULL,
	"updated_at" text DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teacher_feedbacks" (
	"id" serial PRIMARY KEY NOT NULL,
	"family_member_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"teacher_name" text NOT NULL,
	"subject" text,
	"feedback_date" text NOT NULL,
	"content" text NOT NULL,
	"tags" text,
	"source" text,
	"extracted" integer DEFAULT 0 NOT NULL,
	"created_at" text DEFAULT now() NOT NULL,
	"updated_at" text DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "therapy_research" (
	"id" serial PRIMARY KEY NOT NULL,
	"goal_id" integer,
	"feedback_id" integer,
	"therapeutic_goal_type" text NOT NULL,
	"title" text NOT NULL,
	"authors" text NOT NULL,
	"year" integer,
	"journal" text,
	"doi" text,
	"url" text,
	"abstract" text,
	"key_findings" text NOT NULL,
	"therapeutic_techniques" text NOT NULL,
	"evidence_level" text,
	"issue_id" integer,
	"relevance_score" integer NOT NULL,
	"extracted_by" text NOT NULL,
	"extraction_confidence" integer NOT NULL,
	"created_at" text DEFAULT now() NOT NULL,
	"updated_at" text DEFAULT now() NOT NULL,
	"embedding" vector(384)
);
--> statement-breakpoint
CREATE TABLE "therapeutic_questions" (
	"id" serial PRIMARY KEY NOT NULL,
	"goal_id" integer NOT NULL,
	"question" text NOT NULL,
	"research_id" integer,
	"research_title" text,
	"rationale" text NOT NULL,
	"generated_at" text NOT NULL,
	"created_at" text DEFAULT now() NOT NULL,
	"updated_at" text DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notes" (
	"id" serial PRIMARY KEY NOT NULL,
	"entity_id" integer NOT NULL,
	"entity_type" text NOT NULL,
	"user_id" text NOT NULL,
	"note_type" text,
	"slug" text,
	"title" text,
	"content" text NOT NULL,
	"created_by" text,
	"tags" text,
	"visibility" text DEFAULT 'PRIVATE' NOT NULL,
	"created_at" text DEFAULT now() NOT NULL,
	"updated_at" text DEFAULT now() NOT NULL,
	CONSTRAINT "notes_slug_key" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "note_shares" (
	"note_id" integer NOT NULL,
	"email" text NOT NULL,
	"role" text DEFAULT 'READER' NOT NULL,
	"created_at" text DEFAULT now() NOT NULL,
	"created_by" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "goals" (
	"id" serial PRIMARY KEY NOT NULL,
	"family_member_id" integer,
	"user_id" text NOT NULL,
	"slug" text,
	"title" text NOT NULL,
	"description" text,
	"target_date" text,
	"status" text DEFAULT 'active' NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"therapeutic_text" text,
	"therapeutic_text_language" text,
	"therapeutic_text_generated_at" text,
	"story_language" text,
	"created_at" text DEFAULT now() NOT NULL,
	"updated_at" text DEFAULT now() NOT NULL,
	CONSTRAINT "goals_slug_key" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "stories" (
	"id" serial PRIMARY KEY NOT NULL,
	"goal_id" integer,
	"user_id" text,
	"content" text NOT NULL,
	"audio_key" text,
	"audio_url" text,
	"audio_generated_at" text,
	"created_at" text DEFAULT now() NOT NULL,
	"updated_at" text DEFAULT now() NOT NULL,
	"issue_id" integer,
	"feedback_id" integer,
	"language" text,
	"minutes" integer
);
--> statement-breakpoint
CREATE TABLE "text_segments" (
	"id" serial PRIMARY KEY NOT NULL,
	"goal_id" integer NOT NULL,
	"story_id" integer,
	"idx" integer NOT NULL,
	"text" text NOT NULL,
	"created_at" text DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "generation_jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"goal_id" integer,
	"story_id" integer,
	"status" text NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"result" text,
	"error" text,
	"created_at" text DEFAULT now() NOT NULL,
	"updated_at" text DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audio_assets" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"goal_id" integer NOT NULL,
	"story_id" integer,
	"language" text NOT NULL,
	"voice" text NOT NULL,
	"mime_type" text NOT NULL,
	"manifest" text NOT NULL,
	"created_at" text DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notes_research" (
	"note_id" integer NOT NULL,
	"research_id" integer NOT NULL,
	"created_at" text DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"emailVerified" boolean NOT NULL,
	"image" text,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL,
	CONSTRAINT "user_email_key" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"token" text NOT NULL,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL,
	"ipAddress" text,
	"userAgent" text,
	"userId" text NOT NULL,
	CONSTRAINT "session_token_key" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"accountId" text NOT NULL,
	"providerId" text NOT NULL,
	"userId" text NOT NULL,
	"accessToken" text,
	"refreshToken" text,
	"idToken" text,
	"accessTokenExpiresAt" timestamp,
	"refreshTokenExpiresAt" timestamp,
	"scope" text,
	"password" text,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"createdAt" timestamp,
	"updatedAt" timestamp
);
--> statement-breakpoint
ALTER TABLE "family_member_shares" ADD CONSTRAINT "family_member_shares_family_member_id_fkey" FOREIGN KEY ("family_member_id") REFERENCES "public"."family_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_related_family_member_id_fkey" FOREIGN KEY ("related_family_member_id") REFERENCES "public"."family_members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "note_shares" ADD CONSTRAINT "note_shares_note_id_fkey" FOREIGN KEY ("note_id") REFERENCES "public"."notes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stories" ADD CONSTRAINT "stories_goal_id_fkey" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "research_embeddings_embedding_idx" ON "research_embeddings" USING ivfflat ("embedding" vector_cosine_ops) WITH (lists=100);--> statement-breakpoint
CREATE INDEX "idx_therapy_research_embedding" ON "therapy_research" USING ivfflat ("embedding" vector_cosine_ops) WITH (lists=10);
*/