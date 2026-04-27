-- ─────────────────────────────────────────────────────────────────────────────
-- Consolidate the legacy `nyx` tenant into `vadim`.
--
-- Background: the LangGraph backend hardcoded tenant_id='nyx' on every insert,
-- while the frontend only ever sets app.tenant='vadim'. Result: backend-produced
-- rows were invisible in the UI (filtered out by RLS). The codebase is now
-- consolidated on a single tenant ('vadim'); this migration brings the data
-- into alignment.
--
-- Two kinds of rewrites:
--   1. tenant_id 'nyx' → 'vadim' across all 19 tenant-scoped tables.
--   2. companies.key prefix 'nyx:' → 'vadim:' (used for upsert dedup by the
--      discovery graphs; without this, the next discovery run would create
--      duplicate company rows because ON CONFLICT(key) wouldn't match).
--
-- Pre-flight: aborts the transaction if any 'vadim:'-prefixed key would collide
-- with the rewrite. Inspect & resolve duplicates manually before retrying.
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- 0. Pre-flight: refuse to proceed if rewriting 'nyx:' → 'vadim:' would
--    violate the UNIQUE(key) constraint on companies.
DO $$
DECLARE
  collisions INT;
BEGIN
  SELECT COUNT(*)
  INTO collisions
  FROM companies a
  JOIN companies b ON b.key = REPLACE(a.key, 'nyx:', 'vadim:')
  WHERE a.key LIKE 'nyx:%';

  IF collisions > 0 THEN
    RAISE EXCEPTION
      'Aborting: % companies.key collisions would occur when rewriting nyx: → vadim:. Resolve duplicates first.',
      collisions;
  END IF;
END
$$;

-- 1. Migrate tenant_id across all tenant-scoped tables.
UPDATE companies                SET tenant_id = 'vadim' WHERE tenant_id = 'nyx';
UPDATE company_facts            SET tenant_id = 'vadim' WHERE tenant_id = 'nyx';
UPDATE company_snapshots        SET tenant_id = 'vadim' WHERE tenant_id = 'nyx';
UPDATE contacts                 SET tenant_id = 'vadim' WHERE tenant_id = 'nyx';
UPDATE reminders                SET tenant_id = 'vadim' WHERE tenant_id = 'nyx';
UPDATE contact_emails           SET tenant_id = 'vadim' WHERE tenant_id = 'nyx';
UPDATE email_campaigns          SET tenant_id = 'vadim' WHERE tenant_id = 'nyx';
UPDATE email_templates          SET tenant_id = 'vadim' WHERE tenant_id = 'nyx';
UPDATE received_emails          SET tenant_id = 'vadim' WHERE tenant_id = 'nyx';
UPDATE linkedin_posts           SET tenant_id = 'vadim' WHERE tenant_id = 'nyx';
UPDATE opportunities            SET tenant_id = 'vadim' WHERE tenant_id = 'nyx';
UPDATE intent_signals           SET tenant_id = 'vadim' WHERE tenant_id = 'nyx';
UPDATE reply_drafts             SET tenant_id = 'vadim' WHERE tenant_id = 'nyx';
UPDATE messages                 SET tenant_id = 'vadim' WHERE tenant_id = 'nyx';
UPDATE competitor_analyses      SET tenant_id = 'vadim' WHERE tenant_id = 'nyx';
UPDATE competitors              SET tenant_id = 'vadim' WHERE tenant_id = 'nyx';
UPDATE competitor_pricing_tiers SET tenant_id = 'vadim' WHERE tenant_id = 'nyx';
UPDATE competitor_features      SET tenant_id = 'vadim' WHERE tenant_id = 'nyx';
UPDATE competitor_integrations  SET tenant_id = 'vadim' WHERE tenant_id = 'nyx';

-- 2. Rewrite the `nyx:` key prefix on companies so future upsert dedup works.
UPDATE companies
SET key = 'vadim:' || substring(key from length('nyx:') + 1)
WHERE key LIKE 'nyx:%';

COMMIT;
