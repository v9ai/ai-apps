# Real Estate AI Analyzer

AI-powered real estate investment analysis platform for Eastern European and UK markets. Paste a listing URL, get a full valuation report with comparables, investment metrics, quality scoring, and research-backed methodology.

## Architecture

```
Next.js 15 (React 19)          FastAPI (Python 3.12+)
port 3005                      port 8005
┌─────────────────────┐        ┌──────────────────────────────┐
│  /analyzer           │───────▶│  POST /analyze               │
│  /analyzer/batch     │        │  POST /analyze-batch         │
│  /dashboard          │        │  POST /predict/london        │
│  /portfolio          │        │  GET  /listings              │
│  /trends             │        │  GET  /health                │
│  /predict/london     │        └──────────┬───────────────────┘
└──────────┬──────────┘                    │
           │                    ┌──────────▼───────────────────┐
           │                    │  DeepSeek API (deepseek-chat)│
           │                    │  via pydantic-ai             │
           │                    └──────────────────────────────┘
           │
    ┌──────▼──────┐
    │  Neon        │  analysis_results, price_snapshots,
    │  PostgreSQL  │  watchlist, watchlist_alerts,
    │              │  market_references, valuation_config
    └─────────────┘
```

**Frontend**: Next.js with Radix UI Themes (dark, iris accent), Inter + JetBrains Mono fonts. No Tailwind.

**Backend**: FastAPI with a two-stage AI pipeline (extraction + valuation) powered by DeepSeek via pydantic-ai.

**Database**: Neon PostgreSQL (serverless), accessed by both the Next.js API routes (`@neondatabase/serverless`) and the Python backend (`psycopg` v3 async).

## Analysis Pipeline

```
Listing URL (999.md or imobiliare.ro)
  │
  ▼
Scraper ── HTTP fetch + BeautifulSoup ── site-specific parser
  │         (supports Russian, Romanian, English)
  ▼
Preprocessor ── language detection ── multilingual normalization
  │              (50+ regex patterns per language)
  ▼
Extractor Agent (DeepSeek) ── structured data extraction
  │  → ListingExtraction (price, size, rooms, floor, zone, condition, parking)
  ▼
Comparable Search ── 999.md __NEXT_DATA__ / imobiliare.ro HTML parse
  │  → top 6 scored comparables + zone statistics
  ▼
Valuator Agent (DeepSeek) ── investment analysis with:
  │  - dynamic market reference tables (from DB)
  │  - configurable hedonic adjustments (from DB)
  │  - comparable market data context
  │  → ValuationResult (verdict, scores, yields, breakeven, risks)
  ▼
Quality Gate ── rule-based deception/anomaly detection (<1ms)
Feature Classifier ── regex-based hedonic feature mapping
Research Citations ── maps results to backing academic papers
  │
  ▼
Neon PostgreSQL ── upsert listing + price snapshot (deduped)
```

## Features

### Single Listing Analysis (`/analyzer`)
- Paste a 999.md or imobiliare.ro URL
- Verdict (Undervalued / Fair / Overvalued) with recommendation (Strong Buy / Buy / Hold / Avoid)
- Score breakdown: Price, Location, Condition, Market (each 0-10)
- Investment metrics: rental yield, net yield, breakeven years, price-to-rent, appreciation estimate
- Comparable listings with zone price range visualization
- Price history timeline with change tracking
- Quality score with deception flags
- Research citations linking to methodology papers

### Batch Comparison (`/analyzer/batch`)
- Analyze up to 10 listings simultaneously
- Winner badges (Best Value, Best Investment, Cheapest/m2)
- Rankings table sorted by investment score
- Per-listing detail cards with opportunities/risks

### Market Dashboard (`/dashboard`)
- Filterable table of all analyzed listings (city, verdict, price range, rooms)
- Sortable by any column
- Color-coded deviation and score cells

### Portfolio Watchlist (`/portfolio`)
- Save listings to a personal watchlist
- Price-change and verdict-change alerts
- Portfolio summary stats (total value, avg deviation, verdict breakdown)

### Market Trends (`/trends`)
- Per-zone price bar charts with min/max indicators
- Verdict distribution donut chart
- Price histogram
- Top opportunities ranked by undervaluation
- Zone heatmap with investment score sorting

### London Price Predictor (`/predict/london`)
- Hedonic pricing model for any London postcode
- Form inputs: property type, bedrooms, size, floor, tenure, condition, EPC, amenities
- Borough-level market data embedded in agent prompt
- SDLT stamp duty calculation
- Score breakdown: Location, Transport, Size, Condition

## Python Modules

| Module | Purpose |
|---|---|
| `agent.py` | Two-stage AI pipeline (extraction + valuation) via pydantic-ai |
| `server.py` | FastAPI app with CORS, lifespan DB init |
| `models.py` | Pydantic models (ListingExtraction, ValuationResult, etc.) |
| `scraper.py` | Site-specific HTML parsers for 999.md and imobiliare.ro |
| `scraper_search.py` | 999.md comparable search (parses __NEXT_DATA__ JSON) |
| `scraper_search_ro.py` | imobiliare.ro comparable search with retry/backoff |
| `preprocessor.py` | Multilingual text normalization (RO/RU/EN) |
| `db.py` | PostgreSQL operations with additive migrations |
| `batch.py` | Concurrent multi-URL analysis (up to 10) |
| `portfolio.py` | Watchlist + price/verdict alerts |
| `trends.py` | Zone/city aggregation with PERCENTILE_CONT |
| `neighborhood.py` | Zone stage classification (emerging → premium → declining) |
| `poi.py` | OSM Nominatim geocoding + Overpass POI scoring |
| `market_data.py` | Dynamic reference price tables from accumulated data |
| `valuation_config.py` | DB-backed hedonic adjustment weights |
| `feature_classifier.py` | Regex-based feature impact classification |
| `quality.py` | Rule-based quality gate with deception flags |
| `research_citations.py` | Maps analysis results to academic papers |
| `predict_london.py` | UK property prediction agent with borough data |
| `config.py` | pydantic-settings from .env |

## Evaluation Suite

Uses **pytest** + **deepeval** (GEval with `deepseek-reasoner` as judge).

| Test File | Tier | Coverage |
|---|---|---|
| `test_formulas.py` | Offline | Pure math: deviation %, verdict thresholds, weighted scores, yields, breakeven |
| `test_prompt_builder.py` | Offline | Prompt construction, data quality bands, parking rendering |
| `test_parking.py` | Offline + GEval | Parking extraction accuracy (7 golden cases) |
| `test_comparables.py` | Offline + GEval | Scraper normalization, zone stats, comparable relevance |
| `test_extraction.py` | GEval + Integration | Extraction completeness/correctness, currency conversion (12 golden cases) |
| `test_valuation.py` | GEval | Reasoning quality, verdict accuracy, score consistency (25 golden cases) |
| `test_investment.py` | GEval | Investment score, rental yield, market context (12 golden cases) |

## Getting Started

### Prerequisites
- Node.js 18+ and pnpm
- Python 3.12+
- Neon PostgreSQL database
- DeepSeek API key

### Environment

**`analyzer/.env`** (Python backend):
```
DEEPSEEK_API_KEY=sk-...
DASHSCOPE_API_KEY=sk-...
DATABASE_URL=postgresql://...
```

**`.env.local`** (Next.js frontend):
```
DATABASE_URL=postgresql://...
NEXT_PUBLIC_ANALYZER_URL=http://localhost:8005
```

### Run

```sh
# Frontend (port 3005)
pnpm dev

# Python backend
cd analyzer
python -m venv .venv && source .venv/bin/activate
pip install -e .
uvicorn server:app --reload --port 8005

# Evals — offline (no API key needed)
cd analyzer
python run_all_evals.py --offline

# Evals — full GEval suite
DEEPSEEK_API_KEY=sk-... python run_all_evals.py --geval

# All evals
python run_all_evals.py
```

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, React 19, Radix UI Themes, react-markdown |
| Backend | FastAPI, pydantic-ai, BeautifulSoup, httpx |
| AI Model | DeepSeek (`deepseek-chat`) via OpenAI-compatible API |
| Database | Neon PostgreSQL (psycopg v3 + @neondatabase/serverless) |
| Evals | pytest, deepeval (GEval), pytest-asyncio |
| Scraping | httpx, BeautifulSoup + lxml, Nominatim, Overpass API |
