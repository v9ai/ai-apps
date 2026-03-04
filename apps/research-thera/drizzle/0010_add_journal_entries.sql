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
  `is_private` integer NOT NULL DEFAULT 1,
  `entry_date` text NOT NULL,
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP
);
