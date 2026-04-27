-- ─────────────────────────────────────────────────────────────────────────────
-- Multi-tenant Row-Level Security
--
-- Adds `tenant_id` to all tenant-scoped tables and enables Postgres RLS so
-- every SELECT/INSERT/UPDATE/DELETE is filtered by the session GUC `app.tenant`.
--
-- Per-request flow (see src/db/with-tenant.ts):
--   BEGIN;
--   SET LOCAL app.tenant = 'vadim';
--   -- resolvers query as usual; RLS filters rows automatically
--   COMMIT;
--
-- Admin/script fallback: when app.tenant is unset (NULL or ''), the policy
-- allows all rows so existing one-off scripts and cron jobs keep working.
-- Tighten this later by removing the "unset" branch.
--
-- `FORCE ROW LEVEL SECURITY` is used so the table owner role is also filtered
-- (Postgres otherwise exempts owners from RLS).
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Add tenant_id column to all tenant-scoped tables ──────────────────────
-- Default expression evaluates to 'vadim' for existing rows (no app.tenant set)
-- and to the current session tenant for new inserts.

ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "tenant_id" TEXT NOT NULL
  DEFAULT COALESCE(NULLIF(current_setting('app.tenant', true), ''), 'vadim');
ALTER TABLE "company_facts" ADD COLUMN IF NOT EXISTS "tenant_id" TEXT NOT NULL
  DEFAULT COALESCE(NULLIF(current_setting('app.tenant', true), ''), 'vadim');
ALTER TABLE "company_snapshots" ADD COLUMN IF NOT EXISTS "tenant_id" TEXT NOT NULL
  DEFAULT COALESCE(NULLIF(current_setting('app.tenant', true), ''), 'vadim');
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "tenant_id" TEXT NOT NULL
  DEFAULT COALESCE(NULLIF(current_setting('app.tenant', true), ''), 'vadim');
ALTER TABLE "reminders" ADD COLUMN IF NOT EXISTS "tenant_id" TEXT NOT NULL
  DEFAULT COALESCE(NULLIF(current_setting('app.tenant', true), ''), 'vadim');
ALTER TABLE "contact_emails" ADD COLUMN IF NOT EXISTS "tenant_id" TEXT NOT NULL
  DEFAULT COALESCE(NULLIF(current_setting('app.tenant', true), ''), 'vadim');
ALTER TABLE "email_campaigns" ADD COLUMN IF NOT EXISTS "tenant_id" TEXT NOT NULL
  DEFAULT COALESCE(NULLIF(current_setting('app.tenant', true), ''), 'vadim');
ALTER TABLE "email_templates" ADD COLUMN IF NOT EXISTS "tenant_id" TEXT NOT NULL
  DEFAULT COALESCE(NULLIF(current_setting('app.tenant', true), ''), 'vadim');
ALTER TABLE "received_emails" ADD COLUMN IF NOT EXISTS "tenant_id" TEXT NOT NULL
  DEFAULT COALESCE(NULLIF(current_setting('app.tenant', true), ''), 'vadim');
ALTER TABLE "linkedin_posts" ADD COLUMN IF NOT EXISTS "tenant_id" TEXT NOT NULL
  DEFAULT COALESCE(NULLIF(current_setting('app.tenant', true), ''), 'vadim');
ALTER TABLE "opportunities" ADD COLUMN IF NOT EXISTS "tenant_id" TEXT NOT NULL
  DEFAULT COALESCE(NULLIF(current_setting('app.tenant', true), ''), 'vadim');
ALTER TABLE "intent_signals" ADD COLUMN IF NOT EXISTS "tenant_id" TEXT NOT NULL
  DEFAULT COALESCE(NULLIF(current_setting('app.tenant', true), ''), 'vadim');
ALTER TABLE "reply_drafts" ADD COLUMN IF NOT EXISTS "tenant_id" TEXT NOT NULL
  DEFAULT COALESCE(NULLIF(current_setting('app.tenant', true), ''), 'vadim');
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "tenant_id" TEXT NOT NULL
  DEFAULT COALESCE(NULLIF(current_setting('app.tenant', true), ''), 'vadim');
ALTER TABLE "competitor_analyses" ADD COLUMN IF NOT EXISTS "tenant_id" TEXT NOT NULL
  DEFAULT COALESCE(NULLIF(current_setting('app.tenant', true), ''), 'vadim');
ALTER TABLE "competitors" ADD COLUMN IF NOT EXISTS "tenant_id" TEXT NOT NULL
  DEFAULT COALESCE(NULLIF(current_setting('app.tenant', true), ''), 'vadim');
ALTER TABLE "competitor_pricing_tiers" ADD COLUMN IF NOT EXISTS "tenant_id" TEXT NOT NULL
  DEFAULT COALESCE(NULLIF(current_setting('app.tenant', true), ''), 'vadim');
ALTER TABLE "competitor_features" ADD COLUMN IF NOT EXISTS "tenant_id" TEXT NOT NULL
  DEFAULT COALESCE(NULLIF(current_setting('app.tenant', true), ''), 'vadim');
ALTER TABLE "competitor_integrations" ADD COLUMN IF NOT EXISTS "tenant_id" TEXT NOT NULL
  DEFAULT COALESCE(NULLIF(current_setting('app.tenant', true), ''), 'vadim');

-- ── 2. Indexes on tenant_id (hot filter column) ──────────────────────────────
CREATE INDEX IF NOT EXISTS idx_companies_tenant_id                ON companies (tenant_id);
CREATE INDEX IF NOT EXISTS idx_company_facts_tenant_id            ON company_facts (tenant_id);
CREATE INDEX IF NOT EXISTS idx_company_snapshots_tenant_id        ON company_snapshots (tenant_id);
CREATE INDEX IF NOT EXISTS idx_contacts_tenant_id                 ON contacts (tenant_id);
CREATE INDEX IF NOT EXISTS idx_reminders_tenant_id                ON reminders (tenant_id);
CREATE INDEX IF NOT EXISTS idx_contact_emails_tenant_id           ON contact_emails (tenant_id);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_tenant_id          ON email_campaigns (tenant_id);
CREATE INDEX IF NOT EXISTS idx_email_templates_tenant_id          ON email_templates (tenant_id);
CREATE INDEX IF NOT EXISTS idx_received_emails_tenant_id          ON received_emails (tenant_id);
CREATE INDEX IF NOT EXISTS idx_linkedin_posts_tenant_id           ON linkedin_posts (tenant_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_tenant_id            ON opportunities (tenant_id);
CREATE INDEX IF NOT EXISTS idx_intent_signals_tenant_id           ON intent_signals (tenant_id);
CREATE INDEX IF NOT EXISTS idx_reply_drafts_tenant_id             ON reply_drafts (tenant_id);
CREATE INDEX IF NOT EXISTS idx_messages_tenant_id                 ON messages (tenant_id);
CREATE INDEX IF NOT EXISTS idx_competitor_analyses_tenant_id      ON competitor_analyses (tenant_id);
CREATE INDEX IF NOT EXISTS idx_competitors_tenant_id              ON competitors (tenant_id);
CREATE INDEX IF NOT EXISTS idx_competitor_pricing_tiers_tenant_id ON competitor_pricing_tiers (tenant_id);
CREATE INDEX IF NOT EXISTS idx_competitor_features_tenant_id      ON competitor_features (tenant_id);
CREATE INDEX IF NOT EXISTS idx_competitor_integrations_tenant_id  ON competitor_integrations (tenant_id);

-- ── 3. Enable RLS + policies ─────────────────────────────────────────────────
-- Policy: allow access when either (a) no tenant is set (admin/script context)
-- or (b) the row's tenant_id matches the current session tenant.

DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'companies','company_facts','company_snapshots',
    'contacts','reminders','contact_emails',
    'email_campaigns','email_templates','received_emails',
    'linkedin_posts','opportunities','intent_signals',
    'reply_drafts','messages',
    'competitor_analyses','competitors',
    'competitor_pricing_tiers','competitor_features','competitor_integrations'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', t);
    EXECUTE format($pol$
      CREATE POLICY tenant_isolation ON %I
        USING (
          current_setting('app.tenant', true) IS NULL
          OR current_setting('app.tenant', true) = ''
          OR tenant_id = current_setting('app.tenant', true)
        )
        WITH CHECK (
          current_setting('app.tenant', true) IS NULL
          OR current_setting('app.tenant', true) = ''
          OR tenant_id = current_setting('app.tenant', true)
        )
    $pol$, t);
  END LOOP;
END
$$;
