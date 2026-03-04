CREATE TABLE `family_member_characteristics` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `family_member_id` integer NOT NULL,
  `user_id` text NOT NULL,
  `category` text NOT NULL,
  `title` text NOT NULL,
  `description` text,
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX `idx_fmc_family_member` ON `family_member_characteristics` (`family_member_id`);
CREATE INDEX `idx_fmc_user` ON `family_member_characteristics` (`user_id`);
CREATE INDEX `idx_fmc_category` ON `family_member_characteristics` (`category`);
