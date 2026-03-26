# Scrapus Pipeline Security Analysis

Security model for the Scrapus local-first B2B lead generation pipeline. Covers
threat modeling, data privacy guarantees, input sanitization, crawling ethics,
model security, and access control. All findings reference the documented
architecture (Module 0-6 READMEs, SYNTHESIS.md).

---

## 1. Threat Model

### Attack Surface

| Surface | Entry Point | Risk Level | Notes |
|---------|-------------|------------|-------|
| Web crawling | aiohttp / Selenium fetching arbitrary URLs | High | Malicious HTML, JS payloads, zip bombs, infinite redirect chains |
| Prompt injection | Company names, fact text interpolated into LLM prompts | Medium | Attacker-controlled text on crawled pages flows into `build_prompt()` |
| SQLite injection | Any query using string formatting instead of parameterized `?` | Medium | Confirmed: all documented queries use `?` parameters (see Module 5 `assemble_lead_data()`, Module 3 merge operations) |
| Data exfiltration | OpenAI API calls (Option A) | Medium | Company name, industry, facts, people names sent to external API |
| Model poisoning | Malicious model weights loaded from disk | Low | PyTorch/ONNX deserialization can execute arbitrary code |
| Vector injection | Crafted embeddings to manipulate ANN search results | Low | Requires write access to LanceDB/ChromaDB on disk |

### Trust Boundaries

```
┌──────────────────────────────────────────────────────────┐
│  LOCAL MACHINE (trust boundary 1)                        │
│                                                          │
│  scrapus_data/  ─── SQLite, LanceDB, ChromaDB, models   │
│  Python process ─── asyncio + ProcessPoolExecutor        │
│                                                          │
│  ┌──────────────────────────────────┐                    │
│  │ Ollama (localhost:11434)         │ trust boundary 2   │
│  │ llama3.1:8b-instruct-q4_K_M     │                    │
│  └──────────────────────────────────┘                    │
│                                                          │
└──────────────────────────────────────────────────────────┘
         │                              │
         ▼                              ▼
  ┌──────────────┐            ┌──────────────────┐
  │ Open Internet │            │ OpenAI API       │
  │ (crawl targets)│           │ (optional GPT-4) │
  │ trust boundary 3│          │ trust boundary 4 │
  └──────────────┘            └──────────────────┘
```

- **Boundary 1 (local machine):** All data at rest. OS file permissions are the
  only access control. No encryption at rest.
- **Boundary 2 (Ollama):** HTTP API on localhost. No authentication. If bound to
  0.0.0.0, any network peer can query the model and read prompts.
- **Boundary 3 (open internet):** Untrusted. Crawled pages may contain malicious
  content, honeypots, or adversarial text designed to poison NER/LLM outputs.
- **Boundary 4 (OpenAI API):** When GPT-4 is used, company data crosses this
  boundary (documented in Section 2).

### Threat Actors

| Actor | Motivation | Capability |
|-------|-----------|------------|
| Malicious website operator | Poison crawl data, waste resources | Serve adversarial HTML, infinite loops, deceptive entity names |
| Poisoned crawl target | Inject misleading business intelligence | Plant fake funding announcements, fabricated personnel |
| Local attacker (shared machine) | Data theft, model tampering | Read scrapus_data/ if permissions are lax, inject malicious model weights |
| Network attacker (if Ollama exposed) | Prompt extraction, model abuse | Query Ollama API, extract prompts containing company PII |

---

## 2. Data Privacy

### Local-First Guarantee

When using **Ollama (Option B)**, the pipeline is fully offline after initial
model download. Zero data leaves the local machine:

- All crawled pages stored in `scrapus_data/chromadb/`
- All entities stored in `scrapus_data/scrapus.db` (SQLite)
- All vector embeddings stored in `scrapus_data/lancedb/`
- All model weights stored in `scrapus_data/models/`
- No telemetry, no analytics, no phone-home behavior

### When GPT-4 Is Used (Option A)

The following data is sent to the OpenAI API via `openai.chat.completions.create()`:

| Data Field | Source | Example |
|-----------|--------|---------|
| Company name | `companies.name` | "Acme Corp" |
| Industry | `companies.industry` | "cybersecurity" |
| Location | `companies.location` | "Berlin" |
| Founded year | `companies.founded_year` | 2019 |
| Employee count | `companies.employee_count` | 150 |
| Key people (names + roles) | `persons.name`, `persons.role` | "Jane Doe (CTO)" |
| Fact text | `company_facts.fact_text` | "$10M Series A raised" |
| Match reasons | `lead_explanations.top_factors` | "AI focus, team growth" |
| Source snippets | ChromaDB `page_documents` (top-5 reranked) | Crawled page excerpts |

The full prompt (system + few-shot exemplars + user prompt with company data) is
transmitted. OpenAI's data retention policy applies. For GDPR compliance, this
means company and personnel data may be processed outside the EU.

**Mitigation:** Default to Ollama for all report generation. Only use GPT-4 when
explicitly opted in via configuration. Log which reports were generated with
which backend in the `lead_reports.model_used` column.

### GDPR Considerations

The pipeline extracts and stores PERSON entities:

| Table | PII Fields | Purpose |
|-------|-----------|---------|
| `persons` | `name`, `role` | Key people linked to companies |
| `companies` | `name`, `location` | Company identity |
| `company_facts` | `fact_text` | May contain person names, roles, quotes |
| `edges` | `source_id`, `target_id` | Person-company relationships |
| `lead_reports` | `summary_text`, `prompt_text` | Generated text containing person names |
| ChromaDB `page_documents` | Full crawled page text | Raw text with embedded PII |
| LanceDB `entity_embeddings` | 768-dim Siamese vectors | Derived from entity text (not directly reversible) |

**Right to Erasure Procedure:**

To fully erase a person's data, all of the following must be purged:

```sql
-- 1. Delete person record
DELETE FROM persons WHERE name = :person_name;

-- 2. Delete edges referencing the person
DELETE FROM edges
WHERE (source_type = 'person' AND source_id = :person_id)
   OR (target_type = 'person' AND target_id = :person_id);

-- 3. Delete facts mentioning the person (requires text search)
DELETE FROM company_facts
WHERE fact_text LIKE '%' || :person_name || '%';

-- 4. Delete reports containing the person
DELETE FROM lead_reports
WHERE summary_text LIKE '%' || :person_name || '%'
   OR prompt_text LIKE '%' || :person_name || '%';
```

```python
# 5. Delete from ChromaDB (requires scanning documents)
collection = chroma_client.get_collection("page_documents")
results = collection.get(where_document={"$contains": person_name})
if results["ids"]:
    collection.delete(ids=results["ids"])

# 6. Delete from LanceDB (entity embeddings linked by person_id)
tbl = lance_db.open_table("entity_embeddings")
tbl.delete(f"person_id = {person_id}")
```

**Note:** LanceDB deletion requires compaction afterward to reclaim space.
ChromaDB deletion is immediate but requires a collection scan. Neither supports
transactional deletion across stores -- execute all steps in sequence and verify.

### Data Retention

The pipeline has **no automatic data expiration**. Recommended retention policy:

| Data Type | Recommended Retention | Rationale |
|-----------|----------------------|-----------|
| Raw crawled pages (ChromaDB) | 90 days | Stale web content; source URLs may change |
| Entity records (SQLite) | Indefinite | Core business intelligence |
| Lead reports (SQLite) | 1 year | Reports lose relevance as companies evolve |
| Vector embeddings (LanceDB) | Matches parent record | Delete when source entity is deleted |
| Model weights | Until replaced | Keep only active model version |
| RL replay buffer (LanceDB) | 30 days | Training data for DQN; becomes stale |

### PII Handling

- Names, locations, roles stored in SQLite as plaintext
- No encryption at rest by default (SQLite does not support it natively)
- **Mitigation for sensitive deployments:** Use SQLite Encryption Extension (SEE)
  or full-disk encryption (FileVault on macOS, LUKS on Linux)

---

## 3. Input Sanitization

### HTML Parsing

Trafilatura handles HTML-to-text extraction, which strips most XSS vectors
(script tags, event handlers, iframes). However:

- **Raw HTML is not stored.** Trafilatura output (cleaned text) is stored in
  ChromaDB as 500-word chunks with 100-word overlap.
- **Risk:** If trafilatura is bypassed or a future module stores raw HTML, XSS
  vectors could persist in the database.
- **Selenium risk:** Headless browser execution of JavaScript on crawled pages.
  Malicious JS could attempt local file access, crypto mining, or browser
  exploits. Run Selenium with `--no-sandbox` disabled and `--disable-gpu`.

### Prompt Injection Defense

Company names and fact text are sanitized before interpolation into LLM prompts
via `sanitize_input()` (documented in Module 5):

```python
def sanitize_input(text: str, max_length: int = 500) -> str:
    # Strip control characters (\x00-\x1f, \x7f-\x9f)
    cleaned = re.sub(r'[\x00-\x1f\x7f-\x9f]', '', text)
    # Truncate to 500 characters
    cleaned = cleaned[:max_length]
    # Block known prompt-override patterns
    dangerous = ['ignore previous', 'system:', '<|im_start|>', '<|im_end|>',
                 'you are now', 'forget your instructions']
    for pattern in dangerous:
        if pattern.lower() in cleaned.lower():
            cleaned = cleaned.replace(pattern, '[REDACTED]')
    return cleaned
```

| Defense Layer | Implementation | Coverage |
|--------------|---------------|----------|
| Control char stripping | `re.sub(r'[\x00-\x1f\x7f-\x9f]', '', text)` | Removes null bytes, escape sequences |
| Length limit | `text[:500]` per field | Prevents prompt overflow |
| Override pattern rejection | Blocklist of 6 known injection phrases | Catches naive injection attempts |

**Known gaps:**
- Blocklist is not exhaustive. Obfuscated injections (Unicode homoglyphs,
  zero-width characters, base64-encoded instructions) are not caught.
- No structural separation between user-controlled content and prompt
  instructions (e.g., no XML tagging or delimiter-based isolation).
- **Recommendation:** Wrap user-controlled content in explicit delimiters:
  `<company_data>...</company_data>` and instruct the model to only use data
  within those tags.

### SQL Injection

All documented SQL queries use parameterized statements:

```python
# Module 5 -- assemble_lead_data()
conn.execute("SELECT * FROM companies WHERE id = ?", (company_id,))
conn.execute("SELECT fact_type, fact_text FROM company_facts WHERE company_id = ?", (company_id,))
conn.execute("SELECT name, role FROM persons WHERE company_id = ?", (company_id,))

# Module 3 -- entity merge
"UPDATE edges SET source_id = :target_id WHERE source_id = :source_id"
"DELETE FROM companies WHERE id = :source_id"
```

No string-formatted SQL was found in the documented codebase. The parameterized
pattern is consistent across Modules 3 and 5.

### LanceDB / ChromaDB Input Validation

- **LanceDB:** Vectors are generated by the pipeline's own models (Siamese
  128-dim, sentence-transformer 384-dim, lead profiles 512-dim). External input
  does not directly write vectors.
- **ChromaDB:** Document text is trafilatura output (already sanitized).
  Embeddings are computed internally.
- **Risk:** If an attacker modifies files in `scrapus_data/lancedb/` or
  `scrapus_data/chromadb/` directly, they can poison ANN search results.
  Mitigated by OS file permissions (Section 6).

---

## 4. Crawling Ethics

### robots.txt Compliance

The crawler identifies as `ScrapusBot` and respects robots.txt directives:

1. Fetch `https://{domain}/robots.txt` before crawling any domain
2. Look for `User-Agent: ScrapusBot` block first (case-insensitive)
3. Fall back to `User-Agent: *` block if no ScrapusBot-specific rules exist
4. Respect `Disallow`, `Allow`, and `Crawl-delay` directives from the matched block

**Known gap:** robots.txt is currently cached forever. A 24-hour TTL is needed
so the crawler picks up rule changes (documented as production gap in Module 1).

### Rate Limiting

| Mechanism | Implementation | Default |
|-----------|---------------|---------|
| Per-domain delay | Parsed from `robots.txt` `Crawl-delay` | 2 seconds if unspecified |
| Adaptive backoff | `base_delay * (1 + failure_rate * 5)` when failure > 10% | Scales with error rate |
| HTTP 429/503 backoff | Exponential: 1s, 2s, 4s, 8s... | Caps at reasonable maximum |
| Concurrent domains | MAB scheduler with UCB1 | Distributes load across domains |

### User-Agent Identification

```
User-Agent: ScrapusBot/1.0 (+https://nomadically.work/scrapus)
```

Site operators can set ScrapusBot-specific rules (tighter Crawl-delay, additional
Disallow paths) without affecting other bots.

### Ethical Boundaries

- No credential stuffing or authentication bypass
- No CAPTCHA solving (CAPTCHA pages are detected and skipped; CAPTCHA frequency
  is tracked as a domain feature for the DQN policy)
- Respect for `nofollow` / `noindex` meta tags
- Seed URLs sourced from public search APIs (Bing/Google), not private databases
- No scraping of login-protected content

---

## 5. Model Security

### Model Storage

All model weights are stored locally in `scrapus_data/models/`:

| Model | Location | Size | Format |
|-------|----------|------|--------|
| BERT NER (fine-tuned) | `models/bert-ner/` | ~440 MB | HuggingFace Transformers (safetensors preferred) |
| DQN policy network | `models/dqn/` | ~5-10 MB | PyTorch state_dict |
| Siamese network | `models/siamese/` | ~50-100 MB | PyTorch state_dict |
| XGBoost ensemble | `models/xgboost/` | ~5-20 MB | XGBoost binary / JSON |
| Logistic Regression | `models/logreg/` | ~1 MB | scikit-learn (pickle) |
| Random Forest | `models/rf/` | ~10-50 MB | scikit-learn (pickle) |
| Local LLM | System-managed (Ollama) | ~4 GB | GGUF (llama.cpp) |

### Pickle Deserialization Risk

scikit-learn models (LogReg, Random Forest) and potentially PyTorch checkpoints
use Python's `pickle` protocol for serialization. **Pickle can execute arbitrary
code on load.** This means:

- A tampered `models/logreg/model.pkl` or `models/rf/model.pkl` file could run
  arbitrary Python when loaded via `pickle.load()` or `joblib.load()`
- PyTorch `torch.load()` also uses pickle by default (mitigated in PyTorch 2.6+
  with `weights_only=True`)

**Mitigations:**
- Only load models from trusted sources (your own training runs)
- Prefer `safetensors` format for transformer models (no code execution on load)
- Use `torch.load(..., weights_only=True)` for PyTorch checkpoints
- Use XGBoost JSON format instead of pickle where possible
- Verify file checksums before loading if models are transferred between machines
- Never download model files from untrusted URLs at runtime

### Ollama Security

- Ollama runs on `localhost:11434` (127.0.0.1) by default
- No authentication on the Ollama HTTP API
- Model files managed by Ollama's own pull mechanism (SHA256 verified)
- **Critical:** If `OLLAMA_HOST` is set to `0.0.0.0:11434`, any device on the
  network can query models, extract prompts, and abuse compute resources

---

## 6. Access Control

### Single-User Model

Scrapus is designed as a single-user, single-machine system. There is no
built-in authentication, authorization, or multi-tenancy.

### File Permissions

```bash
# Set owner-only access on all data
chmod 700 scrapus_data/
chmod 600 scrapus_data/scrapus.db
chmod 600 scrapus_data/scrapus.db-wal
chmod 600 scrapus_data/scrapus.db-shm

# Models should also be owner-only (prevent tampering)
chmod -R 700 scrapus_data/models/
```

### SQLite Access Control

SQLite has no built-in authentication. Anyone who can read the `.db` file can
read all data. Anyone who can write to it can modify or delete records.

- **Mitigation:** OS file permissions (chmod 600)
- **For shared machines:** Full-disk encryption + separate user account

### Network Exposure Checklist

| Service | Default Bind | Safe? | Action If Exposed |
|---------|-------------|-------|-------------------|
| Ollama | `127.0.0.1:11434` | Yes | Never bind to `0.0.0.0` unless behind authenticated reverse proxy |
| SQLite | File-based (no network) | Yes | N/A |
| LanceDB | File-based (no network) | Yes | N/A |
| ChromaDB | File-based (PersistentClient) | Yes | Do not use ChromaDB's HTTP server mode in production |
| aiohttp crawler | Outbound only | Yes | No inbound listening |

---

## 7. Security Checklist

### Pre-Deployment

- [ ] All SQL queries use parameterized statements (`?` or `:named` placeholders) -- no string formatting
- [ ] `sanitize_input()` applied to all user-controlled text before LLM prompt interpolation
- [ ] Ollama bound to `127.0.0.1:11434` only (verify `OLLAMA_HOST` is not set to `0.0.0.0`)
- [ ] `scrapus_data/` permissions set to `700` (owner-only read/write/execute)
- [ ] `scrapus_data/scrapus.db` permissions set to `600`
- [ ] No API keys in source code (OpenAI key via `OPENAI_API_KEY` env var only)
- [ ] `robots.txt` respected for all crawled domains
- [ ] GDPR erasure procedure documented and tested (Section 2)
- [ ] Model files sourced from trusted training runs only (no untrusted pickle files)
- [ ] PyTorch models loaded with `weights_only=True` where supported
- [ ] Selenium running with sandboxing enabled (no `--no-sandbox` flag)

### Operational

- [ ] robots.txt cache has TTL (currently cached forever -- known gap)
- [ ] Log rotation configured for crawl logs
- [ ] Backup strategy implemented (Module 0 documents `sqlite3 .backup` + `cp -r`)
- [ ] Data retention policy enforced (no automatic expiration exists)
- [ ] Monitor Ollama process for unexpected network binding changes
- [ ] Verify no `.env` files or API keys committed to version control

### When Using GPT-4 (Option A)

- [ ] Users informed that company data (names, people, facts) leaves the local machine
- [ ] `lead_reports.model_used` column tracks which backend generated each report
- [ ] GDPR Data Processing Agreement (DPA) in place with OpenAI if processing EU data
- [ ] Consider data minimization: strip person names from prompts if not essential

---

## 8. Incident Response

### Scenario: Crawled a Malicious Page

**Indicators:** Selenium crash, unexpectedly large page content (>10 MB),
infinite redirect loop, high CPU from JavaScript execution.

**Response:**
1. Kill the crawl process immediately
2. Check `scrapus_data/scrapus.db` for the offending URL:
   ```sql
   SELECT * FROM pages ORDER BY crawl_date DESC LIMIT 10;
   ```
3. Delete the page and any entities extracted from it:
   ```sql
   DELETE FROM company_facts WHERE source_url = :malicious_url;
   DELETE FROM pages WHERE url = :malicious_url;
   ```
4. Purge from ChromaDB:
   ```python
   collection.delete(where={"source_url": malicious_url})
   ```
5. Add the domain to a crawl blocklist
6. Review Selenium browser profile for persistence (cookies, local storage)

### Scenario: LLM Generates Harmful or Fabricated Content

**Indicators:** Hallucination check flags >50% of claims as unsupported,
generated content contains defamatory statements, confidence score near 1.0 with
weak evidence.

**Response:**
1. Quarantine the report (do not distribute)
2. Check `lead_reports.validation_json` for the validation pipeline results
3. Review source facts in `company_facts` for the company -- were they poisoned
   by a malicious crawl target?
4. If source facts are correct but LLM hallucinated: regenerate with lower
   temperature (0.1) or switch to the other backend (Ollama <-> GPT-4)
5. If source facts are poisoned: trace back to the crawled page, delete the
   entity chain, re-crawl from clean sources

### Scenario: Data Breach Suspected

**Indicators:** Unauthorized access to `scrapus_data/`, unexpected Ollama API
calls, modified model files.

**Response:**
1. Immediately revoke the `OPENAI_API_KEY` if GPT-4 was configured
2. Stop the Ollama process: `ollama stop`
3. Check file modification times:
   ```bash
   find scrapus_data/ -mtime -1 -type f
   ```
4. Compare model file checksums against known-good values
5. If model files were tampered with: do not load them -- restore from backup
6. Audit `lead_reports` for reports generated after the suspected breach time
7. If person data was exposed: initiate GDPR breach notification procedure
   (72-hour window under Article 33)
8. Rotate all credentials, re-download model weights from trusted sources

### Scenario: Ollama Accidentally Exposed to Network

**Indicators:** `OLLAMA_HOST=0.0.0.0:11434`, unexpected external connections.

**Response:**
1. Kill Ollama immediately: `pkill ollama`
2. Check access logs for external IP connections
3. Assume all prompts sent during the exposure window are compromised (they
   contain company names, facts, and personnel data)
4. Restart Ollama with default binding: `unset OLLAMA_HOST && ollama serve`
5. If sensitive data was in prompts: treat as data breach (see above)
