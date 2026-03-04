ALTER TABLE `goals` ADD `slug` text;--> statement-breakpoint
CREATE UNIQUE INDEX `goals_slug_unique` ON `goals` (`slug`);--> statement-breakpoint
ALTER TABLE `notes` ADD `title` text;