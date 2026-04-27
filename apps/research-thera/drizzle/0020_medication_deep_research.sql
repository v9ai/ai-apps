-- Medication deep-research workflow: drug-level fact tables.
-- Keyed on `drug_slug` = lower(split_part(name, ' ', 1)) so the same Singulair
-- knowledge surfaces for every user / family-member row.

-- Expression index supporting `WHERE lower(split_part(name, ' ', 1)) = $slug`
CREATE INDEX IF NOT EXISTS medications_drug_slug_idx
  ON medications ((lower(split_part(name, ' ', 1))));

CREATE TABLE IF NOT EXISTS medication_pharmacology (
  drug_slug      text PRIMARY KEY,
  generic_name   text,
  brand_names    jsonb NOT NULL DEFAULT '[]'::jsonb,
  atc_code       text,
  moa            text,
  half_life      text,
  peak_time      text,
  metabolism     text,
  excretion      text,
  source_url     text,
  updated_at     timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS medication_indications (
  id             bigserial PRIMARY KEY,
  drug_slug      text NOT NULL,
  kind           text NOT NULL CHECK (kind IN ('primary','off_label')),
  condition      text NOT NULL,
  evidence_level text,
  source         text,
  source_url     text,
  confidence     integer,
  created_at     timestamptz NOT NULL DEFAULT NOW(),
  UNIQUE (drug_slug, kind, condition)
);
CREATE INDEX IF NOT EXISTS medication_indications_slug_idx
  ON medication_indications(drug_slug);

CREATE TABLE IF NOT EXISTS medication_dosing (
  id             bigserial PRIMARY KEY,
  drug_slug      text NOT NULL,
  population     text NOT NULL CHECK (population IN ('adult','pediatric','elderly','renal','hepatic')),
  age_band       text,
  weight_band    text,
  dose_text      text NOT NULL,
  frequency      text,
  max_daily      text,
  source_url     text,
  created_at     timestamptz NOT NULL DEFAULT NOW()
);
-- COALESCE in the dedup key requires a UNIQUE INDEX (table-level UNIQUE
-- constraints reject expressions).
CREATE UNIQUE INDEX IF NOT EXISTS medication_dosing_dedup_idx
  ON medication_dosing (drug_slug, population, COALESCE(age_band,''), COALESCE(weight_band,''), dose_text);
CREATE INDEX IF NOT EXISTS medication_dosing_slug_idx
  ON medication_dosing(drug_slug);

CREATE TABLE IF NOT EXISTS medication_adverse_events (
  id             bigserial PRIMARY KEY,
  drug_slug      text NOT NULL,
  event          text NOT NULL,
  frequency_band text NOT NULL CHECK (frequency_band IN ('common','uncommon','rare','black_box')),
  severity       text,
  source_url     text,
  created_at     timestamptz NOT NULL DEFAULT NOW(),
  UNIQUE (drug_slug, event, frequency_band)
);
CREATE INDEX IF NOT EXISTS medication_adverse_events_slug_idx
  ON medication_adverse_events(drug_slug);

CREATE TABLE IF NOT EXISTS medication_interactions (
  id               bigserial PRIMARY KEY,
  drug_slug        text NOT NULL,
  interacting_drug text NOT NULL,
  severity         text NOT NULL CHECK (severity IN ('contraindicated','major','moderate','minor')),
  mechanism        text,
  recommendation   text,
  source_url       text,
  created_at       timestamptz NOT NULL DEFAULT NOW(),
  UNIQUE (drug_slug, interacting_drug)
);
CREATE INDEX IF NOT EXISTS medication_interactions_slug_idx
  ON medication_interactions(drug_slug);
