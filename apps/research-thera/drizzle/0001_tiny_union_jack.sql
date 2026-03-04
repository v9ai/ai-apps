CREATE TABLE `claim_cards` (
	`id` text PRIMARY KEY NOT NULL,
	`note_id` integer,
	`claim` text NOT NULL,
	`scope` text,
	`verdict` text NOT NULL,
	`confidence` integer NOT NULL,
	`evidence` text NOT NULL,
	`queries` text NOT NULL,
	`provenance` text NOT NULL,
	`notes` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `notes_claims` (
	`note_id` integer NOT NULL,
	`claim_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `notes_research` (
	`note_id` integer NOT NULL,
	`research_id` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
