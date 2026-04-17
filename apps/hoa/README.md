# Humans of AI

A directory of 103 people shaping the AI industry — researchers, founders, builders, and infrastructure engineers — enriched with live data from GitHub, Hugging Face, Spotify, and arXiv. Deep research profiles are generated offline by a 20-agent LangGraph pipeline running local MLX inference on Apple Silicon.

**Live at [humansofai.space](https://humansofai.space)**

## Stack

- **Frontend** — Next.js 16 (Turbopack), React 19, PandaCSS
- **Data** — Static JSON: Spotify episodes, arXiv papers, enrichment profiles, research output
- **Enrichment** — Daily cron refreshing GitHub repos/stats and Hugging Face models per person
- **Research** — LangGraph + MLX local inference (Qwen2.5) generating bios, timelines, quotes, contributions, and interview questions — fully offline
- **Deployment** — Vercel with static generation and daily enrichment cron

## Pages

| Route | Description |
|-------|-------------|
| `/` | Homepage with category filter, search modal, and personality grid |
| `/person/[slug]` | Profile page — GitHub projects, HF models, tech stack, podcast episodes, papers, deep research |
| `/person/[slug]/questions` | Generated interview questions based on the person's work |
| `/stats` | Aggregate dashboard — total stars, downloads, language distribution, top repos, category breakdown |

## Project Structure

```
src/
├── app/
│   ├── page.tsx                     Homepage — filterable grid, search, hero
│   ├── person/[slug]/page.tsx       Profile — enriched data, episodes, research
│   ├── person/[slug]/questions/     Interview questions page
│   ├── stats/page.tsx               Aggregate stats dashboard
│   ├── api/                         REST endpoints + daily enrichment cron
│   └── _components/                 NavHeader, SearchModal, CategoryFilter, Footer, ...
└── lib/
    ├── personalities/               103 personalities across 7 categories + types
    ├── episodes.ts                  Spotify episode loader + filters
    ├── quotes.ts                    Curated quotes per person
    ├── enrichment/                  GitHub + HF enrichment JSON (per person)
    └── research/                    Generated research JSON (bios, timelines, questions)

backend/
├── research_pipeline.py             20-agent LangGraph research pipeline
├── question_generator.py            Interview question generation
├── spotify_podcast_search.py        Spotify + Chroma semantic search
├── timeline_enrichment.py           Timeline enrichment (GitHub, HF, web)
├── mlx_client.py                    Local LLM client (MLX + Qwen2.5, tool calling)
├── download_model.py                One-time model download
└── tests/                           deepeval + deterministic eval suite
```

## Categories

| Category | Count |
|----------|-------|
| Lab Leaders & Founders | 10 |
| Builders & Technical Leaders | 44 |
| Researchers & Thinkers | 20 |
| Podcast Hosts & AI Personalities | 3 |
| Rising Infrastructure & Product Leaders | 4 |
| AI Infrastructure & Inference | 15 |
| Vector Database Founders | 7 |

## Person Page Sections

Each `/person/[slug]` page renders conditionally based on available data:

| Section | Source |
|---------|--------|
| Profile hero (avatar, name, role, org) | `personalities/` |
| Open Source Projects (stars, forks, languages, topics) | GitHub API (enrichment cron) |
| AI Models (downloads, likes, pipeline tags) | Hugging Face API (enrichment cron) |
| Tech Stack (language bar) | GitHub API |
| Podcast Appearances | `spotify_episodes.json` |
| Research Papers | arXiv links from personality data |
| Deep Research (bio, timeline, contributions, quotes, sources) | `research/{slug}.json` |

## Development

```bash
pnpm dev          # Dev server on :3005 (Turbopack)
pnpm build        # Production build
pnpm validate     # Validate personality data
```

## Research Pipeline

### Setup (one-time)

```bash
python3 backend/download_model.py
# Or the smaller model:
python3 backend/download_model.py --model mlx-community/Qwen2.5-3B-Instruct-4bit
```

### Run

```bash
python3 backend/research_pipeline.py --slug harrison-chase

# Specific model:
python3 backend/research_pipeline.py --slug harrison-chase --model mlx-community/Qwen2.5-3B-Instruct-4bit

# Or via env:
export MLX_MODEL=mlx-community/Qwen2.5-3B-Instruct-4bit
python3 backend/research_pipeline.py --slug harrison-chase
```

The pipeline runs 20 agents in 3 phases:

1. **Intelligence Gathering** — web search, GitHub, arXiv, HuggingFace, podcasts, news, videos
2. **Deep Analysis** — biography, timeline, contributions, quotes, social, topics, competitive landscape
3. **Synthesis** — quality evaluation, executive summary, interview question generation

Output writes to `src/lib/research/{slug}.json`. All inference runs locally via Apple MLX — no API keys needed.

### Evals

```bash
cd backend && python3 -m pytest tests/ -v
```

Deterministic: identity anchors, forbidden domains, structure depth, arXiv paper counts, URL validity.
GEval: biography quality, research completeness, source attribution (local MLX model as judge).

## Environment

| Variable | Required | Description |
|----------|----------|-------------|
| `MLX_MODEL` | No | MLX model ID (default: `mlx-community/Qwen2.5-7B-Instruct-4bit`) |
| `GITHUB_TOKEN` | No | GitHub API token for higher rate limits during enrichment |
