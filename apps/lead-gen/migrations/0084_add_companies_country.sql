-- Add ISO 3166-1 alpha-2 country code to companies for the sales-tech tab geo gate.
-- Backfills from existing `location` text where the trailing segment matches a
-- known country name (US + EU-27 + UK + EEA/EFTA = 33 countries).

ALTER TABLE companies ADD COLUMN IF NOT EXISTS country text;

-- ── Backfill ────────────────────────────────────────────────────────────
-- Each UPDATE handles one country. Order: most-specific names first
-- (e.g. "Czech Republic" before "Czechia"). Only touches rows where country
-- is still NULL so re-runs are idempotent.

UPDATE companies SET country = 'US' WHERE country IS NULL AND (
  location ILIKE '%, United States' OR location ILIKE '%, United States of America'
  OR location ILIKE '%, USA' OR location ILIKE '%, U.S.A.' OR location ILIKE '%, U.S.'
);

-- Bare US-state suffix: "San Francisco, CA" or "Boston, MA, US"
UPDATE companies SET country = 'US' WHERE country IS NULL AND location ~ ', (AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC)( ?,|$)';

UPDATE companies SET country = 'GB' WHERE country IS NULL AND (
  location ILIKE '%, United Kingdom' OR location ILIKE '%, UK' OR location ILIKE '%, U.K.'
  OR location ILIKE '%, Great Britain' OR location ILIKE '%, England'
  OR location ILIKE '%, Scotland' OR location ILIKE '%, Wales'
  OR location ILIKE '%, Northern Ireland'
);

UPDATE companies SET country = 'AT' WHERE country IS NULL AND location ILIKE '%, Austria';
UPDATE companies SET country = 'BE' WHERE country IS NULL AND location ILIKE '%, Belgium';
UPDATE companies SET country = 'BG' WHERE country IS NULL AND location ILIKE '%, Bulgaria';
UPDATE companies SET country = 'HR' WHERE country IS NULL AND location ILIKE '%, Croatia';
UPDATE companies SET country = 'CY' WHERE country IS NULL AND location ILIKE '%, Cyprus';
UPDATE companies SET country = 'CZ' WHERE country IS NULL AND (
  location ILIKE '%, Czech Republic' OR location ILIKE '%, Czechia'
);
UPDATE companies SET country = 'DK' WHERE country IS NULL AND location ILIKE '%, Denmark';
UPDATE companies SET country = 'EE' WHERE country IS NULL AND location ILIKE '%, Estonia';
UPDATE companies SET country = 'FI' WHERE country IS NULL AND location ILIKE '%, Finland';
UPDATE companies SET country = 'FR' WHERE country IS NULL AND location ILIKE '%, France';
UPDATE companies SET country = 'DE' WHERE country IS NULL AND (
  location ILIKE '%, Germany' OR location ILIKE '%, Deutschland'
);
UPDATE companies SET country = 'GR' WHERE country IS NULL AND location ILIKE '%, Greece';
UPDATE companies SET country = 'HU' WHERE country IS NULL AND location ILIKE '%, Hungary';
UPDATE companies SET country = 'IE' WHERE country IS NULL AND location ILIKE '%, Ireland';
UPDATE companies SET country = 'IT' WHERE country IS NULL AND location ILIKE '%, Italy';
UPDATE companies SET country = 'LV' WHERE country IS NULL AND location ILIKE '%, Latvia';
UPDATE companies SET country = 'LT' WHERE country IS NULL AND location ILIKE '%, Lithuania';
UPDATE companies SET country = 'LU' WHERE country IS NULL AND location ILIKE '%, Luxembourg';
UPDATE companies SET country = 'MT' WHERE country IS NULL AND location ILIKE '%, Malta';
UPDATE companies SET country = 'NL' WHERE country IS NULL AND (
  location ILIKE '%, Netherlands' OR location ILIKE '%, The Netherlands'
  OR location ILIKE '%, Holland'
);
UPDATE companies SET country = 'PL' WHERE country IS NULL AND location ILIKE '%, Poland';
UPDATE companies SET country = 'PT' WHERE country IS NULL AND location ILIKE '%, Portugal';
UPDATE companies SET country = 'RO' WHERE country IS NULL AND location ILIKE '%, Romania';
UPDATE companies SET country = 'SK' WHERE country IS NULL AND location ILIKE '%, Slovakia';
UPDATE companies SET country = 'SI' WHERE country IS NULL AND location ILIKE '%, Slovenia';
UPDATE companies SET country = 'ES' WHERE country IS NULL AND location ILIKE '%, Spain';
UPDATE companies SET country = 'SE' WHERE country IS NULL AND location ILIKE '%, Sweden';
UPDATE companies SET country = 'CH' WHERE country IS NULL AND location ILIKE '%, Switzerland';
UPDATE companies SET country = 'NO' WHERE country IS NULL AND location ILIKE '%, Norway';
UPDATE companies SET country = 'IS' WHERE country IS NULL AND location ILIKE '%, Iceland';
UPDATE companies SET country = 'LI' WHERE country IS NULL AND location ILIKE '%, Liechtenstein';

CREATE INDEX IF NOT EXISTS idx_companies_country ON companies (country);
