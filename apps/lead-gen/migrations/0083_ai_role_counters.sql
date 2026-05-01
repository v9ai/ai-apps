ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS ai_role_count_30d INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS remote_ai_role_count_30d INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_companies_ai_role_count
  ON companies (ai_role_count_30d) WHERE ai_role_count_30d > 0;

CREATE INDEX IF NOT EXISTS idx_companies_remote_ai_role_count
  ON companies (remote_ai_role_count_30d) WHERE remote_ai_role_count_30d > 0;
