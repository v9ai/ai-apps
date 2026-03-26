# Module 3: Entity Resolution & Graph Store (SQLite + LanceDB)

## Purpose

Deduplicate entities across sources, merge fragmented facts, and store the
consolidated knowledge graph. Replaces Neo4j with SQLite for structure and
LanceDB for vector-based entity matching.

---

## Entity Resolution (ER)

### Step 1: Rule-Based Blocking (SQLite)

```sql
-- Normalize and check for existing candidates
SELECT id, name, normalized_name, location, industry
FROM companies
WHERE normalized_name LIKE '%acme%'
   OR normalized_name = 'acme corp';
```

Normalization: strip "Inc.", "LLC", "Ltd.", "GmbH", lowercase, collapse whitespace.

If rule-based blocking finds candidates, proceed to Step 2. If no candidates,
create new entity directly.

### Step 2: Deep Matching (LanceDB)

For subtle matches, encode entity profile into a vector and search:

```python
db = lancedb.connect("scrapus_data/lancedb")
entity_table = db.open_table("entity_embeddings")

# Encode candidate: name + location + industry keywords
candidate_vec = siamese_encoder.encode({
    "name": "Acme Corporation",
    "location": "Berlin",
    "industry_keywords": "cybersecurity AI threat detection"
})

results = entity_table.search(candidate_vec).limit(5).to_list()

for r in results:
    if r["_distance"] < 0.05:  # very close -- likely same entity
        if not conflicts(r["location"], candidate_location):
            merge_into(r["company_id"], new_profile)
            break
else:
    create_new_entity(new_profile)
```

### LanceDB Entity Embeddings Table

```python
entity_table = db.create_table("entity_embeddings", data=[{
    "vector": [0.0] * 128,          # Siamese encoder output
    "company_id": 0,                 # FK to SQLite companies table
    "name": "",
    "normalized_name": "",
    "location": "",
    "industry": "",
    "last_updated": 0.0
}])
```

Every time a company is created or updated in SQLite, its embedding is
upserted in LanceDB. This keeps the two stores in sync.

### ER Results

- Near-perfect precision (no false merges)
- Threshold 0.05 cosine distance ~ 0.95 similarity

---

## SQLite Graph Schema

```sql
-- Core entity tables
CREATE TABLE companies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    normalized_name TEXT NOT NULL,
    location TEXT,
    industry TEXT,
    founded_year INTEGER,
    employee_count INTEGER,
    funding_info TEXT,            -- JSON: [{"round": "B", "amount": 15000000}]
    description TEXT,
    lead_score REAL DEFAULT 0.0,
    lead_confidence REAL DEFAULT 0.0,
    is_qualified INTEGER DEFAULT 0,
    external_data TEXT,           -- JSON: DBpedia/Wikidata enrichment
    created_at REAL,
    updated_at REAL
);

CREATE TABLE persons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    role TEXT,
    company_id INTEGER REFERENCES companies(id)
);

CREATE TABLE products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    company_id INTEGER REFERENCES companies(id),
    description TEXT
);

-- Graph edges (replaces Neo4j relationships)
CREATE TABLE edges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_type TEXT NOT NULL,     -- 'company', 'person', 'product'
    source_id INTEGER NOT NULL,
    relation TEXT NOT NULL,        -- 'acquired', 'launched', 'works_at', etc.
    target_type TEXT NOT NULL,
    target_id INTEGER NOT NULL,
    properties TEXT,               -- JSON for extra attributes
    source_url TEXT,               -- provenance: which page this came from
    created_at REAL
);

CREATE INDEX idx_edges_source ON edges(source_type, source_id);
CREATE INDEX idx_edges_target ON edges(target_type, target_id);
CREATE INDEX idx_edges_relation ON edges(relation);

-- Full-text search on company descriptions
CREATE VIRTUAL TABLE companies_fts USING fts5(
    name, description, industry,
    content=companies, content_rowid=id
);

-- Company events / facts (denormalized for fast LLM prompt building)
CREATE TABLE company_facts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER REFERENCES companies(id),
    fact_type TEXT,                -- 'funding', 'acquisition', 'product_launch', 'hiring'
    fact_text TEXT,                -- "Raised $15M Series B in 2023"
    source_url TEXT,
    extracted_at REAL
);

CREATE INDEX idx_facts_company ON company_facts(company_id);
```

### Graph Traversal via SQL

Neo4j Cypher -> SQLite equivalent:

```sql
-- "Find all companies in cybersecurity with funding > $10M"
SELECT c.name, c.location, c.funding_info, c.lead_score
FROM companies c
WHERE c.industry LIKE '%cybersecurity%'
  AND json_extract(c.funding_info, '$[0].amount') > 10000000
ORDER BY c.lead_score DESC;

-- "Find what company X acquired"
SELECT target_c.name AS acquired_company, e.properties
FROM edges e
JOIN companies target_c ON e.target_id = target_c.id AND e.target_type = 'company'
WHERE e.source_type = 'company'
  AND e.source_id = ?
  AND e.relation = 'acquired';

-- "Find all people at company X"
SELECT p.name, p.role
FROM persons p
WHERE p.company_id = ?;
```

### 2-hop traversal (recursive CTE)

```sql
WITH direct AS (
    SELECT target_id AS cid FROM edges
    WHERE source_type='company' AND source_id=? AND target_type='company'
    UNION
    SELECT source_id FROM edges
    WHERE target_type='company' AND target_id=? AND source_type='company'
)
SELECT c.* FROM companies c WHERE c.id IN (SELECT cid FROM direct);
```

### Why SQLite Works Here

1. **Shallow depth** -- queries rarely go beyond 2 hops
2. **Read-heavy** -- writes happen only during extraction
3. **Moderate scale** -- 10K-100K companies, not millions
4. **Schema is predictable** -- fixed node types, fixed relation types
5. **WAL mode** -- concurrent reads from multiple threads with single writer

---

## External Enrichment

```python
import requests

def enrich_from_dbpedia(company_name: str) -> dict | None:
    query = f"""
    SELECT ?desc ?employees ?parent WHERE {{
        ?company rdfs:label "{company_name}"@en .
        OPTIONAL {{ ?company dbo:abstract ?desc . FILTER(LANG(?desc)="en") }}
        OPTIONAL {{ ?company dbo:numberOfEmployees ?employees }}
        OPTIONAL {{ ?company dbo:parentCompany ?parent }}
    }} LIMIT 1
    """
    resp = requests.get("https://dbpedia.org/sparql",
                        params={"query": query, "format": "json"})
    ...
```

~60% hit rate for mid-size+ companies.

## KG Roles in the Pipeline

| Consumer        | What it reads                          | How             |
|-----------------|----------------------------------------|-----------------|
| Crawler         | "Does entity X exist?"                 | LanceDB ANN    |
| Matching        | Enriched company profile + facts       | SQLite queries  |
| Summarization   | All facts, description, external data  | SQLite queries  |
| Deduplication   | Similar page content                   | ChromaDB query  |
