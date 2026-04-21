-- ─────────────────────────────────────────────────────────────────────────────
-- Non-BYPASSRLS role so RLS policies actually filter
--
-- Neon's `neondb_owner` has rolbypassrls=true, which short-circuits every
-- policy regardless of FORCE ROW LEVEL SECURITY. To make the tenant_isolation
-- policy effective for app traffic, we create a dedicated `app_tenant` role
-- with NOBYPASSRLS and switch to it inside withTenantDb via `SET LOCAL ROLE`.
--
-- Admin scripts / migrations continue running as neondb_owner and remain
-- unaffected (they bypass RLS, matching the existing "unset tenant = all rows"
-- fallback in the policy).
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_tenant') THEN
    CREATE ROLE app_tenant NOLOGIN NOBYPASSRLS;
  ELSE
    ALTER ROLE app_tenant NOBYPASSRLS;
  END IF;
END
$$;

-- Allow neondb_owner (the connection role) to SET ROLE to app_tenant.
GRANT app_tenant TO neondb_owner;

-- Schema + table privileges the app needs.
GRANT USAGE ON SCHEMA public TO app_tenant;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_tenant;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_tenant;

-- Future tables / sequences created by neondb_owner also get granted.
ALTER DEFAULT PRIVILEGES FOR ROLE neondb_owner IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_tenant;
ALTER DEFAULT PRIVILEGES FOR ROLE neondb_owner IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO app_tenant;
