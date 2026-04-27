-- Add a numeric `company_id` column on D1 `posts` that mirrors Neon's
-- `companies.id`, so the existing GraphQL contract (LinkedInPost.companyId: Int)
-- keeps working when reads flip to D1.
--
-- The column is denormalized: writers (Apollo upsert resolver) populate it
-- alongside `company_key` from the same Neon companies row.

ALTER TABLE posts ADD COLUMN company_id INTEGER;
CREATE INDEX IF NOT EXISTS idx_posts_company_id ON posts(company_id);
