PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_issues` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`feedback_id` integer,
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
INSERT INTO `__new_issues`("id", "feedback_id", "family_member_id", "user_id", "title", "description", "category", "severity", "recommendations", "created_at", "updated_at") SELECT "id", "feedback_id", "family_member_id", "user_id", "title", "description", "category", "severity", "recommendations", "created_at", "updated_at" FROM `issues`;--> statement-breakpoint
DROP TABLE `issues`;--> statement-breakpoint
ALTER TABLE `__new_issues` RENAME TO `issues`;--> statement-breakpoint
PRAGMA foreign_keys=ON;
--> statement-breakpoint
INSERT INTO `issues` (
  `feedback_id`,
  `family_member_id`,
  `user_id`,
  `title`,
  `description`,
  `category`,
  `severity`,
  `recommendations`,
  `created_at`,
  `updated_at`
)
SELECT
  NULL,
  family_member_id,
  user_id,
  title,
  COALESCE(description, '') AS description,
  CASE
    WHEN impairment_domains LIKE '%ACADEMIC%' THEN 'academic'
    WHEN impairment_domains LIKE '%PEER%' OR impairment_domains LIKE '%FAMILY%' THEN 'social'
    WHEN impairment_domains LIKE '%SELF_CARE%' OR impairment_domains LIKE '%SAFETY%' THEN 'health'
    ELSE 'other'
  END AS category,
  CASE
    WHEN severity = 'MILD' THEN 'low'
    WHEN severity = 'MODERATE' THEN 'medium'
    WHEN severity IN ('SEVERE', 'PROFOUND') THEN 'high'
    ELSE 'low'
  END AS severity,
  NULL AS recommendations,
  created_at,
  updated_at
FROM `family_member_characteristics`;