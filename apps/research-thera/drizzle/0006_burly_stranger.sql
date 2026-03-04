CREATE TABLE `note_shares` (
	`note_id` integer NOT NULL,
	`email` text NOT NULL,
	`role` text DEFAULT 'READER' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`created_by` text NOT NULL,
	FOREIGN KEY (`note_id`) REFERENCES `notes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `notes` ADD `visibility` text DEFAULT 'PRIVATE' NOT NULL;