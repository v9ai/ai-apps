CREATE TABLE `behavior_observations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`family_member_id` integer NOT NULL,
	`goal_id` integer,
	`characteristic_id` integer,
	`user_id` text NOT NULL,
	`observed_at` text NOT NULL,
	`observation_type` text NOT NULL,
	`frequency` integer,
	`intensity` text,
	`context` text,
	`notes` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `contact_feedbacks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`contact_id` integer NOT NULL,
	`family_member_id` integer NOT NULL,
	`user_id` text NOT NULL,
	`subject` text,
	`feedback_date` text NOT NULL,
	`content` text NOT NULL,
	`tags` text,
	`source` text,
	`extracted` integer DEFAULT 0 NOT NULL,
	`extracted_issues` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `contacts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`slug` text,
	`first_name` text NOT NULL,
	`last_name` text,
	`role` text,
	`age_years` integer,
	`notes` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `contacts_slug_unique` ON `contacts` (`slug`);--> statement-breakpoint
CREATE TABLE `family_member_characteristics` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`family_member_id` integer NOT NULL,
	`user_id` text NOT NULL,
	`category` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`severity` text,
	`frequency_per_week` integer,
	`duration_weeks` integer,
	`age_of_onset` integer,
	`impairment_domains` text,
	`externalized_name` text,
	`strengths` text,
	`risk_tier` text DEFAULT 'NONE' NOT NULL,
	`tags` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `family_member_shares` (
	`family_member_id` integer NOT NULL,
	`email` text NOT NULL,
	`role` text DEFAULT 'VIEWER' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`created_by` text NOT NULL,
	FOREIGN KEY (`family_member_id`) REFERENCES `family_members`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `family_members` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`slug` text,
	`first_name` text NOT NULL,
	`name` text,
	`age_years` integer,
	`relationship` text,
	`date_of_birth` text,
	`bio` text,
	`email` text,
	`phone` text,
	`location` text,
	`occupation` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `family_members_slug_unique` ON `family_members` (`slug`);--> statement-breakpoint
CREATE TABLE `issues` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`feedback_id` integer NOT NULL,
	`family_member_id` integer NOT NULL,
	`user_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`category` text NOT NULL,
	`severity` text NOT NULL,
	`recommendations` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `journal_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`family_member_id` integer,
	`title` text,
	`content` text NOT NULL,
	`mood` text,
	`mood_score` integer,
	`tags` text,
	`goal_id` integer,
	`is_private` integer DEFAULT 1 NOT NULL,
	`entry_date` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `relationships` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`subject_type` text NOT NULL,
	`subject_id` integer NOT NULL,
	`related_type` text NOT NULL,
	`related_id` integer NOT NULL,
	`relationship_type` text NOT NULL,
	`context` text,
	`start_date` text,
	`status` text DEFAULT 'active',
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `teacher_feedbacks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`family_member_id` integer NOT NULL,
	`user_id` text NOT NULL,
	`teacher_name` text NOT NULL,
	`subject` text,
	`feedback_date` text NOT NULL,
	`content` text NOT NULL,
	`tags` text,
	`source` text,
	`extracted` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `unique_outcomes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`characteristic_id` integer NOT NULL,
	`user_id` text NOT NULL,
	`observed_at` text NOT NULL,
	`description` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `user_settings` (
	`user_id` text PRIMARY KEY NOT NULL,
	`story_language` text DEFAULT 'English' NOT NULL,
	`story_minutes` integer DEFAULT 10 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_generation_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`type` text NOT NULL,
	`goal_id` integer,
	`story_id` integer,
	`status` text NOT NULL,
	`progress` integer DEFAULT 0 NOT NULL,
	`result` text,
	`error` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_generation_jobs`("id", "user_id", "type", "goal_id", "story_id", "status", "progress", "result", "error", "created_at", "updated_at") SELECT "id", "user_id", "type", "goal_id", "story_id", "status", "progress", "result", "error", "created_at", "updated_at" FROM `generation_jobs`;--> statement-breakpoint
DROP TABLE `generation_jobs`;--> statement-breakpoint
ALTER TABLE `__new_generation_jobs` RENAME TO `generation_jobs`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_goal_stories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`goal_id` integer,
	`characteristic_id` integer,
	`language` text NOT NULL,
	`minutes` integer NOT NULL,
	`text` text NOT NULL,
	`audio_key` text,
	`audio_url` text,
	`audio_generated_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_goal_stories`("id", "goal_id", "characteristic_id", "language", "minutes", "text", "audio_key", "audio_url", "audio_generated_at", "created_at", "updated_at") SELECT "id", "goal_id", "characteristic_id", "language", "minutes", "text", "audio_key", "audio_url", "audio_generated_at", "created_at", "updated_at" FROM `goal_stories`;--> statement-breakpoint
DROP TABLE `goal_stories`;--> statement-breakpoint
ALTER TABLE `__new_goal_stories` RENAME TO `goal_stories`;--> statement-breakpoint
CREATE TABLE `__new_goals` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`family_member_id` integer,
	`user_id` text NOT NULL,
	`slug` text,
	`title` text NOT NULL,
	`description` text,
	`target_date` text,
	`status` text DEFAULT 'active' NOT NULL,
	`priority` text DEFAULT 'medium' NOT NULL,
	`therapeutic_text` text,
	`therapeutic_text_language` text,
	`therapeutic_text_generated_at` text,
	`story_language` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_goals`("id", "family_member_id", "user_id", "slug", "title", "description", "target_date", "status", "priority", "therapeutic_text", "therapeutic_text_language", "therapeutic_text_generated_at", "story_language", "created_at", "updated_at") SELECT "id", "family_member_id", "user_id", "slug", "title", "description", "target_date", "status", "priority", "therapeutic_text", "therapeutic_text_language", "therapeutic_text_generated_at", "story_language", "created_at", "updated_at" FROM `goals`;--> statement-breakpoint
DROP TABLE `goals`;--> statement-breakpoint
ALTER TABLE `__new_goals` RENAME TO `goals`;--> statement-breakpoint
CREATE UNIQUE INDEX `goals_slug_unique` ON `goals` (`slug`);--> statement-breakpoint
CREATE TABLE `__new_therapy_research` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`goal_id` integer,
	`feedback_id` integer,
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
	`characteristic_id` integer,
	`relevance_score` integer NOT NULL,
	`extracted_by` text NOT NULL,
	`extraction_confidence` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_therapy_research`("id", "goal_id", "feedback_id", "therapeutic_goal_type", "title", "authors", "year", "journal", "doi", "url", "abstract", "key_findings", "therapeutic_techniques", "evidence_level", "characteristic_id", "relevance_score", "extracted_by", "extraction_confidence", "created_at", "updated_at") SELECT "id", "goal_id", "feedback_id", "therapeutic_goal_type", "title", "authors", "year", "journal", "doi", "url", "abstract", "key_findings", "therapeutic_techniques", "evidence_level", "characteristic_id", "relevance_score", "extracted_by", "extraction_confidence", "created_at", "updated_at" FROM `therapy_research`;--> statement-breakpoint
DROP TABLE `therapy_research`;--> statement-breakpoint
ALTER TABLE `__new_therapy_research` RENAME TO `therapy_research`;