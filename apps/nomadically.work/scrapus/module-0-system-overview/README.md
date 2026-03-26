# Module 0: System Overview (Local Stack)

**Source:** Kaplan, Seker & Yoruk (2025). Scrapus -- adapted for fully local deployment.

---

## Architecture -- Fully Local

All persistence is file-based. No managed services, no cloud databases, no external
infrastructure beyond the OpenAI API for summarization.

## Storage Layer Mapping

| Concern                  | Original    | Local Replacement                         |
|--------------------------|-------------|-------------------------------------------|
| Graph database           | Neo4j       | SQLite (adjacency tables + JSON columns)  |
| Vector similarity search | --          | LanceDB (Arrow-native, on-disk)           |
| Document embeddings      | --          | ChromaDB (page profiles, topic vectors)   |
| Message queue            | Kafka       | Python `queue.Queue` or SQLite WAL table  |
| Read cache               | Redis       | LanceDB query cache / in-memory dict      |
| Replay buffer (RL)       | Redis       | LanceDB table or in-memory deque          |

## Why This Combination

**SQLite** handles the structured graph: companies, people, products, relations,
scores, metadata. It supports JSON columns (json_extract), full-text search (FTS5),
and transactional writes from multiple threads via WAL mode. Graph traversal becomes
JOIN queries on an edges table -- not as elegant as Cypher but sufficient for the
shallow graph depth this system needs (rarely >2 hops).

**LanceDB** handles all vector operations: Siamese profile embeddings for entity
matching, sentence-transformer page embeddings for the crawler's state representation,
and pre-computed lead profile vectors for matching. LanceDB stores vectors alongside
metadata in Apache Arrow format, supports ANN search, and works from a single
directory on disk. No server process needed.

**ChromaDB** handles document-level storage: full page profiles with their topic
vectors, BERTopic outputs, and extracted text chunks. It serves as the "document
memory" -- when you need to ask "have we seen content like this before?" or retrieve
similar pages for deduplication, ChromaDB's collection-based API is simpler than
rolling your own on LanceDB.

## File Layout

```
scrapus_data/
├── scrapus.db              # SQLite -- graph tables, metadata, queue, config
├── lancedb/                # LanceDB directory
│   ├── entity_embeddings/  # Siamese vectors for entity matching
│   ├── page_embeddings/    # Crawler state vectors
│   ├── lead_profiles/      # ICP + candidate profile vectors
│   └── replay_buffer/      # RL experience tuples
├── chromadb/               # ChromaDB persistent directory
│   ├── page_documents/     # Full page profiles + topic vectors
│   └── company_documents/  # Aggregated company descriptions
└── models/                 # Local model weights
    ├── bert-ner/           # Fine-tuned BERT NER
    ├── siamese/            # Siamese network weights
    ├── xgboost/            # Ensemble classifier
    └── dqn/                # Crawler policy network
```

## Data Flow

```
Seeds/Keywords
      │
      ▼
┌─────────────────┐
│  Crawler Agents  │──► page_embeddings (LanceDB)
│  DQN + MAB       │──► replay_buffer (LanceDB)
│                  │◄── entity exists? (LanceDB ANN lookup)
└────────┬────────┘
         │ raw HTML → Python queue.Queue
         ▼
┌─────────────────┐
│  Extraction      │──► page_documents (ChromaDB)
│  BERT NER        │──► reward event → crawler queue
│  spaCy + Topics  │
└────────┬────────┘
         │ page profiles
         ▼
┌─────────────────┐
│  Entity Res.     │──► entity_embeddings (LanceDB) for matching
│  + Graph Store   │──► companies/edges/enrichment (SQLite)
└────────┬────────┘
         │ enriched profiles
         ▼
┌─────────────────┐
│  Lead Matching   │──► lead_profiles (LanceDB) for Siamese similarity
│  Siamese +       │──► lead scores written back (SQLite)
│  XGBoost         │
└────────┬────────┘
         │ qualified leads
         ▼
┌─────────────────┐
│  LLM Summary     │──► reads facts from SQLite
│  GPT-4 / local   │──► reads context from ChromaDB
│                  │──► final reports (SQLite + filesystem)
└─────────────────┘
```

## Tech Stack

| Layer          | Technology                                              |
|----------------|---------------------------------------------------------|
| Crawling       | Python asyncio + aiohttp, Selenium (headless), DQN      |
| NLP            | Hugging Face Transformers, spaCy, BERTopic, LDA         |
| Graph store    | SQLite 3.45+ (WAL mode, JSON columns, FTS5)             |
| Vector store   | LanceDB 0.6+ (entity/page/lead embeddings)              |
| Document store | ChromaDB (page profiles, company documents)             |
| Matching       | Siamese network (PyTorch), XGBoost, scikit-learn        |
| Generation     | OpenAI GPT-4 API (or local llama.cpp / Ollama)          |
| External KBs   | DBpedia / Wikidata SPARQL (optional enrichment)         |
| Queue          | Python queue.Queue (in-process) or SQLite WAL table     |

## Key Results

| Metric                       | Scrapus | Baseline |
|------------------------------|---------|----------|
| Crawl harvest rate           | ~15%    | ~5%      |
| NER extraction F1            | 0.92    | 0.85     |
| Lead classification precision| 89.7%   | 80%      |
| Lead classification recall   | 86.5%   | 78%      |
| Summary user satisfaction    | 92%     | 72%      |
| Summary factual accuracy     | 97%     | --       |
