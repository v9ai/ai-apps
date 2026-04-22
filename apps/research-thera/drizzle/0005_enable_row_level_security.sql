-- =============================================================================
-- 0005_enable_row_level_security.sql
--
-- Purpose:
--   Enable PostgreSQL Row-Level Security on every user-scoped public.* table
--   and install a single USING+WITH CHECK policy that matches rows whose
--   user_id equals the request-scoped session variable `app.current_user_id`.
--
-- Contract (application side):
--   Before running any user-scoped SQL, the application MUST set
--     SET LOCAL app.current_user_id = '<ctx.userId>';
--   inside the same transaction. For the Neon serverless HTTP driver, use
--   `withUser(userId, (sql) => …)` (see src/db/neon.ts), which wraps the
--   work in `neonSql.transaction([…])` with SET LOCAL as the first statement.
--
-- Share tables (note_shares, family_member_shares):
--   The recipient viewer must be granted read access via their email. The
--   policy therefore also checks `app.current_user_email` — a second session
--   variable the same helper sets. Writes (INSERT/UPDATE/DELETE) remain
--   owner-only via the `created_by = current_setting(app.current_user_id)`
--   WITH CHECK clause.
--
-- Roll-forward order:
--   1. Apply 0004_consolidate_user_id_to_uuid.sql first. All user_id values
--      must be UUID-form before RLS is enabled — otherwise in-flight sessions
--      whose app.current_user_id is the UUID will see zero rows for any
--      legacy email-keyed record.
--   2. Apply this migration.
--   3. Deploy the application code (resolvers + withUser helper) **in the
--      same release**. If you enable RLS without the session variable
--      being set, every query returns zero rows (effectively a hard lockout).
--
-- Roll-back:
--   Run the companion DOWN section at the bottom of this file (commented out
--   for safety; copy into psql manually).
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- Helper function: pull the current user UUID from the session variable.
-- `true` as second arg to current_setting makes it return NULL rather than
-- raising when the variable is unset. We coerce NULL to the empty string so
-- the `=` comparison reliably returns false (not NULL ⇒ row hidden).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION app_current_user_id() RETURNS text
LANGUAGE sql STABLE AS $$
  SELECT COALESCE(current_setting('app.current_user_id', true), '')
$$;

CREATE OR REPLACE FUNCTION app_current_user_email() RETURNS text
LANGUAGE sql STABLE AS $$
  SELECT COALESCE(current_setting('app.current_user_email', true), '')
$$;

-- ---------------------------------------------------------------------------
-- Simple owner-only policy factory. Run once per table.
-- Uses FORCE ROW LEVEL SECURITY so table owners / superusers are also gated
-- (Neon app role is effectively the table owner).
-- ---------------------------------------------------------------------------

-- affirmations
ALTER TABLE affirmations ENABLE ROW LEVEL SECURITY;
ALTER TABLE affirmations FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_isolation ON affirmations;
CREATE POLICY user_isolation ON affirmations
  USING (user_id = app_current_user_id())
  WITH CHECK (user_id = app_current_user_id());

-- audio_assets
ALTER TABLE audio_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE audio_assets FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_isolation ON audio_assets;
CREATE POLICY user_isolation ON audio_assets
  USING (user_id = app_current_user_id())
  WITH CHECK (user_id = app_current_user_id());

-- behavior_observations
ALTER TABLE behavior_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE behavior_observations FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_isolation ON behavior_observations;
CREATE POLICY user_isolation ON behavior_observations
  USING (user_id = app_current_user_id())
  WITH CHECK (user_id = app_current_user_id());

-- contact_feedbacks
ALTER TABLE contact_feedbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_feedbacks FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_isolation ON contact_feedbacks;
CREATE POLICY user_isolation ON contact_feedbacks
  USING (user_id = app_current_user_id())
  WITH CHECK (user_id = app_current_user_id());

-- contacts
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_isolation ON contacts;
CREATE POLICY user_isolation ON contacts
  USING (user_id = app_current_user_id())
  WITH CHECK (user_id = app_current_user_id());

-- conversations
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_isolation ON conversations;
CREATE POLICY user_isolation ON conversations
  USING (user_id = app_current_user_id())
  WITH CHECK (user_id = app_current_user_id());

-- deep_issue_analyses
ALTER TABLE deep_issue_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE deep_issue_analyses FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_isolation ON deep_issue_analyses;
CREATE POLICY user_isolation ON deep_issue_analyses
  USING (user_id = app_current_user_id())
  WITH CHECK (user_id = app_current_user_id());

-- discussion_guides
ALTER TABLE discussion_guides ENABLE ROW LEVEL SECURITY;
ALTER TABLE discussion_guides FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_isolation ON discussion_guides;
CREATE POLICY user_isolation ON discussion_guides
  USING (user_id = app_current_user_id())
  WITH CHECK (user_id = app_current_user_id());

-- family_member_characteristics
ALTER TABLE family_member_characteristics ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_member_characteristics FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_isolation ON family_member_characteristics;
CREATE POLICY user_isolation ON family_member_characteristics
  USING (user_id = app_current_user_id())
  WITH CHECK (user_id = app_current_user_id());

-- family_members — owner OR a viewer granted via family_member_shares.
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_members FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_isolation ON family_members;
CREATE POLICY user_isolation ON family_members
  USING (
    user_id = app_current_user_id()
    OR EXISTS (
      SELECT 1 FROM family_member_shares s
      WHERE s.family_member_id = family_members.id
        AND s.email = app_current_user_email()
    )
  )
  WITH CHECK (user_id = app_current_user_id());

-- generation_jobs
ALTER TABLE generation_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE generation_jobs FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_isolation ON generation_jobs;
CREATE POLICY user_isolation ON generation_jobs
  USING (user_id = app_current_user_id())
  WITH CHECK (user_id = app_current_user_id());

-- goals
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_isolation ON goals;
CREATE POLICY user_isolation ON goals
  USING (user_id = app_current_user_id())
  WITH CHECK (user_id = app_current_user_id());

-- habit_logs
ALTER TABLE habit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_logs FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_isolation ON habit_logs;
CREATE POLICY user_isolation ON habit_logs
  USING (user_id = app_current_user_id())
  WITH CHECK (user_id = app_current_user_id());

-- habits
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE habits FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_isolation ON habits;
CREATE POLICY user_isolation ON habits
  USING (user_id = app_current_user_id())
  WITH CHECK (user_id = app_current_user_id());

-- issue_contacts
ALTER TABLE issue_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE issue_contacts FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_isolation ON issue_contacts;
CREATE POLICY user_isolation ON issue_contacts
  USING (user_id = app_current_user_id())
  WITH CHECK (user_id = app_current_user_id());

-- issue_links
ALTER TABLE issue_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE issue_links FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_isolation ON issue_links;
CREATE POLICY user_isolation ON issue_links
  USING (user_id = app_current_user_id())
  WITH CHECK (user_id = app_current_user_id());

-- issue_screenshots
ALTER TABLE issue_screenshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE issue_screenshots FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_isolation ON issue_screenshots;
CREATE POLICY user_isolation ON issue_screenshots
  USING (user_id = app_current_user_id())
  WITH CHECK (user_id = app_current_user_id());

-- issues
ALTER TABLE issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE issues FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_isolation ON issues;
CREATE POLICY user_isolation ON issues
  USING (user_id = app_current_user_id())
  WITH CHECK (user_id = app_current_user_id());

-- journal_analyses
ALTER TABLE journal_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_analyses FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_isolation ON journal_analyses;
CREATE POLICY user_isolation ON journal_analyses
  USING (user_id = app_current_user_id())
  WITH CHECK (user_id = app_current_user_id());

-- journal_entries
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_isolation ON journal_entries;
CREATE POLICY user_isolation ON journal_entries
  USING (user_id = app_current_user_id())
  WITH CHECK (user_id = app_current_user_id());

-- notes — owner, shared viewer, or public-visibility record.
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_isolation ON notes;
CREATE POLICY user_isolation ON notes
  USING (
    user_id = app_current_user_id()
    OR visibility = 'PUBLIC'
    OR EXISTS (
      SELECT 1 FROM note_shares s
      WHERE s.note_id = notes.id
        AND s.email = app_current_user_email()
    )
  )
  WITH CHECK (user_id = app_current_user_id());

-- relationships
ALTER TABLE relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE relationships FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_isolation ON relationships;
CREATE POLICY user_isolation ON relationships
  USING (user_id = app_current_user_id())
  WITH CHECK (user_id = app_current_user_id());

-- stories — user_id may be NULL on legacy rows; allow owner reads only.
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE stories FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_isolation ON stories;
CREATE POLICY user_isolation ON stories
  USING (user_id = app_current_user_id())
  WITH CHECK (user_id = app_current_user_id());

-- tag_language_rules
ALTER TABLE tag_language_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE tag_language_rules FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_isolation ON tag_language_rules;
CREATE POLICY user_isolation ON tag_language_rules
  USING (user_id = app_current_user_id())
  WITH CHECK (user_id = app_current_user_id());

-- teacher_feedbacks
ALTER TABLE teacher_feedbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_feedbacks FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_isolation ON teacher_feedbacks;
CREATE POLICY user_isolation ON teacher_feedbacks
  USING (user_id = app_current_user_id())
  WITH CHECK (user_id = app_current_user_id());

-- user_settings
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_isolation ON user_settings;
CREATE POLICY user_isolation ON user_settings
  USING (user_id = app_current_user_id())
  WITH CHECK (user_id = app_current_user_id());

-- ---------------------------------------------------------------------------
-- Share tables: the owner is `created_by` (now UUID); viewers are allowed to
-- read the share row that targets their email.
-- ---------------------------------------------------------------------------

ALTER TABLE note_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_shares FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_isolation ON note_shares;
CREATE POLICY user_isolation ON note_shares
  USING (
    created_by = app_current_user_id()
    OR email    = app_current_user_email()
  )
  WITH CHECK (created_by = app_current_user_id());

ALTER TABLE family_member_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_member_shares FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_isolation ON family_member_shares;
CREATE POLICY user_isolation ON family_member_shares
  USING (
    created_by = app_current_user_id()
    OR email    = app_current_user_email()
  )
  WITH CHECK (created_by = app_current_user_id());

-- ---------------------------------------------------------------------------
-- Join / child tables without a user_id column: gated through the parent.
-- These tables are read via joins the resolvers already do, so the parent's
-- policy effectively protects them. We still enable RLS + a permissive policy
-- that chains to the parent so a direct SELECT can't leak rows.
-- ---------------------------------------------------------------------------

-- notes_research: scoped via notes.user_id
ALTER TABLE notes_research ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes_research FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_isolation ON notes_research;
CREATE POLICY user_isolation ON notes_research
  USING (
    EXISTS (
      SELECT 1 FROM notes n
      WHERE n.id = notes_research.note_id
        AND n.user_id = app_current_user_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM notes n
      WHERE n.id = notes_research.note_id
        AND n.user_id = app_current_user_id()
    )
  );

-- notes_claims: scoped via notes.user_id
ALTER TABLE notes_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes_claims FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_isolation ON notes_claims;
CREATE POLICY user_isolation ON notes_claims
  USING (
    EXISTS (
      SELECT 1 FROM notes n
      WHERE n.id = notes_claims.note_id
        AND n.user_id = app_current_user_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM notes n
      WHERE n.id = notes_claims.note_id
        AND n.user_id = app_current_user_id()
    )
  );

-- text_segments: scoped via goals.user_id
ALTER TABLE text_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE text_segments FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_isolation ON text_segments;
CREATE POLICY user_isolation ON text_segments
  USING (
    EXISTS (
      SELECT 1 FROM goals g
      WHERE g.id = text_segments.goal_id
        AND g.user_id = app_current_user_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM goals g
      WHERE g.id = text_segments.goal_id
        AND g.user_id = app_current_user_id()
    )
  );

-- conversation_messages: scoped via conversations.user_id
ALTER TABLE conversation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_messages FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_isolation ON conversation_messages;
CREATE POLICY user_isolation ON conversation_messages
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_messages.conversation_id
        AND c.user_id = app_current_user_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_messages.conversation_id
        AND c.user_id = app_current_user_id()
    )
  );

-- ---------------------------------------------------------------------------
-- Tables intentionally NOT covered by RLS in this migration:
--   * therapy_research         — no user_id; owned per-goal; gate in app layer
--   * therapeutic_questions    — no user_id; owned per-goal; gate in app layer
--   * recommended_books        — no user_id; owned per-goal; gate in app layer
--   * claim_cards              — no user_id; referenced through notes_claims
--
-- Those 4 tables are scoped through joins the resolvers already perform. If
-- we later decide to defense-in-depth them, add a policy that joins to the
-- parent goal/note.
-- ---------------------------------------------------------------------------

COMMIT;

-- =============================================================================
-- DOWN (copy into psql to roll back). Intentionally kept as a comment so the
-- file stays idempotent when replayed.
-- =============================================================================
-- BEGIN;
-- DO $$
-- DECLARE t text;
-- BEGIN
--   FOR t IN SELECT unnest(ARRAY[
--     'affirmations','audio_assets','behavior_observations','contact_feedbacks',
--     'contacts','conversations','deep_issue_analyses','discussion_guides',
--     'family_member_characteristics','family_members','generation_jobs','goals',
--     'habit_logs','habits','issue_contacts','issue_links','issue_screenshots',
--     'issues','journal_analyses','journal_entries','notes','relationships',
--     'stories','tag_language_rules','teacher_feedbacks','user_settings',
--     'note_shares','family_member_shares',
--     'notes_research','notes_claims','text_segments','conversation_messages'
--   ])
--   LOOP
--     EXECUTE format('DROP POLICY IF EXISTS user_isolation ON %I', t);
--     EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY', t);
--   END LOOP;
-- END $$;
-- DROP FUNCTION IF EXISTS app_current_user_id();
-- DROP FUNCTION IF EXISTS app_current_user_email();
-- COMMIT;
