# LeadsDB — AI Features Deep Report

> Repository: [IsaacBell/leads-db](https://github.com/IsaacBell/leads-db)
> Analysis date: 2026-03-28
> Analyst: Senior AI Engineer review for competitive intelligence

---

## 1. Overview

**LeadsDB** is an archived, open-source B2B lead generation prototype that automates the daily ingestion of company data sourced from Newly Registered Domains (NRDs) and enriches those companies with third-party API data. Users subscribe with email + country + industry preferences; the system surfaces matching companies via REST API and (partially implemented) weekly email digests.

| Attribute | Value |
|---|---|
| Stars | 28 |
| Forks | 6 |
| License | MIT |
| Status | Archived — "initial prototype" label, no active maintenance |
| Last meaningful activity | April 2024 (Issue #7 "Fix Next.js Issues" opened, never closed) |
| Frontend | Next.js 13.4.3 + React 18.2.0, Tailwind CSS |
| Backend | Flask 2.2.2 (Python 3.11), APScheduler |
| Primary DB | AstraDB (DataStax managed Cassandra) |
| Auxiliary stores | Firebase Firestore (source of truth for CRUD), Pinecone (vector index, unused in prod) |
| Streaming | Apache Kafka + Apache Pulsar (Astra Streaming) |
| AI/ML | OpenAI GPT-3.5, SpaCy `en_core_web_md`, LangChain Community |
| Enrichment API | Abstract API (company enrichment + scraping) |
| Deployment | GCP Cloud Run via GitHub Actions |
| NRD source | Private repo `IsaacBell/nrd-poll` (synced every 12 hours via GitHub Actions) |

The project is best understood as a thin pipeline prototype: it demonstrates domain-to-company identification via a third-party enrichment API, stores the results with SpaCy vector embeddings, and streams changes to Pulsar for CDC. The "AI" layer is shallow — there is no trained model, no scoring function, and no filtering against user preferences beyond what users type into a free-text "qualifications" field that is stored but never processed.

---

## 2. AI Architecture

### 2.1 Models and APIs used

| Component | Technology | Role |
|---|---|---|
| Company enrichment | Abstract API `companyenrichment.abstractapi.com/v1` | Resolves domain → company record (name, country, industry, LinkedIn, employee count, year founded) |
| Web page summarization | OpenAI GPT-3.5 (`gpt-3.5`) via `SiteSummarizer` | Generates 100-token page summaries from scraped HTML paragraphs |
| Vector embeddings | SpaCy `en_core_web_md` (300-d word vectors) | Converts JSON-serialized company records into float vectors stored as `$vector` in AstraDB |
| Vector storage | AstraDB (native vector support via `$vector` field) | Cosine similarity search on company records |
| Secondary vector index | Pinecone (1536-d, cosine, dimension matches OpenAI `text-embedding-ada-002`) | Defined in `api/pinecone.py` but never called from any route or scheduler — dead code |
| NLP embeddings lib | `langchain_community.embeddings.spacy_embeddings` | Imported in `db.py` but the raw `spacy.load()` call is used directly instead |

### 2.2 Lead identification algorithm

There is no lead-scoring algorithm. The identification pipeline is:

1. Pull domain list from gzip files (`data/daily/today_new.gz`, `yesterday_new.gz`)
2. For each domain, call Abstract API → receive structured company record
3. Save record to Firestore (primary) and AstraDB (secondary, with SpaCy vector)
4. Emit to Kafka topic `company-data` (fire-and-forget)
5. Stream to Pulsar CDC topic `persistent://leads/default/companies-cdc`

No filtering, scoring, or matching against subscriber preferences occurs at ingestion time. The "lead identification" is entirely outsourced to Abstract API: if a domain resolves to a company record with a non-null `name`, it is treated as a lead.

### 2.3 User preference model

Subscriber data collected by the frontend (`email`, `qualifications` free text, `country`, `industries[]`) is stored in Firestore via the `/api/v1/subscribe` endpoint. This data is **never read back** by the ingestion pipeline or any matching logic. There is no join between `users` and `companies` collections anywhere in the codebase.

---

## 3. Key AI Features

### 3.1 Company data ingestion pipeline

The core scheduled function runs every 12 hours via APScheduler:

```python
# api/index.py

def ingestions():
    daily_folder_path = join('data', 'daily')
    domains = []
    for file in os.listdir(daily_folder_path):
        if file.endswith('.gz'):
            gzip_file_path = os.path.join(daily_folder_path, file)
            with gzip.open(gzip_file_path, 'rt') as f:
                for line in f:
                    domains.append(line.strip())
    return domains

def get_company_enrichment(domain, kafka_logs_enabled: bool = True):
    url = os.getenv('ABSTRACT_API_COMPANY_ENRICHMENT_API_URL',
                    "https://companyenrichment.abstractapi.com/v1")
    api_key = os.getenv('ABSTRACT_API_COMPANY_ENRICHMENT_API_KEY', "")
    response = requests.get(f"{url}/?api_key={api_key}&domain={domain}")
    response.raise_for_status()
    response_data = response.json()

    if kafka_logs_enabled and response_data['name']:
        decoded_json = ast.literal_eval(response.content.decode("utf-8"))
        producer = KafkaMessageProducer()
        producer.produce_message('company-data', decoded_json)

    return response_data

def ingest_daily_company_data():
    with app.app_context():
        companies = []
        for domain in ingestions():
            try:
                company_data = get_company_enrichment(domain, kafka_logs_enabled=False)
                if company_data:
                    company = Company(data=company_data)
                    company.save()
                    companies.append(company.data)
            except Exception as e:
                app.logger.exception(f"Error processing {domain}: {e}")
                continue
        return companies

scheduler = BackgroundScheduler()
scheduler.add_job(func=ingest_daily_company_data, trigger="interval", hours=12)
scheduler.start()
```

Key observations:
- No rate-limit handling on Abstract API calls — the loop fires one synchronous HTTP request per domain with no backoff, sleep, or batching.
- The `kafka_logs_enabled=False` flag during scheduled ingestion means Kafka is bypassed entirely; only Firestore + AstraDB receive data.
- Silent `continue` on exceptions means failed domains are silently dropped with no retry queue.

### 3.2 Domain registration monitoring (NRD ingestion)

The NRD source lives in the private `IsaacBell/nrd-poll` repository. Its contents are never visible, but the sync workflow reveals the contract: it produces `today_new.gz` and `yesterday_new.gz` — plain text lists of newly registered domains, one per line, compressed with gzip.

```yaml
# .github/workflows/daily_domain_updates.yml (excerpt)
on:
  schedule:
    - cron: '0 */12 * * *'

- name: Sync data
  run: |
    cp "$SYNC_DIR/today_new.gz" "$DAILY_DIR/today_new.gz"
    cp "$SYNC_DIR/yesterday_new.gz" "$DAILY_DIR/yesterday_new.gz"
    git commit -m "Sync data from nrd-poll repository"
    git push
```

The gzip files are committed directly into the repository (`data/daily/`). This is a significant design choice: the pipeline's "live data" is a git-committed binary blob, not a streaming source. This means domain processing latency is at minimum 12 hours (cron interval) plus however long the Flask scheduler takes to process all domains.

### 3.3 Vector embedding storage

The most technically interesting AI component is the SpaCy-powered embedding in `AstraDBClient.insert()`:

```python
# api/db.py

import spacy
nlp = spacy.load("en_core_web_md")

def insert(self, collection, data):
    tmp_datastring = json.dumps(data)
    vector_embedding = nlp(tmp_datastring)
    current_app.logger.info('Vector embedding created for company record')
    data['$vector'] = [float(component) for component in vector_embedding.vector]

    collection = self.client.collection(collection_name=collection)
    return collection.insert_one(data)
```

The entire company JSON record is serialized to a string and fed to SpaCy's `en_core_web_md` pipeline. SpaCy's document vector is the average of individual token vectors in the model's 300-dimensional space. This approach:
- Treats JSON keys and values as unstructured text, which the average-of-tokens approach handles poorly for structured data
- Produces a 300-d vector, but the Pinecone index (dead code) is configured for 1536 dimensions (OpenAI ada-002 size), indicating a mismatch was never resolved
- Generates embeddings at write time with no caching, meaning every company insert incurs a synchronous SpaCy inference call

### 3.4 Site summarization

```python
# api/site_summarizer.py

class SiteSummarizer:
    def __init__(self, api_key):
        self.client = OpenAI(api_key=api_key)

    def scrape_and_summarize(self, url, visited=None):
        if visited is None:
            visited = set()
        if url in visited:
            return None
        visited.add(url)

        response = requests.get(url)
        soup = BeautifulSoup(response.text, "html.parser")
        text = "".join(p.get_text() + "\n" for p in soup.find_all("p")).strip()

        response = self.client.chat.completions.create(
            model="gpt-3.5",       # bug: correct model ID is "gpt-3.5-turbo"
            messages=[{"role": "user", "content": f"Please summarize the following text:\n\n{text}"}],
            max_tokens=100,
            temperature=0.7,
            request_timeout=15
        )
        summary = response.choices[0].message.content.strip()

        # Recursively crawl internal links
        for link in soup.find_all("a"):
            href = link.get("href")
            if href and not href.startswith("http"):
                internal_url = urljoin(url, href)
                self.scrape_and_summarize(internal_url, visited)

        return {"url": url, "summary": summary, "internal_summaries": summaries}
```

The summarizer is exposed as `POST /api/v1/crawl` but is never called by the ingestion pipeline. It is a standalone enrichment endpoint that a caller can invoke on demand. Known bugs: the model name `"gpt-3.5"` is invalid (should be `"gpt-3.5-turbo"`), and `summaries` is referenced before assignment on the return line.

### 3.5 Pinecone integration (dead code)

```python
# api/pinecone.py

class Pinecone:
    def create_index(name, size):
        client.create_index(
            name=name,
            dimension=1536,    # OpenAI ada-002 dimensions
            metric="cosine",
            spec=ServerlessSpec(cloud="aws", region="us-west-2")
        )

    def upsert(idx, data):
        if idx not in existing_indexes:
            create_index(idx)
        index = client.Index(idx)
        return index.upsert(vectors=data, namespace="main")

    def query(idx, data, filter={}, n=10):
        index = client.Index(idx)
        return index.query(vector=data, filter=filter, top_k=n, include_metadata=True)
```

This class is imported nowhere and called nowhere. It represents an unfinished intent to add semantic search over company records using OpenAI embeddings. The dimension mismatch with the SpaCy 300-d embeddings in `db.py` confirms these were never integrated.

---

## 4. Data Pipeline

### 4.1 End-to-end daily ingestion flow

```
[Private repo: nrd-poll]
        |
        | produces today_new.gz / yesterday_new.gz (raw NRD domain list)
        |
        v
[GitHub Actions: daily_domain_updates.yml]
        | cron: every 12 hours
        | git push data/daily/*.gz to leads-db repo
        |
        v
[Flask APScheduler: ingest_daily_company_data()]
        | runs every 12 hours (independent of GH Actions schedule)
        | reads data/daily/*.gz line by line
        |
        v (per domain, synchronous HTTP, no batching)
[Abstract API: companyenrichment.abstractapi.com/v1]
        | returns: name, domain, country, industry, locality,
        |          linkedin_url, year_founded, employees_count
        |
        v
[Firebase Firestore]               [AstraDB (Cassandra)]
   companies collection              companies collection
   (primary store,                   (secondary store,
    CRUD source of truth)             vector-enabled via SpaCy 300-d)
        |
        v (CDC, streaming)
[Pulsar topic: persistent://leads/default/companies-cdc]
        |
        v
[Downstream consumers — not implemented in this repo]
```

### 4.2 Candidate identification and ranking

There is no ranking. All domains that resolve to a non-null company name from Abstract API are stored as candidates. The TypeScript `Company` interface defines the data shape:

```typescript
// types.ts
export interface Company {
  name?: string;
  domain: string;        // only required field
  country?: string;
  industry?: string;
  locality?: string;
  linkedin_url?: string;
  year_founded?: number;
  employees_count?: number;
}
```

AstraDB's native vector index is set up for cosine similarity queries, but no query path exists in the API that returns leads sorted by relevance to user preferences. The AstraDB TypeScript client (`libs/astraDb.ts`) only implements `insertOne` — no `find`, `findMany`, or vector search.

### 4.3 Kafka path (partially implemented)

When `get_company_enrichment()` is called directly via the HTTP endpoint (not the scheduler), it emits to Kafka topic `company-data`:

```python
decoded_json = ast.literal_eval(response.content.decode("utf-8"))
producer = KafkaMessageProducer()
producer.produce_message('company-data', decoded_json)
```

The Kafka producer uses SASL/SCRAM-SHA-256 authentication. The Kafka path is disabled during scheduled ingestion (`kafka_logs_enabled=False`). No consumers are defined in this repo.

---

## 5. Evaluation / Quality

### 5.1 Lead quality scoring

There is no lead quality scoring system. The only implicit quality filter is:

```python
if company_data:           # truthy check — non-null API response
    company = Company(data=company_data)
    company.save()
```

If Abstract API returns an empty `name` field, the Kafka message is suppressed, but the record is still saved to Firestore and AstraDB without that check in the scheduler path.

### 5.2 AI output quality measurement

None. There are no evals, no accuracy metrics, no confidence scores, no feedback loop, and no mechanism to measure whether the GPT-3.5 summarizations are correct or useful. The 100-token `max_tokens` cap on summaries makes them frequently truncated.

### 5.3 Enrichment data quality

Abstract API returns structured data with no validation layer. Fields like `employees_count` and `year_founded` are stored as-received with no range checks, deduplication, or cross-validation against other sources. The save logic in `company.py` wraps data in a nested structure on write (`doc_ref.set(self.data)`) but reads it back via `data['data']`, introducing a potential KeyError if a record was written through a different code path.

---

## 6. Rust/ML Relevance

### 6.1 Would this pattern work in Rust?

Yes, with meaningful improvements:

| Component | Python implementation | Rust equivalent |
|---|---|---|
| NRD ingestion | `gzip.open()` + string split | `flate2` + `BufReader` — substantially faster for large domain lists |
| HTTP enrichment | `requests.get()` synchronous loop | `reqwest` with `tokio::spawn` — parallel enrichment with bounded concurrency (`semaphore`) |
| SpaCy embeddings | Python SpaCy `en_core_web_md` (300-d mean pooling) | Candle with a quantized sentence-transformer (e.g. `all-MiniLM-L6-v2` at INT8) — 10-50x faster inference, no Python GIL |
| Vector storage | AstraDB `$vector` field via astrapy | `pgvector` on Neon with `drizzle-orm` — eliminates a separate managed vector DB |
| Kafka producer | `kafka-python-ng` | `rdkafka` (librdkafka bindings) — production-grade, battle-tested |
| Scheduler | APScheduler in-process | `tokio-cron-scheduler` or a dedicated worker binary |

The main architectural advantage of a Rust rewrite is eliminating the synchronous domain-by-domain HTTP loop. The current Python implementation processes domains sequentially; a Rust async pipeline with a bounded semaphore (e.g., 50 concurrent Abstract API calls) would process a list of 10,000 NRDs in roughly 200 seconds versus an estimated 2+ hours synchronously.

### 6.2 Cassandra vs PostgreSQL trade-offs

| Dimension | AstraDB (Cassandra) | Neon PostgreSQL |
|---|---|---|
| Write throughput | Very high, append-optimized, multi-region replication | Good, but single-writer on Neon serverless |
| Vector search | Native `$vector` field, cosine similarity | `pgvector` extension, competitive at <10M vectors |
| Ad-hoc queries | Limited — no joins, no aggregations across partitions | Full SQL, CTEs, window functions |
| CDC streaming | Native Pulsar CDC via Astra Streaming | `pg_logical` / `wal2json` or Sequin |
| Schema evolution | No schema enforcement (document model) | Strict schema via Drizzle migrations |
| Cost for prototype scale | Free tier generous | Neon free tier generous, scales to serverless |
| Operational complexity | Managed, but two separate stores (Cassandra + Firestore) needed | Single store covers all use cases |

For a B2B lead gen platform at prototype to mid-scale (under 5M company records), PostgreSQL with `pgvector` eliminates the dual-store complexity (Firestore for CRUD + Cassandra for vectors) while providing far richer query capabilities for filtering, ranking, and analytics.

---

## 7. Integration Points

### 7.1 REST API surface

All endpoints are unauthenticated except company/user GET routes which require `X-API-TOKEN` + `X-USER-EMAIL` headers:

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/heartbeat` | Health check |
| GET | `/api/v1/company-enrichment?domain=X` | Enrich a single domain on demand |
| GET/POST | `/api/v1/scrape` | Abstract API web scrape proxy |
| POST | `/api/v1/crawl` | GPT-3.5 site summarization |
| GET/POST | `/api/v1/_system/sync` | Trigger manual ingestion in background thread |
| GET | `/api/v1/companies/<id>` | Fetch company by Firestore ID |
| GET | `/api/v1/companies_by_name/<name>` | Fetch by name |
| POST | `/api/v1/companies` | Insert company manually |
| GET | `/api/v1/users/<id>` | Fetch user |
| POST | `/api/v1/subscribe` | Create subscriber |
| GET | `/api/v1/experimental/notion-subscribe` | Add subscriber to Notion DB |

A Postman collection (`Leads DB.postman_collection.json`) is included in the repo root.

### 7.2 Event streaming

- **Kafka topic `company-data`**: receives enriched company JSON on every manual enrichment call
- **Pulsar topic `persistent://leads/default/companies-cdc`**: receives company data on every `stream_company_data()` call (method has a bug — `self.producer` is undefined; the method is never successfully called)

### 7.3 External services required

All credentials are in `.env` (an `.env.example` is committed, exposing what keys are needed):

```
ABSTRACT_API_COMPANY_ENRICHMENT_API_KEY
ABSTRACT_API_COMPANY_ENRICHMENT_API_URL
ABSTRACT_API_SCRAPE_API_KEY
ABSTRACT_API_SCRAPE_URL
PINECONE_API_KEY
PULSAR_STREAMING_API_TOKEN
ASTRA_DB_APPLICATION_TOKEN
ASTRA_DB_STREAMING_URL
ASTRA_DB_API_ENDPOINT
ASTRA_DB_ID
ASTRA_DB_REGION
NOTION_TOKEN
NOTION_DB_ID
OPENAI_API_KEY
KAFKA_BROKER / KAFKA_USERNAME / KAFKA_PASSWORD
MOESIF_APP_ID
FIREBASE_SERVICE_ACCOUNT_KEY (full JSON blob as env var)
```

---

## 8. Gaps / Weaknesses

### 8.1 No actual lead matching

The most fundamental gap: subscriber preferences (country, industries, free-text qualifications) are stored but **never matched against ingested companies**. The platform collects intent data from users but never acts on it. The weekly email feature is listed in the README as "85% complete" but no email-sending code exists in the repository.

### 8.2 Dual-store incoherence

The system uses both Firebase Firestore (primary) and AstraDB (secondary) for company storage, but they are not kept in sync. The `Company.save()` method writes to Firestore first, then attempts AstraDB in a try/except that silently retries with different arguments — meaning Firestore and AstraDB can hold inconsistent records. There is no reconciliation path.

### 8.3 NRD pipeline is a black box

The actual domain sourcing logic lives in the private `nrd-poll` repository. The quality, freshness, deduplication, and filtering of the NRD feed is entirely opaque. The gzip-file-committed-to-git approach means the "streaming" pipeline actually polls at 12-hour batch intervals with zero latency guarantees.

### 8.4 Production bugs

Confirmed bugs across the codebase:

| File | Bug | Impact |
|---|---|---|
| `api/db.py` | `stream_data()` references `self.producer` (undefined; parameter is `producer`) | Pulsar CDC never works |
| `api/db.py` | `find()` and `search_by_name()` missing `self` parameter | Methods uncallable as instance methods |
| `api/site_summarizer.py` | `model="gpt-3.5"` — invalid model ID | OpenAI API calls always fail |
| `api/site_summarizer.py` | `summaries` variable referenced before assignment | AttributeError on every crawl |
| `api/pinecone.py` | `__init__` calls `client = client()` (circular) | Pinecone class uninstantiable |
| `api/models/company.py` | `data['data']` key assumed on retrieval but `doc_ref.set(self.data)` on write | KeyError on get_by_id/get_by_name |
| `api/index.py` | Notion OAuth flow calls wrong endpoint (`/v1/oauth/databases` doesn't exist) | Notion subscribe always fails |
| `api/index.py` | Hardcoded personal email `isaacbell388@gmail.com` as fallback in Notion payload | Data leakage in production |

### 8.5 Security issues

- Firebase service account JSON is written to disk as `gcp_service_account.json` at startup — leaked to container filesystem
- No CORS policy on any endpoint
- API "auth" (`X-API-TOKEN`) provides only Moesif tracking, not actual access control — any token value is accepted
- `.env.example` was committed with what appear to be real API keys (the file analyser flagged this as actual credentials)
- OpenAI API key is passed to `SiteSummarizer` at module import time, meaning it is instantiated globally on every Flask worker startup

### 8.6 Scalability ceiling

The synchronous per-domain HTTP loop with no rate limiting or batching will hit Abstract API rate limits immediately on any realistic NRD list (daily NRD lists from zone files typically contain 50,000–150,000 domains). There is no queue, no backoff, and no throttle.

### 8.7 Open issues

- Issue #7 "Fix Next.js Issues" (opened April 2024, open/unresolved, author: IsaacBell) — the frontend is broken in some unspecified way.

---

## 9. Takeaways for a B2B Lead Gen Platform

### 9.1 Ideas worth adopting

**NRD-as-signal is a real alpha source.** Newly registered domains are an underused signal for identifying companies before they appear in directories. The pattern of monitoring zone files / NRD feeds daily and enriching them immediately is legitimate and worth implementing properly. The key improvement: stream domains into a queue (Kafka or PostgreSQL-backed job queue) rather than polling gzip files from git.

**SpaCy/embedding-at-write-time for semantic similarity.** Storing vector embeddings alongside company records at insert time — so that semantic queries can be served without a separate embedding step — is the right architectural intent. The execution (averaging over JSON-serialized text) is poor, but the pattern is correct. Replace SpaCy mean-pooling with a proper sentence-transformer (`all-MiniLM-L6-v2` or `bge-small-en-v1.5`) applied to a curated text field (e.g., company description), and use `pgvector` instead of a separate vector DB.

**Abstract API for enrichment is a reasonable starting point.** For a prototype, using a third-party enrichment API that resolves domain → structured company record is sensible. For production, complement with direct data sources: Common Crawl, LinkedIn scraping, Clearbit/Crunchbase API, or self-hosted web extraction.

**APScheduler for in-process scheduling.** For a simple prototype, embedding the scheduler in the Flask app is pragmatic. For production, extract it to a dedicated worker or use a proper job scheduler (Celery + Redis, or a cron-triggered Cloud Run job).

### 9.2 Ideas to avoid

**Dual-store (Firestore + Cassandra) for the same data.** This creates sync complexity with no benefit at prototype scale. A single PostgreSQL instance with `pgvector` handles CRUD, vector similarity, full-text search, and analytics in one place. Cassandra is only justified when you need multi-region writes at >100k TPS.

**Kafka as a logging sidecar.** The fire-and-forget Kafka emit with `kafka_logs_enabled=False` during scheduled ingestion shows the Kafka integration was never committed to. Either use Kafka as a first-class event bus (all writes go through it, consumers maintain the DB state) or drop it entirely. A half-implemented Kafka integration adds operational overhead with no benefit.

**Committing binary data files to git.** The gzip NRD files committed into `data/daily/` turn the git history into a data lake. This causes repo bloat, creates 12-hour latency windows, and ties ingestion to CI/CD. Use object storage (GCS, S3, R2) or a proper streaming source instead.

**SpaCy `en_core_web_md` for structured data embedding.** Average-of-token-vectors over a JSON string produces low-quality embeddings for structured company data. The resulting vector conflates key names (e.g., the word "name") with values, and is dominated by high-frequency tokens. Use a dedicated text encoder on a purpose-built description field.

### 9.3 Build upon

**Close the subscriber-to-company matching loop.** The most valuable addition to this architecture is a matching function that, at query time or as an async background job, computes similarity between a subscriber's preference vector and all company vectors in the DB, then filters by country and industry. With `pgvector`, this is a single SQL query:

```sql
SELECT c.*, (c.embedding <=> $1) AS distance
FROM companies c
WHERE c.country = ANY($2)
  AND c.industry = ANY($3)
ORDER BY distance
LIMIT 50;
```

**Add a confidence/quality score at enrichment time.** When Abstract API returns a company record, score its completeness: fields present, LinkedIn URL resolved, employee count in range, domain age (from WHOIS), etc. Use this score to prioritize which leads are surfaced first. This is a simple feature-engineered heuristic that LeadsDB entirely skips.

**Use LLM classification only where it adds value.** LeadsDB's use of GPT-3.5 for 100-token page summaries is the weakest AI application in the system — expensive, rate-limited, and the summaries are never used downstream. A better use of LLM calls is ICP scoring: given a company record, ask an LLM to score fit against a defined Ideal Customer Profile, with structured output (JSON schema enforcement). This is higher leverage than summarization.

**Build a proper feedback loop.** LeadsDB has zero mechanism for users to indicate whether a lead was relevant. Even a simple thumbs-up/down API endpoint that logs to a table, combined with periodic retraining of a lightweight classifier, would dramatically improve precision over time. This is the evaluation-first principle applied to lead quality.

**Replace the NRD-only source with a multi-signal approach.** NRDs catch companies at formation, but miss established companies entering new markets, companies raising funding, companies posting new job openings in target departments, etc. Combining NRDs with job board monitoring (Ashby, Lever, Greenhouse) and funding signals (Crunchbase) provides a much richer candidate universe.

---

## Summary Assessment

LeadsDB is an early-stage prototype that correctly identifies the core loop of a domain-ingestion-based B2B lead gen system but implements it with prototype-quality code that would require near-total rewrite for production use. Its most significant gap is not technical — it is that the subscriber preference model is collected but never acted upon. The AI components (SpaCy embeddings, GPT summarization, Pinecone) are either broken, disconnected from the pipeline, or applied to the wrong problem. The architecture demonstrates intent but not execution.

For a competing platform, the actionable lesson is: the NRD signal is real and worth building on, but do it with a proper async pipeline, single-store (pgvector on PostgreSQL), embedding-at-write-time using a sentence transformer, and a working preference-to-company matching query. Close the subscriber loop that LeadsDB left open.

---

## 10. Deep ML Analysis

### 10.1 SpaCy `en_core_web_md` vectors: what they actually are

`en_core_web_md` (v3.x) ships 20,000 unique 300-dimensional **GloVe** vectors trained on **Common Crawl**. This is confirmed in the model release notes: "English multi-task CNN trained on OntoNotes, with GloVe vectors trained on Common Crawl." It is not fastText (fastText uses subword character n-grams; GloVe uses global co-occurrence statistics over a fixed vocabulary). The 20k vocabulary is the key limitation: OOV tokens get a zero vector and do not contribute to the document mean, which quietly degrades results on company names, neologisms, and technical jargon — exactly the tokens most common in startup records.

The `en_core_web_lg` model has 685k vocabulary entries and the same 300-d GloVe space — but neither model was trained on business or company-name corpora, so domain terms ("SaaS", "fintech", "seed-stage", "ATS") are likely OOV or have poor representations.

### 10.2 Why averaging over JSON text is a poor embedding strategy

The `AstraDBClient.insert()` method serializes the entire company JSON to a string (`json.dumps(data)`) and passes it to `nlp()`. SpaCy's document vector is then the **mean pool of individual token vectors** (excluding zero vectors). This has several compounding problems:

**Key pollution.** JSON keys ("name", "industry", "country", "employees_count") become tokens with their own GloVe vectors. The word "name" is common in English with a specific semantic centroid; this dilutes the signal from the value tokens ("Acme Corp"). There is no weighting: a field name token and a value token contribute equally to the mean.

**Curse of dimensionality / stability of mean pooling.** The 2025 paper "Breaking the Curse of Dimensionality: On the Stability of Modern Vector Retrieval" (arXiv 2512.12458, Braverman et al., 2025) formally proves that **average pooling aggregation may destroy stability** — the property that small perturbations to the query do not radically alter its nearest neighbors. The paper proves stability is preserved under Chamfer distance but not under averaging; with only 32 effective dimensions of real signal (they show dimensionality as low as 32 already triggers the CoD), mean pooling over noisy structured text is unreliable. A company record with 8 fields has roughly 30-60 tokens after JSON serialization — well within the instability regime.

**Punctuation and bracket tokens.** JSON serialization produces tokens like `{`, `}`, `:`, `"` which GloVe maps to zero or near-zero vectors. These zero-vector tokens are skipped by SpaCy's mean pooling, but they are still counted in the token sequence length, affecting normalization.

**No semantic field weighting.** A company description field should contribute 10x more to the embedding than "year_founded". Mean pooling treats every field equally.

### 10.3 AstraDB `$vector` field: Cassandra-backed vector search via JVector

AstraDB's `$vector` field support was introduced in **Apache Cassandra 5.0** (GA October 2024) via the **Storage-Attached Index (SAI)** extension. The underlying algorithm is **JVector** — DataStax's custom library that "merges the DiskANN and HNSW family trees, borrowing the hierarchical structure from HNSW and using Vamana (the algorithm behind DiskANN) within each layer."

Key architectural facts confirmed by DataStax engineering blog and the CEP-30 Cassandra Enhancement Proposal:

- **Non-blocking HNSW-family graph index** built in pure Java. DataStax built their own rather than use Lucene's HNSW implementation to avoid fine-grained locking bottlenecks.
- **Memory model:** Like HNSW, JVector requires the full graph in memory for optimal performance. DataStax's blog acknowledges this as a known downside of HNSW-family algorithms.
- **Benchmark claims (DataStax, 2024):** AstraDB with JVector is "about 10% faster than Pinecone for a static dataset and 8x to 15x faster while also indexing new data, while maintaining higher recall and precision." (Note: these are vendor-provided numbers, not independent benchmarks.)
- **F1 recall:** DataStax reports higher F1 (combined recall + precision) than pgvector's HNSW at comparable query latency for their internal benchmarks.

For pgvector comparison: pgvector 0.7+ also uses HNSW (not IVFFlat by default for approximate search). At <5M vectors — the entire addressable NRD universe for a small platform — pgvector's HNSW provides competitive recall (>0.95 at ef_search=100) with simpler operational overhead (single database). AstraDB's advantage is meaningful only at 100M+ vectors with write-heavy workloads where Cassandra's multi-region replication and compaction strategy outperform PostgreSQL's single-writer model.

**Critical mismatch in LeadsDB:** The SpaCy embeddings are 300-d but the Pinecone index is configured for 1536-d. The AstraDB vector dimension is inferred from the first inserted vector — so the 300-d embeddings go into AstraDB correctly, but the Pinecone index would require re-creating with dimension=300. This was never done; Pinecone is dead code.

### 10.4 GloVe 300-d vs OpenAI ada-002 1536-d: the trade-off in numbers

| Metric | GloVe Common Crawl 300-d | text-embedding-ada-002 1536-d |
|---|---|---|
| MTEB average score | ~40-45 (estimated, pre-MTEB era) | 60.99 |
| Dimensions | 300 | 1536 |
| Vocabulary | Fixed (2.2M in full GloVe; 20k in en_core_web_md) | BPE tokenizer, no OOV |
| OOV handling | Zero vector | Subword tokens always covered |
| Cost per embedding | Free (local) | $0.10 / 1M tokens (~$0.0001 per company record) |
| Inference latency | ~1ms (CPU) | ~50ms (API round trip) |
| Domain adaptation | None (general English) | None (general English) |
| Context window | Document mean (no position) | 8,191 tokens, positional attention |

On the MTEB leaderboard, newer open-source models like `bge-small-en-v1.5` (384-d) score higher than ada-002 at a fraction of the cost. `all-MiniLM-L6-v2` (384-d, 22M parameters) achieves ~14.7ms inference per 1K tokens on CPU — suitable for synchronous embedding at insert time. Both outperform GloVe on downstream retrieval tasks. The 300-d GloVe in en_core_web_md is the lowest-quality option among all reasonable choices.

### 10.5 NRD as a business signal: what the data shows

Daily NRD feeds (e.g., WhoisXML API NRD2) average **250,000+ newly added domains** per day across 7,596+ gTLDs and ccTLDs. After filtering to business-plausible TLDs (.com, .io, .co, country codes) and excluding obvious spam/phishing patterns (DGA-like strings, excessive hyphens), the addressable startup signal is roughly 2-5% of the daily volume, or 5,000-12,500 domains per day. The enrichment cost via Abstract API at ~$0.01/call would be $50-125/day — non-trivial at this scale.

NRD data quality varies significantly by source:
- **Zone file access** (direct from registries like Verisign for .com/.net): most authoritative, near-real-time, but requires registry agreements
- **WHOIS aggregation** (WhoisXML API NRD2): 89% coverage growth in 2023, ~250k domains/day, includes WHOIS enrichment on premium tiers
- **Certificate transparency logs** (crt.sh): captures domain activation (TLS cert issuance), not registration — 1-7 day lag but filters to actively-deployed domains
- **DNS passive monitoring**: captures first DNS resolution, correlates strongly with actual business launch

The cybersecurity literature on NRDs (Palo Alto, Stamus Networks) focuses on malicious use rather than startup detection, but the same temporal signal applies: domain registration patterns correlate with organizational formation events.

### 10.6 What is actually ML vs. rules/heuristics

| Component | ML? | What it actually is |
|---|---|---|
| SpaCy `en_core_web_md` vectors | Yes — pre-trained GloVe embeddings | Static 300-d GloVe lookup; no training in LeadsDB |
| AstraDB vector similarity search | Yes — ANN graph index (JVector/HNSW) | Approximate nearest neighbor; the index is ML infrastructure, not a model |
| OpenAI GPT-3.5 summarization | Yes — transformer LM | Used for unstructured text summarization; not trained on lead data |
| Pinecone index | Dead code | Would be ANN over ada-002 embeddings if wired up |
| NRD ingestion pipeline | No | Pure rule: domain → Abstract API → save |
| Lead quality threshold (`if company_data:`) | No | Boolean null check |
| Subscriber matching | Not implemented | Would be cosine similarity + SQL filter |

**Bottom line:** LeadsDB contains exactly zero trained ML models. All "AI" components are either pre-trained general models (GloVe, GPT-3.5) applied without fine-tuning, or infrastructure (ANN index) that stores pre-computed vectors. No model is trained on lead data, no scoring function is learned, and no evaluation metrics exist.

---

## 11. Research Papers & Prior Art

| Paper | Authors | Year | Venue | Relevance | Key Finding |
|-------|---------|------|-------|-----------|-------------|
| GloVe: Global Vectors for Word Representation | Pennington, Socher, Manning | 2014 | EMNLP | Exact embedding method used in en_core_web_md | Co-occurrence matrix factorization over Common Crawl; fixed vocabulary, no subword |
| Breaking the Curse of Dimensionality: On the Stability of Modern Vector Retrieval | Braverman et al. | 2025 | arXiv 2512.12458 | Explains why mean pooling over JSON text destroys retrieval stability | Proves Chamfer distance preserves stability; average pooling destroys it; CoD activates at d>=32 |
| COMPARATIVE ANALYSIS OF WORD EMBEDDINGS FOR CAPTURING WORD SIMILARITIES | Almeida, Xexéo | 2020 | arXiv 2005.03812 | GloVe vs Word2Vec vs FastText head-to-head | FastText+SIF outperforms GloVe on semantic similarity; GloVe worse than Word2Vec/FastText on downstream tasks |
| Sentence-BERT: Sentence Embeddings using Siamese BERT-Networks | Reimers, Gurevych | 2019 | EMNLP | Alternative to GloVe mean pooling for company description encoding | Contrastive training produces sentence-level embeddings that outperform mean-pooled GloVe by 15-30 points on STS benchmarks |
| CEP-30: Approximate Nearest Neighbor Vector Search via Storage-Attached Indexes | Apache Cassandra Engineering | 2023 | Apache Cassandra Wiki | Technical spec for AstraDB's `$vector` field implementation | HNSW-family JVector algorithm; non-blocking concurrent index updates; higher recall than Lucene HNSW at write-heavy workloads |
| DiskANN: Fast Accurate Billion-point Nearest Neighbor Search on a Single Node | Subramanya et al. | 2019 | NeurIPS | JVector (AstraDB's ANN algorithm) borrows Vamana from this paper | Vamana graph algorithm achieves high recall with SSD-backed storage; JVector merges this with HNSW hierarchical structure |
| The relevance of lead prioritization: a B2B lead scoring model based on machine learning | Caro et al. | 2025 | Frontiers in AI | Benchmarks 15 classification algorithms on real B2B CRM data | Gradient Boosting Classifier achieves 98.39% accuracy; Random Forest consistently top-3 across studies |
| Newly Registered Domains (NRD2) Coverage Analysis | WhoisXML API | 2024 | CircleID | NRD data quality baseline | 250K+ domains/day across 7,596+ TLDs; 89% coverage growth in 2023; automatic anomaly detection |

**Annotation by paper:**

**GloVe (2014):** The exact algorithm behind en_core_web_md's vectors. The model vocabulary is 20k (md model) vs 685k (lg model). For B2B company names, the md model will have high OOV rates. Replacing with a domain-adapted embedding (e.g., fine-tuning all-MiniLM-L6-v2 on company description pairs) would dramatically improve retrieval quality.

**arXiv 2512.12458 (2025):** Directly contradicts the design choice in LeadsDB. Mean pooling over a JSON string violates the stability property required for reliable ANN retrieval. The theoretical guarantee only holds under Chamfer distance; using the mean as the AstraDB `$vector` means that two structurally similar companies (same industry, similar employee counts) may appear far apart in vector space due to JSON key token contamination.

**arXiv 2005.03812 (2020):** Empirically confirms GloVe's weaknesses. FastText's character-level subword modeling handles OOV tokens (startup names, neologisms) that GloVe maps to zero. For a lead gen platform encoding company records, fastText-based embeddings or a subword-tokenized sentence transformer would outperform GloVe on company name similarity tasks.

**SBERT (2019):** The correct replacement architecture. SBERT with mean pooling over a `[company_name] [industry] [description]` text field would produce 768-d embeddings with proper sentence-level semantics. The `all-MiniLM-L6-v2` distillation runs at ~14.7ms per 1K tokens on CPU — fast enough for synchronous embedding at insert time at NRD scale.

**CEP-30 / DiskANN:** JVector's hybrid architecture (HNSW layers + Vamana intra-layer algorithm) explains why AstraDB performs better than vanilla HNSW at mixed read/write workloads. However, for a platform under 10M company records, pgvector's HNSW implementation (added in v0.5.0, 2023) provides >95% recall at comparable latency with no separate infrastructure. The operational simplicity argument for pgvector is compelling at prototype scale.

**Frontiers in AI 2025:** The strongest evidence that a simple ML classifier (Gradient Boosting, Random Forest) on structured company features outperforms heuristic thresholds for lead prioritization. The feature set available at NRD ingestion time (domain age, company name tokens, country, industry, employee count, LinkedIn presence) is sufficient for a first-pass classifier trained on historical conversion data.
