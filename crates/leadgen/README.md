# leadgen

B2B lead generation and enrichment engine — crawls company websites, extracts structured data via LLM, discovers/verifies email addresses, and scores leads against an Ideal Customer Profile (ICP).

## Architecture

```
Domain input → Crawl website → LLM extraction → Email discovery → Dedup → Scoring → Export
                    ↓                                    ↓
              Tantivy index                        SMTP verification
              (full-text search)                   (MX + RCPT TO)
```

## Modules

| Module | Description |
|--------|-------------|
| `db` | SQLite persistence (companies, contacts, email patterns, enrichment cache, lead scores) |
| `crawler` | HTTP fetcher with per-domain rate limiting + HTML content extraction |
| `llm` | Ollama/remote LLM integration for structured entity extraction |
| `email` | Email discovery, 9-pattern inference, MX checking, SMTP verification |
| `dedup` | Contact deduplication via Jaro-Winkler similarity + union-find clustering |
| `scoring` | ICP-based lead scoring: 85% fit + 15% recency, 6 weighted dimensions |
| `search` | Tantivy full-text search indexing with BM25 ranking |
| `jobs` | Background job runners (recrawl, reverify, discover emails, score all) |
| `api` | REST API via Axum |
| `outreach` | CSV export + LLM-generated lead summaries |

## CLI Commands

```bash
leadgen serve                   # Start REST API on :3000
leadgen enrich example.com      # Crawl and enrich a single domain
leadgen batch domains.txt       # Batch enrich from file
leadgen verify user@example.com # Verify single email address
leadgen score                   # Score all leads against ICP
leadgen top 20                  # Show top 20 scored leads
leadgen export leads.csv        # Export to CSV
```

## REST API

```
GET  /api/health                    Health check
GET  /api/search?q=...&limit=...    Full-text search
GET  /api/companies?limit=&offset=  List companies (paginated)
GET  /api/companies/{domain}        Get company by domain
GET  /api/contacts/{company_id}     List contacts by company
GET  /api/top-leads?limit=...       Top scored leads
GET  /api/export/csv                Download leads as CSV
POST /api/enrich                    Enrich single domain
POST /api/verify-email              Verify email (syntax + MX + SMTP)
POST /api/score-all                 Score all leads
POST /api/jobs/recrawl-stale        Recrawl old companies
POST /api/jobs/reverify             Reverify emails
POST /api/jobs/discover-emails      Discover missing emails
```

## Email Discovery Pipeline

1. **Pattern inference** — learn domain email format from known addresses (9 patterns: `first.last`, `flast`, `first`, `last.first`, `firstlast`, `first-last`, `f.last`, `lastf`, `first.l`)
2. **MX check** — DNS lookup with 1-hour TTL cache, detects provider (Google, Microsoft, Zoho, ProtonMail, etc.)
3. **SMTP verification** — RCPT TO probe with catch-all detection (tests fake email to distinguish real from catch-all domains)
4. **Validation** — syntax check, role-based address detection, disposable domain filtering

## Lead Scoring

Composite score = **85% ICP fit** + **15% recency**

**ICP fit dimensions (100 pts max):**

| Dimension | Weight | Matching |
|-----------|--------|----------|
| Industry | 25 | Target industry list |
| Employee count | 15 | Min/max range |
| Seniority | 25 | C-level/VP/Director/etc. |
| Department | 15 | Engineering/Product/etc. |
| Tech stack | 10 | Keyword overlap |
| Email verified | 5 | Boolean |

**Recency decay:** 0-7 days (100) → 8-14 (80) → 15-30 (60) → 31-90 (40) → 91-180 (20) → 180+ (5)

## Data Model

```sql
companies    — id, name, domain, industry, employee_count, funding_stage, tech_stack, location
contacts     — id, company_id, first_name, last_name, title, seniority, department, email, email_status
email_patterns — domain, pattern, confidence, sample_size
enrichment_cache — url, extracted_json, model, cached_at
lead_scores  — contact_id, icp_fit_score, intent_score, recency_score, composite_score
```

## Key Dependencies

- `sqlx` — async SQLite
- `tantivy` — full-text search
- `axum` + `tower-http` — REST API with CORS
- `scraper` — HTML parsing
- `hickory-resolver` — async DNS (MX lookups)
- `strsim` — Jaro-Winkler similarity

Standalone — no sibling crate dependencies. Uses Ollama for local LLM by default.
