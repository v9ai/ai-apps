ALTER TABLE `family_members` ADD COLUMN `email` text;
ALTER TABLE `family_members` ADD COLUMN `phone` text;
ALTER TABLE `family_members` ADD COLUMN `location` text;
ALTER TABLE `family_members` ADD COLUMN `occupation` text;

CREATE TABLE IF NOT EXISTS `family_member_shares` (
  `family_member_id` integer NOT NULL REFERENCES `family_members`(`id`) ON DELETE CASCADE,
  `email` text NOT NULL,
  `role` text NOT NULL DEFAULT 'VIEWER',
  `created_at` text NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  `created_by` text NOT NULL,
  PRIMARY KEY (`family_member_id`, `email`)
);

CREATE INDEX IF NOT EXISTS `idx_family_member_shares_email` ON `family_member_shares` (`email`);
