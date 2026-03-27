CREATE TABLE IF NOT EXISTS entity_links (
    duplicate_id TEXT PRIMARY KEY,
    canonical_id TEXT NOT NULL,
    confidence REAL NOT NULL DEFAULT 0.0,
    resolved_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_entity_links_canonical ON entity_links(canonical_id);

CREATE TABLE IF NOT EXISTS pipeline_runs (
    id TEXT PRIMARY KEY,
    started_at TEXT NOT NULL DEFAULT (datetime('now')),
    completed_at TEXT,
    stages_run INTEGER DEFAULT 0,
    total_signals INTEGER DEFAULT 0,
    success INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS eval_signals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id TEXT,
    stage_name TEXT NOT NULL,
    metric_name TEXT NOT NULL,
    value REAL NOT NULL,
    timestamp TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_eval_signals_run ON eval_signals(run_id);
CREATE INDEX IF NOT EXISTS idx_eval_signals_stage ON eval_signals(stage_name, metric_name);
