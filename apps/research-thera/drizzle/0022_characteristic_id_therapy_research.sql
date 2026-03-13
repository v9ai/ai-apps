ALTER TABLE therapy_research ADD COLUMN characteristic_id INTEGER;
CREATE INDEX IF NOT EXISTS idx_therapy_research_characteristic_id ON therapy_research(characteristic_id);
