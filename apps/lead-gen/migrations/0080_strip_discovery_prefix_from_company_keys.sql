-- Strip the legacy `vadim:discovery-` prefix from companies.key so URLs
-- render as /companies/<slug> instead of /companies/vadim:discovery-<slug>.
--
-- Provenance is already encoded in tags=['discovery-candidate'] and tenant
-- in the tenant_id column, so the prefix carries no unique information.
--
-- Pre-flight (run 2026-04-30) found 29 prefixed rows and 0 collisions with
-- existing clean-key rows, so a straight UPDATE is safe.

UPDATE companies
SET key = substring(key from length('vadim:discovery-') + 1)
WHERE key LIKE 'vadim:discovery-%';
