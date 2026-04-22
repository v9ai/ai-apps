-- =============================================================================
-- 0004_consolidate_user_id_to_uuid.sql
--
-- Purpose:
--   Convert legacy email-form values in user_id / created_by / related_user_id
--   columns to the authoritative UUID taken from neon_auth."user".id.
--
-- Scope:
--   - Mixed legacy data: some rows hold `user_id = '<email>'`, others hold the
--     Better Auth user UUID as text. After this migration, every user_id on
--     every user-scoped public.* table stores the UUID string.
--
-- Safety:
--   - Idempotent: UPDATE joins only match rows whose current user_id equals a
--     known email in neon_auth.user. Rows already in UUID form are left alone.
--   - Orphans (user_id = '<email>' with no matching neon_auth.user row) are
--     NOT deleted; they are reported by the verification block at the end.
--   - Runs only on the rls-consolidation-<date> Neon branch. DO NOT apply to
--     the production (`main`) branch until a human approves promotion.
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- Safety assertion: fail if the neon_auth.user table is missing.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'neon_auth' AND table_name = 'user'
  ) THEN
    RAISE EXCEPTION 'neon_auth."user" table not found — cannot consolidate';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Snapshot email-form user_id counts BEFORE the backfill.
-- ---------------------------------------------------------------------------
CREATE TEMP TABLE _rls_before_counts (
  table_name text PRIMARY KEY,
  email_rows bigint NOT NULL,
  total_rows bigint NOT NULL
);

INSERT INTO _rls_before_counts (table_name, email_rows, total_rows)
SELECT 'affirmations',                (SELECT COUNT(*) FROM affirmations                WHERE user_id LIKE '%@%'), (SELECT COUNT(*) FROM affirmations) UNION ALL
SELECT 'audio_assets',                (SELECT COUNT(*) FROM audio_assets                WHERE user_id LIKE '%@%'), (SELECT COUNT(*) FROM audio_assets) UNION ALL
SELECT 'behavior_observations',       (SELECT COUNT(*) FROM behavior_observations       WHERE user_id LIKE '%@%'), (SELECT COUNT(*) FROM behavior_observations) UNION ALL
SELECT 'contact_feedbacks',           (SELECT COUNT(*) FROM contact_feedbacks           WHERE user_id LIKE '%@%'), (SELECT COUNT(*) FROM contact_feedbacks) UNION ALL
SELECT 'contacts',                    (SELECT COUNT(*) FROM contacts                    WHERE user_id LIKE '%@%'), (SELECT COUNT(*) FROM contacts) UNION ALL
SELECT 'conversations',               (SELECT COUNT(*) FROM conversations               WHERE user_id LIKE '%@%'), (SELECT COUNT(*) FROM conversations) UNION ALL
SELECT 'deep_issue_analyses',         (SELECT COUNT(*) FROM deep_issue_analyses         WHERE user_id LIKE '%@%'), (SELECT COUNT(*) FROM deep_issue_analyses) UNION ALL
SELECT 'discussion_guides',           (SELECT COUNT(*) FROM discussion_guides           WHERE user_id LIKE '%@%'), (SELECT COUNT(*) FROM discussion_guides) UNION ALL
SELECT 'family_member_characteristics',(SELECT COUNT(*) FROM family_member_characteristics WHERE user_id LIKE '%@%'), (SELECT COUNT(*) FROM family_member_characteristics) UNION ALL
SELECT 'family_members',              (SELECT COUNT(*) FROM family_members              WHERE user_id LIKE '%@%'), (SELECT COUNT(*) FROM family_members) UNION ALL
SELECT 'generation_jobs',             (SELECT COUNT(*) FROM generation_jobs             WHERE user_id LIKE '%@%'), (SELECT COUNT(*) FROM generation_jobs) UNION ALL
SELECT 'goals',                       (SELECT COUNT(*) FROM goals                       WHERE user_id LIKE '%@%'), (SELECT COUNT(*) FROM goals) UNION ALL
SELECT 'habit_logs',                  (SELECT COUNT(*) FROM habit_logs                  WHERE user_id LIKE '%@%'), (SELECT COUNT(*) FROM habit_logs) UNION ALL
SELECT 'habits',                      (SELECT COUNT(*) FROM habits                      WHERE user_id LIKE '%@%'), (SELECT COUNT(*) FROM habits) UNION ALL
SELECT 'issue_contacts',              (SELECT COUNT(*) FROM issue_contacts              WHERE user_id LIKE '%@%'), (SELECT COUNT(*) FROM issue_contacts) UNION ALL
SELECT 'issue_links',                 (SELECT COUNT(*) FROM issue_links                 WHERE user_id LIKE '%@%'), (SELECT COUNT(*) FROM issue_links) UNION ALL
SELECT 'issue_screenshots',           (SELECT COUNT(*) FROM issue_screenshots           WHERE user_id LIKE '%@%'), (SELECT COUNT(*) FROM issue_screenshots) UNION ALL
SELECT 'issues',                      (SELECT COUNT(*) FROM issues                      WHERE user_id LIKE '%@%'), (SELECT COUNT(*) FROM issues) UNION ALL
SELECT 'journal_analyses',            (SELECT COUNT(*) FROM journal_analyses            WHERE user_id LIKE '%@%'), (SELECT COUNT(*) FROM journal_analyses) UNION ALL
SELECT 'journal_entries',             (SELECT COUNT(*) FROM journal_entries             WHERE user_id LIKE '%@%'), (SELECT COUNT(*) FROM journal_entries) UNION ALL
SELECT 'notes',                       (SELECT COUNT(*) FROM notes                       WHERE user_id LIKE '%@%'), (SELECT COUNT(*) FROM notes) UNION ALL
SELECT 'relationships',               (SELECT COUNT(*) FROM relationships               WHERE user_id LIKE '%@%'), (SELECT COUNT(*) FROM relationships) UNION ALL
SELECT 'stories',                     (SELECT COUNT(*) FROM stories                     WHERE user_id LIKE '%@%'), (SELECT COUNT(*) FROM stories) UNION ALL
SELECT 'tag_language_rules',          (SELECT COUNT(*) FROM tag_language_rules          WHERE user_id LIKE '%@%'), (SELECT COUNT(*) FROM tag_language_rules) UNION ALL
SELECT 'teacher_feedbacks',           (SELECT COUNT(*) FROM teacher_feedbacks           WHERE user_id LIKE '%@%'), (SELECT COUNT(*) FROM teacher_feedbacks) UNION ALL
SELECT 'user_settings',               (SELECT COUNT(*) FROM user_settings               WHERE user_id LIKE '%@%'), (SELECT COUNT(*) FROM user_settings);

-- ---------------------------------------------------------------------------
-- Backfill: replace email-form user_id with the authoritative UUID from
-- neon_auth."user". Only rows that currently store an email are updated.
-- ---------------------------------------------------------------------------
UPDATE affirmations                 t SET user_id = u.id::text FROM neon_auth."user" u WHERE t.user_id = u.email;
UPDATE audio_assets                 t SET user_id = u.id::text FROM neon_auth."user" u WHERE t.user_id = u.email;
UPDATE behavior_observations        t SET user_id = u.id::text FROM neon_auth."user" u WHERE t.user_id = u.email;
UPDATE contact_feedbacks            t SET user_id = u.id::text FROM neon_auth."user" u WHERE t.user_id = u.email;
UPDATE contacts                     t SET user_id = u.id::text FROM neon_auth."user" u WHERE t.user_id = u.email;
UPDATE conversations                t SET user_id = u.id::text FROM neon_auth."user" u WHERE t.user_id = u.email;
UPDATE deep_issue_analyses          t SET user_id = u.id::text FROM neon_auth."user" u WHERE t.user_id = u.email;
UPDATE discussion_guides            t SET user_id = u.id::text FROM neon_auth."user" u WHERE t.user_id = u.email;
UPDATE family_member_characteristics t SET user_id = u.id::text FROM neon_auth."user" u WHERE t.user_id = u.email;
UPDATE family_members               t SET user_id = u.id::text FROM neon_auth."user" u WHERE t.user_id = u.email;
UPDATE generation_jobs              t SET user_id = u.id::text FROM neon_auth."user" u WHERE t.user_id = u.email;
UPDATE goals                        t SET user_id = u.id::text FROM neon_auth."user" u WHERE t.user_id = u.email;
UPDATE habit_logs                   t SET user_id = u.id::text FROM neon_auth."user" u WHERE t.user_id = u.email;
UPDATE habits                       t SET user_id = u.id::text FROM neon_auth."user" u WHERE t.user_id = u.email;
UPDATE issue_contacts               t SET user_id = u.id::text FROM neon_auth."user" u WHERE t.user_id = u.email;
UPDATE issue_links                  t SET user_id = u.id::text FROM neon_auth."user" u WHERE t.user_id = u.email;
UPDATE issue_screenshots            t SET user_id = u.id::text FROM neon_auth."user" u WHERE t.user_id = u.email;
UPDATE issues                       t SET user_id = u.id::text FROM neon_auth."user" u WHERE t.user_id = u.email;
UPDATE journal_analyses             t SET user_id = u.id::text FROM neon_auth."user" u WHERE t.user_id = u.email;
UPDATE journal_entries              t SET user_id = u.id::text FROM neon_auth."user" u WHERE t.user_id = u.email;
UPDATE notes                        t SET user_id = u.id::text FROM neon_auth."user" u WHERE t.user_id = u.email;
UPDATE relationships                t SET user_id = u.id::text FROM neon_auth."user" u WHERE t.user_id = u.email;
UPDATE stories                      t SET user_id = u.id::text FROM neon_auth."user" u WHERE t.user_id = u.email;
UPDATE tag_language_rules           t SET user_id = u.id::text FROM neon_auth."user" u WHERE t.user_id = u.email;
UPDATE teacher_feedbacks            t SET user_id = u.id::text FROM neon_auth."user" u WHERE t.user_id = u.email;
UPDATE user_settings                t SET user_id = u.id::text FROM neon_auth."user" u WHERE t.user_id = u.email;

-- ---------------------------------------------------------------------------
-- Sibling columns: `created_by` on notes + share tables. These legacy columns
-- currently store the same user identifier (email) that user_id stores.
-- ---------------------------------------------------------------------------
UPDATE notes                 t SET created_by = u.id::text FROM neon_auth."user" u WHERE t.created_by = u.email;
UPDATE note_shares           t SET created_by = u.id::text FROM neon_auth."user" u WHERE t.created_by = u.email;
UPDATE family_member_shares  t SET created_by = u.id::text FROM neon_auth."user" u WHERE t.created_by = u.email;

-- Note: share tables' `email` column intentionally stays in email form —
--       that is the recipient address for the share, not an owner identifier.

-- ---------------------------------------------------------------------------
-- Snapshot counts AFTER the backfill. Any remaining email-form rows are
-- orphans (email values that don't exist in neon_auth."user").
-- ---------------------------------------------------------------------------
CREATE TEMP TABLE _rls_after_counts (
  table_name text PRIMARY KEY,
  email_rows bigint NOT NULL,
  total_rows bigint NOT NULL
);

INSERT INTO _rls_after_counts (table_name, email_rows, total_rows)
SELECT 'affirmations',                (SELECT COUNT(*) FROM affirmations                WHERE user_id LIKE '%@%'), (SELECT COUNT(*) FROM affirmations) UNION ALL
SELECT 'audio_assets',                (SELECT COUNT(*) FROM audio_assets                WHERE user_id LIKE '%@%'), (SELECT COUNT(*) FROM audio_assets) UNION ALL
SELECT 'behavior_observations',       (SELECT COUNT(*) FROM behavior_observations       WHERE user_id LIKE '%@%'), (SELECT COUNT(*) FROM behavior_observations) UNION ALL
SELECT 'contact_feedbacks',           (SELECT COUNT(*) FROM contact_feedbacks           WHERE user_id LIKE '%@%'), (SELECT COUNT(*) FROM contact_feedbacks) UNION ALL
SELECT 'contacts',                    (SELECT COUNT(*) FROM contacts                    WHERE user_id LIKE '%@%'), (SELECT COUNT(*) FROM contacts) UNION ALL
SELECT 'conversations',               (SELECT COUNT(*) FROM conversations               WHERE user_id LIKE '%@%'), (SELECT COUNT(*) FROM conversations) UNION ALL
SELECT 'deep_issue_analyses',         (SELECT COUNT(*) FROM deep_issue_analyses         WHERE user_id LIKE '%@%'), (SELECT COUNT(*) FROM deep_issue_analyses) UNION ALL
SELECT 'discussion_guides',           (SELECT COUNT(*) FROM discussion_guides           WHERE user_id LIKE '%@%'), (SELECT COUNT(*) FROM discussion_guides) UNION ALL
SELECT 'family_member_characteristics',(SELECT COUNT(*) FROM family_member_characteristics WHERE user_id LIKE '%@%'), (SELECT COUNT(*) FROM family_member_characteristics) UNION ALL
SELECT 'family_members',              (SELECT COUNT(*) FROM family_members              WHERE user_id LIKE '%@%'), (SELECT COUNT(*) FROM family_members) UNION ALL
SELECT 'generation_jobs',             (SELECT COUNT(*) FROM generation_jobs             WHERE user_id LIKE '%@%'), (SELECT COUNT(*) FROM generation_jobs) UNION ALL
SELECT 'goals',                       (SELECT COUNT(*) FROM goals                       WHERE user_id LIKE '%@%'), (SELECT COUNT(*) FROM goals) UNION ALL
SELECT 'habit_logs',                  (SELECT COUNT(*) FROM habit_logs                  WHERE user_id LIKE '%@%'), (SELECT COUNT(*) FROM habit_logs) UNION ALL
SELECT 'habits',                      (SELECT COUNT(*) FROM habits                      WHERE user_id LIKE '%@%'), (SELECT COUNT(*) FROM habits) UNION ALL
SELECT 'issue_contacts',              (SELECT COUNT(*) FROM issue_contacts              WHERE user_id LIKE '%@%'), (SELECT COUNT(*) FROM issue_contacts) UNION ALL
SELECT 'issue_links',                 (SELECT COUNT(*) FROM issue_links                 WHERE user_id LIKE '%@%'), (SELECT COUNT(*) FROM issue_links) UNION ALL
SELECT 'issue_screenshots',           (SELECT COUNT(*) FROM issue_screenshots           WHERE user_id LIKE '%@%'), (SELECT COUNT(*) FROM issue_screenshots) UNION ALL
SELECT 'issues',                      (SELECT COUNT(*) FROM issues                      WHERE user_id LIKE '%@%'), (SELECT COUNT(*) FROM issues) UNION ALL
SELECT 'journal_analyses',            (SELECT COUNT(*) FROM journal_analyses            WHERE user_id LIKE '%@%'), (SELECT COUNT(*) FROM journal_analyses) UNION ALL
SELECT 'journal_entries',             (SELECT COUNT(*) FROM journal_entries             WHERE user_id LIKE '%@%'), (SELECT COUNT(*) FROM journal_entries) UNION ALL
SELECT 'notes',                       (SELECT COUNT(*) FROM notes                       WHERE user_id LIKE '%@%'), (SELECT COUNT(*) FROM notes) UNION ALL
SELECT 'relationships',               (SELECT COUNT(*) FROM relationships               WHERE user_id LIKE '%@%'), (SELECT COUNT(*) FROM relationships) UNION ALL
SELECT 'stories',                     (SELECT COUNT(*) FROM stories                     WHERE user_id LIKE '%@%'), (SELECT COUNT(*) FROM stories) UNION ALL
SELECT 'tag_language_rules',          (SELECT COUNT(*) FROM tag_language_rules          WHERE user_id LIKE '%@%'), (SELECT COUNT(*) FROM tag_language_rules) UNION ALL
SELECT 'teacher_feedbacks',           (SELECT COUNT(*) FROM teacher_feedbacks           WHERE user_id LIKE '%@%'), (SELECT COUNT(*) FROM teacher_feedbacks) UNION ALL
SELECT 'user_settings',               (SELECT COUNT(*) FROM user_settings               WHERE user_id LIKE '%@%'), (SELECT COUNT(*) FROM user_settings);

-- ---------------------------------------------------------------------------
-- Report: before/after + orphans. Run via `psql -f …` to see output.
-- ---------------------------------------------------------------------------
SELECT
  b.table_name,
  b.total_rows            AS total_rows_before,
  b.email_rows            AS email_rows_before,
  a.email_rows            AS email_rows_after_orphaned,
  (b.email_rows - a.email_rows) AS rows_converted
FROM _rls_before_counts b
JOIN _rls_after_counts  a USING (table_name)
ORDER BY b.table_name;

-- Orphans sample: rows whose user_id is still email-formed AFTER backfill
-- (i.e. the email doesn't exist in neon_auth.user). DO NOT delete — flag for
-- human review.
SELECT 'notes'                AS table_name, id::text AS row_id, user_id FROM notes                WHERE user_id LIKE '%@%' LIMIT 50;
SELECT 'goals'                AS table_name, id::text AS row_id, user_id FROM goals                WHERE user_id LIKE '%@%' LIMIT 50;
SELECT 'family_members'       AS table_name, id::text AS row_id, user_id FROM family_members       WHERE user_id LIKE '%@%' LIMIT 50;

COMMIT;
