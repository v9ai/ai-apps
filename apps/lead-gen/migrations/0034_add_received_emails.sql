CREATE TABLE `received_emails` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`resend_id` text NOT NULL,
	`from_email` text,
	`to_emails` text DEFAULT '[]' NOT NULL,
	`cc_emails` text DEFAULT '[]',
	`reply_to_emails` text DEFAULT '[]',
	`subject` text,
	`message_id` text,
	`html_content` text,
	`text_content` text,
	`attachments` text DEFAULT '[]',
	`received_at` text NOT NULL,
	`archived_at` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `received_emails_resend_id_unique` ON `received_emails` (`resend_id`);
--> statement-breakpoint
CREATE INDEX `idx_received_emails_from` ON `received_emails` (`from_email`);
--> statement-breakpoint
CREATE INDEX `idx_received_emails_message_id` ON `received_emails` (`message_id`);
--> statement-breakpoint
CREATE INDEX `idx_received_emails_received_at` ON `received_emails` (`received_at`);
--> statement-breakpoint
CREATE INDEX `idx_received_emails_resend_id` ON `received_emails` (`resend_id`);
