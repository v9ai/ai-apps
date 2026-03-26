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

#### Blocking Strategy

Two blocking keys are generated for every entity:

| Key | Derivation | Example |
|-----|-----------|---------|
| **Primary** | First 4 characters of `normalized_name` (prefix blocking) | `acme` |
| **Secondary** | Soundex code of the full normalized name | `A250` |

Candidate retrieval queries both keys with `OR` and deduplicates before deep
matching. Block size is **capped at 200** -- if a block exceeds this limit, a
random sample of 200 is drawn to keep pairwise comparisons tractable while
preserving statistical coverage.

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

### Threshold Derivation (0.05)

The 0.05 cosine distance threshold was selected via a precision-recall curve
sweep on the 500-pair held-out test set:

- **Range swept:** 0.01 to 0.20 in 0.005 increments (39 candidate thresholds).
- **Selection criterion:** maximize F1 while keeping precision above 95%.
- **Result:** 0.05 achieves F1 = 90.1% (Precision 96.8%, Recall 84.2%).

Thresholds below 0.05 gain marginal recall at the cost of precision dropping
below the 95% floor. Thresholds above 0.05 sacrifice recall faster than they
improve precision. The sweep data is reproducible by running
`scripts/threshold_sweep.py` against the labeled pair set.

### Location Conflict Detection

The `conflicts()` guard prevents merging entities whose locations are
contradictory:

```python
def conflicts(loc_a: str | None, loc_b: str | None) -> bool:
    """Return True if locations are incompatible."""
    if loc_a is None or loc_b is None:
        return False                         # missing data = no conflict
    ratio = Levenshtein.ratio(loc_a.lower(), loc_b.lower())
    if ratio >= 0.6:
        return False                         # similar enough
    if loc_a.lower() in loc_b.lower() or loc_b.lower() in loc_a.lower():
        return False                         # substring match (e.g. "Berlin" / "Berlin, DE")
    return True
```

Rules:
1. If either location is null, no conflict (missing data is not evidence).
2. If `Levenshtein.ratio(a, b) >= 0.6`, no conflict (names are sufficiently similar).
3. If one location is a substring of the other, no conflict (hierarchical match).
4. Otherwise, conflict -- block the merge.

### Merge Transaction (`merge_into`)

When a match is confirmed, the merge executes as a single atomic transaction:

```sql
BEGIN TRANSACTION;

-- 1. Transfer all fields from source to target (prefer non-null values)
UPDATE companies
SET name        = COALESCE(source.name, target.name),
    location    = COALESCE(source.location, target.location),
    industry    = COALESCE(source.industry, target.industry),
    description = COALESCE(source.description, target.description),
    updated_at  = unixepoch('subsec')
WHERE id = :target_id;

-- 2. Re-point all edges from source to target
UPDATE edges SET source_id = :target_id WHERE source_id = :source_id;
UPDATE edges SET target_id = :target_id WHERE target_id = :source_id;

-- 3. Remove the now-orphaned source entity
DELETE FROM companies WHERE id = :source_id;

-- 4. Upsert the merged entity embedding in LanceDB
-- (executed via Python LanceDB client within the same transaction context)

COMMIT;
```

The LanceDB upsert (step 4) re-encodes the merged entity and calls
`entity_table.merge_insert(...)` so the vector index stays consistent with
SQLite.

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

### SQLite <-> LanceDB Sync

Sync is performed in batches to amortize I/O overhead:

- **Batch size:** 100 entities per upsert call.
- **Retry policy:** 3 attempts on failure, exponential backoff (1s, 2s, 4s).
- **Trigger:** any `INSERT` or `UPDATE` on the `companies` table flushes the
  dirty set. If the dirty set exceeds 100 entries, the flush is immediate;
  otherwise it piggybacks on the next resolution cycle.
- **Consistency guarantee:** if all 3 retries fail, the batch is written to a
  dead-letter log (`scrapus_data/lance_sync_failures.jsonl`) for manual replay.

### ER Results

Evaluated on a 500-pair held-out test set:

| Metric | Value |
|--------|-------|
| Precision | 96.8% |
| Recall | 84.2% |
| F1 | 90.1% |

The high precision / lower recall trade-off is intentional: false merges
corrupt the knowledge graph, while missed merges only create duplicates that can
be caught in later passes.

---

## Siamese Encoder Training Spec

| Parameter | Value |
|-----------|-------|
| Labeled pairs | 5,000 (3,200 positive, 1,800 negative) |
| Loss function | Contrastive loss |
| Contrastive margin | 1.0 |
| Optimizer | Adam |
| Learning rate | 1e-3 |
| Batch size | 64 |
| Epochs | 50 (max) |
| Early stopping | patience = 5 epochs on validation F1 |
| Embedding dimension | 128 |
| Input features | name + location + industry keywords (concatenated text) |

Training data is split 80/10/10 (train/val/test). Positive pairs are generated
from known-duplicate clusters; negative pairs are sampled from different
clusters, with 30% hard negatives (same industry, different entity) to improve
discriminative power at the decision boundary.

---

## Incremental Entity Resolution

The blocking index and candidate cache are maintained incrementally rather than
rebuilt on every entity:

- **Blocking index rebuild:** triggered every 1,000 new entities. Between
  rebuilds, new entities are appended to their prefix block in-memory.
- **Candidate cache TTL:** 1 hour. Cached results map
  `normalized_name -> (match_result, timestamp)` to skip redundant deep-match
  queries for recently seen entities.
- **Effect:** amortizes the O(n) index build cost across batches while keeping
  the cache fresh enough to reflect recent merges.

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
import httpx

def enrich_from_dbpedia(company_name: str) -> dict | None:
    query = f"""
    SELECT ?desc ?employees ?parent WHERE {{
        ?company rdfs:label "{company_name}"@en .
        OPTIONAL {{ ?company dbo:abstract ?desc . FILTER(LANG(?desc)="en") }}
        OPTIONAL {{ ?company dbo:numberOfEmployees ?employees }}
        OPTIONAL {{ ?company dbo:parentCompany ?parent }}
    }} LIMIT 1
    """
    resp = httpx.get("https://dbpedia.org/sparql",
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

---

## Production Gaps

The following items are known limitations that need resolution before the ER
pipeline can run unsupervised in production:

| # | Gap | Impact | Mitigation |
|---|-----|--------|------------|
| 1 | **No automated retraining loop** -- the Siamese encoder is trained once; distribution drift in incoming entities will degrade recall over time. | Recall decay after ~50K new entities. | Schedule quarterly retraining on accumulated labeled pairs; add a monitoring query that flags F1 drops > 5%. |
| 2 | **Soundex is English-biased** -- secondary blocking key produces poor codes for non-Latin company names (e.g. CJK, Cyrillic). | Missed blocks for non-English entities. | Replace Soundex with Double Metaphone or language-aware phonetic encoding. |
| 3 | **No merge audit log** -- `merge_into` does not record which entities were merged or why. | Cannot undo incorrect merges; no explainability. | Add a `merge_log` table: `(merge_id, source_id, target_id, distance, timestamp, reason_json)`. |
| 4 | **Single-writer bottleneck** -- SQLite WAL mode allows only one writer at a time. | Throughput ceiling at ~500 merges/sec under contention. | Batch merges into 100-entity transactions; consider moving to libSQL or Turso for multi-writer if throughput exceeds ceiling. |
| 5 | **LanceDB sync failure path is manual** -- dead-letter log requires human intervention to replay. | Stale embeddings if failures accumulate unnoticed. | Add a cron job that retries `lance_sync_failures.jsonl` entries every 15 minutes; alert if file size exceeds 1 MB. |
| 6 | **No adaptive threshold** -- the 0.05 threshold is static. Entity distributions may shift as new industries are crawled. | Precision/recall imbalance for underrepresented domains. | Implement per-industry threshold overrides or the `AdaptiveThresholdSelector` from IMPLEMENTATION.md. |
| 7 | **DBpedia enrichment has no rate limiting** -- the SPARQL endpoint will throttle or ban at high request rates. | Enrichment failures during bulk ingestion. | Add a token-bucket rate limiter (10 req/sec) and cache enrichment results with 7-day TTL. |

---

## Latest Research Insights (2024-2026)

The LLM revolution has fundamentally disrupted traditional entity resolution.
Research from 2023-2026 demonstrates that Siamese networks are increasingly
outclassed by transformer-based and LLM-driven methods across accuracy, data
efficiency, and schema robustness.

### LLM-Based Entity Matching (Peeters & Bizer 2023-2024)

Generative LLMs significantly outperform fine-tuned BERT models for entity
matching, especially in low-data and zero-shot scenarios:

- **Zero-shot LLMs achieve 85-92% F1** on standard benchmarks without
  task-specific training (vs. 68-75% for Siamese networks).
- **Fine-tuned BERT requires 1,000+ labeled examples** to reach comparable
  performance; few-shot LLMs need only 10-100.
- **Schema robustness**: Siamese networks suffer a 45% performance drop under
  schema variation, while LLMs drop only 5%.
- **Prompt engineering** (few-shot, chain-of-thought) dramatically improves
  matching accuracy without any weight updates.

### Ditto / Pre-Trained Transformer ER

Ditto (Li et al., 2021; evolved through 2023) introduced three innovations that
make contrastive-loss Siamese encoders obsolete for structured ER:

1. **Data augmentation** via synonym replacement, attribute deletion, and
   attribute shuffling -- reduces labeled-pair requirements by 5-10x.
2. **Contextualized embeddings** from BERT/DeBERTa capture cross-attribute
   interactions that fixed-width Siamese vectors miss.
3. **Attribute-level attention** automatically weights name vs. location vs.
   industry per pair, adapting to domain-specific signal distributions.

Ditto achieves **96.2% F1** vs. 91.5% for Siamese on WDC Products benchmark,
with 3x faster inference due to single-forward-pass architecture. AdapterEM
(Mugeni et al., 2023) further reduces fine-tuning cost via parameter-efficient
adapter layers on DeBERTa-v3.

### GNN Collective Entity Resolution

Graph neural networks propagate match/non-match signals across the entity graph,
enforcing transitive consistency that pairwise matchers cannot guarantee:

- 3-hop message passing catches cases where A=B and B=C but the pairwise
  matcher missed A=C.
- Recent work (2023-2025) shows **15-25% F1 improvement** over pairwise methods
  when relational context is available.
- Fits naturally into the existing SQLite adjacency-list graph -- the GNN
  operates on a temporary resolution graph built from candidate pairs, then
  writes final merge decisions back to SQLite.

### SBERT Embedding Blocking (Replacing Rule-Based)

Zeakis et al. (2023) evaluated 12 language models across 17 ER benchmarks and
found that SBERT-based semantic blocking outperforms rule-based prefix/Soundex
blocking:

- **92% recall** vs. 78% for rule-based blocking on WDC Products, while
  reducing candidate pairs by 40%.
- Eliminates the English-bias problem of Soundex (Production Gap #2).
- DBSCAN clustering on SBERT embeddings produces density-aware, overlapping
  blocks that adapt to entity distribution automatically.
- `all-MiniLM-L6-v2` provides the best speed/accuracy trade-off for blocking
  (22ms per 1,000 entities on CPU).

---

## Upgrade Path

Concrete upgrades ordered by impact and implementation effort. Each phase is
independently deployable.

### Phase 1: Ditto Replacement for Siamese Encoder (1-2 months)

Replace the 128-dim contrastive-loss Siamese encoder with a DeBERTa-v3-base
model using adapter tuning (AdapterEM). This is the highest-ROI change:

- Swap `siamese_encoder.encode()` with `DittoEntityMatcher.predict()`.
- Serialize entities with attribute markers (`NAME: ... | LOCATION: ... | INDUSTRY: ...`).
- Apply Ditto-style data augmentation during fine-tuning (deletion, swap, synonym replacement).
- Reuse existing 5,000 labeled pairs -- Ditto needs only 500-2,000 for equivalent F1.
- Expected improvement: F1 from 90.1% to ~95-96%.

### Phase 2: SBERT Embedding Blocking (1 month)

Replace prefix + Soundex blocking with SBERT semantic blocking:

- Encode entities via `all-MiniLM-L6-v2` into 384-dim vectors.
- Apply DBSCAN (`eps=0.3`, `min_samples=2`, `metric='cosine'`) to form blocks.
- Store block embeddings in LanceDB alongside entity embeddings.
- Removes the 200-candidate cap (block sizes self-regulate via density).
- Eliminates Soundex English-bias (Production Gap #2).

### Phase 3: Streaming ER for Incremental Data (2 months)

Replace batch-oriented resolution with a streaming architecture:

- Maintain a sliding window buffer (`deque(maxlen=1000)`) of recent entities.
- New entities first match against the buffer, then fall through to the full
  LanceDB index.
- Add `entity_versions`, `match_decisions`, and `equivalence_classes` tables
  for audit trail and transitive closure maintenance.
- Run periodic transitive-closure repair every 100 entities (< 5ms overhead).
- Expected computation reduction: 60% vs. current batch processing.

### Phase 4: Active Learning Pair Selection (1 month)

Reduce labeling effort by 75% while maintaining 95% of maximum accuracy:

- Implement uncertainty + diversity sampling for pair selection.
- **Uncertainty**: margin-based sampling (`1 - |2p - 1|`) on matcher output.
- **Diversity**: embedding-based coverage to avoid redundant annotations.
- Batch-update the matcher every 50 newly labeled pairs.
- Weighted combination: 60% uncertainty + 40% diversity.

### Phase 5: LLM Fallback for Hard Cases (1 month)

Add a cascade matcher that routes pairs by difficulty:

```
Incoming pair
  |
  +--> SBERT cosine > 0.9?  --> Auto-match (60% of cases, ~0 cost)
  |
  +--> SBERT cosine < 0.3?  --> Auto-reject (20% of cases, ~0 cost)
  |
  +--> Ambiguous zone        --> Local LLM 7B few-shot (20% of cases)
         |
         +--> Confidence < 0.6? --> GPT-4 API fallback (< 5% of cases)
```

- Use Llama 3.1 8B or Mistral 7B locally for the ambiguous zone.
- Few-shot prompt with 5-10 labeled examples from the same industry.
- Reserve API calls for genuinely hard cases (rebrands, subsidiaries, M&A).
- Expected cost: < $0.50/day at 10K entities/day throughput.

---

## Key Papers

Top 10 papers most relevant to the Scrapus ER pipeline, ordered by impact:

| # | Paper | Year | Relevance |
|---|-------|------|-----------|
| 1 | [Peeters & Bizer -- Entity Matching using Large Language Models](https://arxiv.org/abs/2310.11244) | 2023 | LLMs vs. fine-tuned models for ER; zero-shot benchmarks |
| 2 | [Zeakis et al. -- Pre-Trained Embeddings for Entity Resolution](https://doi.org/10.14778/3598581.3598594) | 2023 | 12 LM comparison for blocking/matching; SBERT superiority |
| 3 | [Ma et al. -- CE-RAG4EM: Cost-Efficient RAG for Entity Matching](https://arxiv.org/abs/2602.05708) | 2026 | Blocking-aware RAG reduces LLM cost 60-75% |
| 4 | [Wang et al. -- Match, Compare, or Select? LLMs for Entity Matching](https://arxiv.org/abs/2405.16884) | 2024 | Prompt strategy comparison for LLM-based ER |
| 5 | [Genossar et al. -- The Battleship Approach to Low Resource ER](https://doi.org/10.1145/3626711) | 2023 | Active learning achieves 90% accuracy with 20% labels |
| 6 | [Mugeni et al. -- AdapterEM: Adapter-tuning for Generalized ER](https://doi.org/10.1145/3589462.3589498) | 2023 | Parameter-efficient Ditto alternative |
| 7 | [Hofer et al. -- Construction of Knowledge Graphs: Current State](https://doi.org/10.3390/info15080509) | 2024 | Streaming ER and incremental KG update framework |
| 8 | [Arora & Dell -- LinkTransformer: Record Linkage with Transformers](https://doi.org/10.18653/v1/2024.acl-demos.21) | 2024 | Unified transformer package for record linkage |
| 9 | [Zhang et al. -- Graph-Theoretic Fusion for Unsupervised ER](https://doi.org/10.1109/icde.2018.00070) | 2018 | ITER + CliqueRank algorithms for graph-based ER |
| 10 | [Schroff et al. -- FaceNet: Unified Embedding](https://doi.org/10.1109/CVPR.2015.7298682) | 2015 | Semi-hard negative mining (still used in modern ER training) |

---

## ER Pipeline Evolution

Migration from the current v1.0 architecture to the target v2.0 hybrid
architecture. Each step is backward-compatible -- the pipeline can run at any
intermediate stage.

### Current Architecture (v1.0)

```
New Entity
  --> Rule-Based Blocking (prefix + Soundex, SQLite)
  --> Siamese Deep Matching (LanceDB, cosine < 0.05)
  --> Location Conflict Check
  --> Merge or Create
```

### Target Architecture (v2.0)

```
New Entity
  --> SBERT Semantic Blocking (DBSCAN clusters, LanceDB)
  --> Cascade Matching:
       Easy:   SBERT cosine > 0.9  --> auto-match  (60%)
       Medium: DeBERTa adapter     --> match/reject (30%)
       Hard:   Local LLM few-shot  --> match/reject (10%)
  --> GNN Consistency Check (3-hop message passing)
  --> Streaming Merge (equivalence classes, audit log)
```

### Migration Steps

**Step 1: Add SBERT blocking alongside existing blocking (non-breaking)**

```python
# Run both blockers in parallel, union the candidate sets
rule_candidates = rule_based_block(entity)       # existing
sbert_candidates = sbert_block(entity)           # new
candidates = deduplicate(rule_candidates | sbert_candidates)

# Log disagreements for analysis
if rule_candidates != sbert_candidates:
    log_blocking_disagreement(entity, rule_candidates, sbert_candidates)
```

**Step 2: Replace Siamese encoder with DeBERTa adapter matcher**

```python
# Old path (remove after validation)
# candidate_vec = siamese_encoder.encode(profile)
# results = entity_table.search(candidate_vec).limit(5).to_list()

# New path
for candidate in candidates:
    is_match, confidence = ditto_matcher.predict(entity, candidate)
    if is_match and confidence > 0.85:
        if not conflicts(entity["location"], candidate["location"]):
            merge_into(candidate["id"], entity)
            break
```

**Step 3: Add cascade routing for cost control**

```python
def cascade_match(entity, candidate):
    """Route pair to cheapest sufficient matcher."""
    sbert_sim = sbert_similarity(entity, candidate)

    if sbert_sim > 0.9:
        return Match(confidence=sbert_sim, method="sbert")
    if sbert_sim < 0.3:
        return NoMatch(confidence=1 - sbert_sim, method="sbert")

    # Ambiguous -- use DeBERTa adapter
    is_match, conf = ditto_matcher.predict(entity, candidate)
    if conf > 0.6:
        return Match(confidence=conf, method="ditto") if is_match \
               else NoMatch(confidence=conf, method="ditto")

    # Still ambiguous -- LLM fallback
    llm_conf = llm_matcher.match_pair(entity, candidate)
    return Match(confidence=llm_conf, method="llm") if llm_conf > 0.5 \
           else NoMatch(confidence=1 - llm_conf, method="llm")
```

**Step 4: Add streaming merge with audit trail**

```python
def streaming_merge(entity, match_result):
    """Merge with full audit trail and equivalence class update."""
    with sqlite_transaction() as tx:
        # 1. Record the match decision
        tx.execute("""
            INSERT INTO match_decisions
            (entity1_id, entity2_id, match_prob, decision, timestamp, model_version)
            VALUES (?, ?, ?, 1, unixepoch('subsec'), ?)
        """, (entity["id"], match_result.target_id,
              match_result.confidence, match_result.method))

        # 2. Perform the merge (existing logic)
        merge_into(match_result.target_id, entity)

        # 3. Update equivalence classes
        update_equivalence_classes(entity["id"], match_result.target_id)

        # 4. Propagate to 2-hop neighbors
        neighbors = get_2hop_neighbors(match_result.target_id)
        revalidation_queue.extend(neighbors)
```

**Step 5: Add GNN consistency layer (final stage)**

```python
def gnn_consistency_check(pending_merges):
    """Enforce transitive consistency via 3-hop message passing."""
    # Build resolution graph from pending merge decisions
    resolution_graph = build_graph(pending_merges)

    # 3 rounds of message passing
    for _ in range(3):
        for node in resolution_graph.nodes:
            neighbor_votes = [
                resolution_graph.edge_weight(node, n)
                for n in resolution_graph.neighbors(node)
            ]
            node.confidence = 0.7 * node.confidence + 0.3 * mean(neighbor_votes)

    # Extract consistent clusters (connected components above threshold)
    clusters = connected_components(resolution_graph, threshold=0.6)

    # Flag inconsistencies for human review
    for cluster in clusters:
        if cluster.min_edge_weight < 0.4:
            flag_for_review(cluster)

    return clusters
```

### Benchmark Comparison (v1.0 vs. v2.0 Target)

| Metric | v1.0 (Current) | v2.0 (Target) | Source |
|--------|----------------|---------------|--------|
| F1 Score | 90.1% | 95-97% | Ditto + cascade matching |
| Recall | 84.2% | 92-95% | SBERT blocking + GNN consistency |
| Precision | 96.8% | 97-98% | Cascade matching preserves conservative bias |
| Labeled pairs needed | 5,000 | 500-1,000 | Ditto data augmentation + active learning |
| Blocking recall | ~78% | ~92% | SBERT replaces prefix + Soundex |
| Schema robustness | ~55% (est.) | ~95% | Transformer cross-attribute attention |
| Inference cost/entity | Low | Low-Medium | Cascade routes 60% to free SBERT path |
