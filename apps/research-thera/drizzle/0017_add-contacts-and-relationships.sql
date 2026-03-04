CREATE TABLE `contacts` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `user_id` text NOT NULL,
  `first_name` text NOT NULL,
  `last_name` text,
  `role` text,
  `age_years` integer,
  `notes` text,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);

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
