CREATE TABLE `audio_assets` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`goal_id` integer NOT NULL,
	`story_id` integer,
	`language` text NOT NULL,
	`voice` text NOT NULL,
	`mime_type` text NOT NULL,
	`manifest` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `generation_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`type` text NOT NULL,
	`goal_id` integer NOT NULL,
	`story_id` integer,
	`status` text NOT NULL,
	`progress` integer DEFAULT 0 NOT NULL,
	`result` text,
	`error` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `goal_stories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`goal_id` integer NOT NULL,
	`language` text NOT NULL,
	`minutes` integer NOT NULL,
	`text` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `goals` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`family_member_id` integer NOT NULL,
	`user_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`target_date` text,
	`status` text DEFAULT 'active' NOT NULL,
	`priority` text DEFAULT 'medium' NOT NULL,
	`therapeutic_text` text,
	`therapeutic_text_language` text,
	`therapeutic_text_generated_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `notes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`entity_id` integer NOT NULL,
	`entity_type` text NOT NULL,
	`user_id` text NOT NULL,
	`note_type` text,
	`slug` text,
	`content` text NOT NULL,
	`created_by` text,
	`tags` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `notes_slug_unique` ON `notes` (`slug`);--> statement-breakpoint
CREATE TABLE `text_segments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`goal_id` integer NOT NULL,
	`story_id` integer,
	`idx` integer NOT NULL,
	`text` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `therapeutic_questions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`goal_id` integer NOT NULL,
	`question` text NOT NULL,
	`research_id` integer,
	`research_title` text,
	`rationale` text NOT NULL,
	`generated_at` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `therapy_research` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`goal_id` integer NOT NULL,
	`therapeutic_goal_type` text NOT NULL,
	`title` text NOT NULL,
	`authors` text NOT NULL,
	`year` integer,
	`journal` text,
	`doi` text,
	`url` text,
	`abstract` text,
	`key_findings` text NOT NULL,
	`therapeutic_techniques` text NOT NULL,
	`evidence_level` text,
	`relevance_score` integer NOT NULL,
	`extracted_by` text NOT NULL,
	`extraction_confidence` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
