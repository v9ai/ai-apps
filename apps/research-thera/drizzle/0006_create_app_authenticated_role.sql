-- =============================================================================
-- 0006_create_app_authenticated_role.sql
--
-- Purpose
-- -------
-- Provision the `app_authenticated` Postgres role that the application driver
-- (`src/db/neon.ts`) issues `SET LOCAL ROLE app_authenticated` to at the head
-- of every per-request transaction. Without this role, RLS is a no-op:
-- `neondb_owner` (the default Neon role the app connects as) has
-- `rolbypassrls = true`, which Postgres documents as silently skipping every
-- policy even when `FORCE ROW LEVEL SECURITY` is set on the table.
--
-- Neon refuses `ALTER ROLE neondb_owner NOBYPASSRLS` ("permission denied" —
-- the role is Neon-managed), so the mitigation is to introduce a second role
-- that the driver transiently switches into per transaction. Connections keep
-- authenticating as `neondb_owner` (only role Neon lets us hand out a password
-- for here), but every user-scoped transaction runs statements under
-- `app_authenticated`, which is NOBYPASSRLS.
--
-- Idempotency
-- -----------
-- Postgres has no native `CREATE ROLE IF NOT EXISTS`. We wrap the CREATE in a
-- DO-block that checks pg_roles first so the migration is safe to replay.
--
-- The password below is a placeholder. Nothing in the application flow logs
-- in as `app_authenticated` directly — the driver reaches the role via
-- `SET LOCAL ROLE`, which does not require a password once the current
-- session role is a member of `app_authenticated` (guaranteed by the final
-- `GRANT app_authenticated TO neondb_owner`). Rotate the password out-of-band
-- if you ever want to connect directly as `app_authenticated`.
--
-- Roll-forward order
-- ------------------
--   0004 (UUID consolidation) must be applied first — the RLS policies
--   compare against UUID-form user_id values.
--   0005 (enable RLS + policies) must be applied before 0006 is useful, but
--   0006 itself has no dependency on 0005 and is safe to run in either order.
--   The app driver starts emitting `SET LOCAL ROLE app_authenticated` as soon
--   as it ships, so: apply 0006 BEFORE deploying the driver change to prod.
--
-- Roll-back
-- ---------
-- Copy the commented DOWN section at the bottom of this file into psql.
-- Note: dropping the role fails if any object still depends on it — revoke
-- first.
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Create the role if it does not already exist. Attributes:
--    * NOBYPASSRLS — the entire point. Enables RLS policy enforcement.
--    * NOSUPERUSER — defense in depth.
--    * LOGIN       — allowed so that an operator CAN point a debug
--                    connection string at this role if desired. Not required
--                    for the `SET LOCAL ROLE` path the app uses.
--    * PASSWORD    — placeholder; the app does not log in as this role.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_authenticated') THEN
    CREATE ROLE app_authenticated
      NOBYPASSRLS
      NOSUPERUSER
      LOGIN
      PASSWORD 'disabled_placeholder_change_me';
  END IF;
END
$$;

-- ---------------------------------------------------------------------------
-- 2. Schema usage. The app runs everything against public; `neon_auth` is
--    the Better Auth schema we occasionally read for user-profile joins.
-- ---------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public     TO app_authenticated;
GRANT USAGE ON SCHEMA neon_auth  TO app_authenticated;

-- ---------------------------------------------------------------------------
-- 3. DML on every existing table in public. We intentionally grant the full
--    set (SELECT, INSERT, UPDATE, DELETE) — RLS narrows the visible row set
--    per policy, so table-level grants can stay broad without creating a
--    tenant-leak surface.
--    `neon_auth` stays read-only (auth writes happen through the Better Auth
--    server, not through resolvers).
-- ---------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public    TO app_authenticated;
GRANT SELECT                             ON ALL TABLES IN SCHEMA neon_auth TO app_authenticated;

-- ---------------------------------------------------------------------------
-- 4. Sequence usage. Required for any INSERT that relies on a serial/bigserial
--    default (our integer PKs on notes, generation_jobs, etc.).
-- ---------------------------------------------------------------------------
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_authenticated;

-- ---------------------------------------------------------------------------
-- 5. Default privileges for objects created AFTER this migration. Without
--    these, every future CREATE TABLE issued by `neondb_owner` would come up
--    inaccessible to `app_authenticated`.
-- ---------------------------------------------------------------------------
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES    TO app_authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT                  ON SEQUENCES TO app_authenticated;

-- ---------------------------------------------------------------------------
-- 6. Membership. Granting `app_authenticated` TO `neondb_owner` lets any
--    session that authenticated as `neondb_owner` issue
--    `SET LOCAL ROLE app_authenticated` without a password. This is the
--    mechanism the driver wrapper in `src/db/neon.ts` relies on.
-- ---------------------------------------------------------------------------
GRANT app_authenticated TO neondb_owner;

COMMIT;

-- =============================================================================
-- DOWN (copy into psql to roll back):
--
--   BEGIN;
--   REVOKE app_authenticated FROM neondb_owner;
--   ALTER DEFAULT PRIVILEGES IN SCHEMA public
--     REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLES FROM app_authenticated;
--   ALTER DEFAULT PRIVILEGES IN SCHEMA public
--     REVOKE USAGE, SELECT ON SEQUENCES FROM app_authenticated;
--   REVOKE ALL ON ALL SEQUENCES IN SCHEMA public    FROM app_authenticated;
--   REVOKE ALL ON ALL TABLES    IN SCHEMA neon_auth FROM app_authenticated;
--   REVOKE ALL ON ALL TABLES    IN SCHEMA public    FROM app_authenticated;
--   REVOKE USAGE ON SCHEMA neon_auth FROM app_authenticated;
--   REVOKE USAGE ON SCHEMA public    FROM app_authenticated;
--   DROP ROLE IF EXISTS app_authenticated;
--   COMMIT;
-- =============================================================================
