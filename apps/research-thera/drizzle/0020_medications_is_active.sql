-- 2026-04-27 — medications.is_active for past/present separation in UI.
--
-- Existing rows default to true; the explicit UPDATE flips the historical
-- entries (2012, 2017, 2023, plus the Feb 2026 short-course prescriptions)
-- to false for nicolai.vadim@gmail.com.
--
-- Applied via Neon MCP (mcp__Neon__run_sql_transaction). drizzle-kit migrate
-- is NOT the apply path — record only, mirroring 0019.

ALTER TABLE medications
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

UPDATE medications
SET is_active = false
WHERE user_id = 'nicolai.vadim@gmail.com'
  AND name IN (
    'Spray nazal hiperton',
    'Tamalis',
    'Rinoclenil (beclometazonă spray nazal)',
    'Kreon 10.000',
    'Hepatovit',
    'Helmadol',
    'Tiotriazoline',
    'Doprokin',
    'Benevron',
    'Famotidin',
    'Omeprazol',
    'Fosfogliv',
    'Astenor Energy (sol. buv.)',
    'Pantoprazol'
  );
