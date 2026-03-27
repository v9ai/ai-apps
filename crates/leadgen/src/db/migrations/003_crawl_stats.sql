CREATE TABLE IF NOT EXISTS crawl_stats (
    domain TEXT PRIMARY KEY,
    total_crawls INTEGER DEFAULT 0,
    total_pages INTEGER DEFAULT 0,
    total_contacts INTEGER DEFAULT 0,
    total_emails INTEGER DEFAULT 0,
    harvest_rate REAL DEFAULT 0.0,
    last_crawled_at TEXT,
    last_harvest_rate REAL DEFAULT 0.0,
    avg_pages_per_crawl REAL DEFAULT 0.0
);
