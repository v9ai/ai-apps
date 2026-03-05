ALTER TABLE stress_test_sessions ADD COLUMN slug text UNIQUE;

CREATE UNIQUE INDEX idx_stress_test_sessions_slug ON stress_test_sessions (slug);
