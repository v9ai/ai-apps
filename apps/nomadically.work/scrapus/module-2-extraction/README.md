# Module 2: Information Extraction & Entity Recognition (Local)

## Purpose

Parse crawled pages into structured page profiles (entities, relations, topics).
All models run locally. Page profiles stored in ChromaDB for deduplication and
similarity-based retrieval.

---

## Pipeline

```
Raw HTML (from crawler queue)
   │
   ▼
┌──────────────────┐
│ Boilerpipe        │  Strip nav, ads, boilerplate
│ Content Parsing   │  -> clean text
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ BERT NER          │  Local model: scrapus_data/models/bert-ner/
│ (fine-tuned)      │  Entity types: Org, Person, Location, Product
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Relation          │  spaCy dependency parse + BERT relation classifier
│ Extraction        │  12 target relation patterns
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Topic Modeling    │  LDA (20 topics) + BERTopic
│                   │  Outputs: topic distribution + key phrases
└────────┬─────────┘
         │
         ▼
   Page Profile -> ChromaDB + reward signal -> crawler
```

## NER Model

| Parameter       | Value                                            |
|-----------------|--------------------------------------------------|
| Base model      | `bert-base-cased` (local weights)                |
| Fine-tuning     | CoNLL-2003 + 1K press release annotations        |
| Inference       | PyTorch, CPU or GPU                              |
| Entity types    | Organization, Person, Location, Product/Service  |
| F1              | 92.3% (precision 93.1%, recall 91.5%)            |

Model weights stored at `scrapus_data/models/bert-ner/`. Loaded once at
worker startup, kept in memory for batch inference.

## Relation Extraction

Hybrid approach:
1. spaCy dependency parse identifies verb phrases connecting entities
2. BERT-based classifier (local, small) labels relation or "none"
3. Trained on 1,500 labeled sentences

Target relations:

| Relation                      | Example                              |
|-------------------------------|--------------------------------------|
| Company -> in -> Industry     | "Acme operates in cybersecurity"     |
| Company -> launched -> Product| "Acme launched AI ThreatGuard"       |
| Company -> acquired -> Company| "Acme acquired BetaCorp"             |
| Person -> joined -> Company   | "Jane Doe joined Acme as CTO"       |
| Company -> raised -> Funding  | "Acme raised $15M Series B"         |

Precision: ~85%.

## Topic Modeling

- **LDA:** 20-topic model, pre-trained on business articles, loaded from disk
- **BERTopic:** sentence-transformer embeddings + c-TF-IDF -> key phrases

Both produce vectors that get stored alongside the page profile in ChromaDB.

## Page Profile Storage -- ChromaDB

```python
import chromadb

client = chromadb.PersistentClient(path="scrapus_data/chromadb")
page_collection = client.get_or_create_collection(
    name="page_documents",
    metadata={"hnsw:space": "cosine"}
)

page_collection.add(
    ids=[page_url_hash],
    embeddings=[page_content_embedding],  # sentence-transformer 384-dim
    metadatas=[{
        "url": url,
        "title": title,
        "entities_json": json.dumps(entities),
        "relations_json": json.dumps(relations),
        "topics_json": json.dumps(topics),
        "crawl_timestamp": timestamp,
        "has_org_entity": True,
        "domain": domain
    }],
    documents=[clean_text[:2000]]  # truncated main content for retrieval
)
```

ChromaDB serves two purposes:

1. **Deduplication:** before processing a page, query by embedding similarity.
   If a near-duplicate exists (distance < 0.05), skip extraction entirely.

2. **Context retrieval:** when the summarization module needs background on a
   company, it can query ChromaDB for all pages mentioning that company and
   retrieve the most relevant content chunks.

## Reward Signal to Crawler

After extraction, the module evaluates what was found and pushes a reward:

```python
import queue

# Shared with crawler (in-process)
reward_queue = queue.Queue()

# After extraction completes for a page
if matched_org_entities:
    reward_queue.put({"url": url, "state": state_vec, "reward": 1.0})
elif any_org_entities:
    reward_queue.put({"url": url, "state": state_vec, "reward": 0.2})
else:
    reward_queue.put({"url": url, "state": state_vec, "reward": -0.1})
```

If running multi-process, this becomes a SQLite table:

```sql
CREATE TABLE reward_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    url TEXT,
    state_vector BLOB,
    reward REAL,
    consumed INTEGER DEFAULT 0,
    created_at REAL
);
```

## Output Format

Page profile dict passed downstream:

```python
{
    "url": "https://example.com/acme-news",
    "entities": [
        {"name": "Acme Corp", "type": "ORG", "span": [12, 21]},
        {"name": "BetaCorp", "type": "ORG", "span": [45, 53]},
        {"name": "AI ThreatGuard", "type": "PRODUCT", "span": [67, 81]}
    ],
    "relations": [
        {"subj": "Acme Corp", "pred": "launched", "obj": "AI ThreatGuard"},
        {"subj": "Acme Corp", "pred": "acquired", "obj": "BetaCorp"}
    ],
    "topics": {
        "lda_distribution": [0.05, 0.02, ...],  # 20 floats
        "bertopic_phrases": ["cybersecurity", "AI", "threat detection"]
    },
    "content_embedding": [0.12, -0.34, ...],  # 384-dim
    "clean_text": "Acme Corp, a Berlin-based cybersecurity firm..."
}
```
