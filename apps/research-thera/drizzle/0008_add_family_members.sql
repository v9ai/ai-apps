CREATE TABLE IF NOT EXISTS `family_members` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `user_id` text NOT NULL,
  `first_name` text NOT NULL,
  `name` text,
  `age_years` integer,
  `relationship` text,
  `date_of_birth` text,
  `bio` text,
  `created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
  `updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);

CREATE INDEX IF NOT EXISTS `idx_family_members_user` ON `family_members` (`user_id`);

-- Seed a default family member for existing goals
INSERT OR IGNORE INTO `family_members` (`id`, `user_id`, `first_name`, `name`, `relationship`, `created_at`, `updated_at`)
VALUES (1, 'system', 'Default', 'Default Member', 'self', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
