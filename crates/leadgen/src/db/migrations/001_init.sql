CREATE TABLE IF NOT EXISTS companies (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    domain TEXT UNIQUE,
    industry TEXT,
    employee_count INTEGER,
    funding_stage TEXT,
    tech_stack TEXT,
    location TEXT,
    description TEXT,
    source TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS contacts (
    id TEXT PRIMARY KEY,
    company_id TEXT REFERENCES companies(id),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    title TEXT,
    seniority TEXT,
    department TEXT,
    email TEXT,
    email_status TEXT DEFAULT 'unknown',
    linkedin_url TEXT,
    phone TEXT,
    source TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS email_patterns (
    domain TEXT PRIMARY KEY,
    pattern TEXT NOT NULL,
    confidence REAL,
    sample_count INTEGER,
    verified_at TEXT
);

CREATE TABLE IF NOT EXISTS enrichment_cache (
    url TEXT PRIMARY KEY,
    content TEXT,
    extracted_json TEXT,
    model_used TEXT,
    fetched_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS lead_scores (
    contact_id TEXT PRIMARY KEY REFERENCES contacts(id),
    icp_fit_score REAL DEFAULT 0.0,
    intent_score REAL DEFAULT 0.0,
    recency_score REAL DEFAULT 0.0,
    composite_score REAL DEFAULT 0.0,
    scored_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_contacts_company ON contacts(company_id);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
CREATE INDEX IF NOT EXISTS idx_companies_domain ON companies(domain);
CREATE INDEX IF NOT EXISTS idx_lead_scores_composite ON lead_scores(composite_score DESC);
