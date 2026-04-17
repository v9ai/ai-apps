# Humans of AI

Intimate portraits of the minds building artificial intelligence — their stories, their words, their vision.

103 profiles across lab founders, open-source builders, deep learning researchers, infrastructure engineers, and podcast hosts. Each profile is enriched with live GitHub and Hugging Face data, Spotify podcast appearances, arXiv papers, and deep research generated entirely offline by a 20-agent pipeline running local MLX inference on Apple Silicon.

**[humansofai.space](https://humansofai.space)**

## How It Works

The site is statically generated from three layers of data:

1. **Curated profiles** — 103 personalities across 7 categories, hand-maintained in TypeScript
2. **Live enrichment** — A daily Vercel cron pulls GitHub repos/stats and Hugging Face models per person, writing JSON that the build reads at render time
3. **Deep research** — A Python pipeline (LangGraph + Qwen2.5 via MLX) runs 20 specialized agents to generate structured bios, timelines, key contributions, curated quotes, and interview questions — all locally, no API keys

## Pages

| Route | What it shows |
|-------|---------------|
| `/` | Category filter, search modal, personality grid with quotes |
| `/person/[slug]` | GitHub projects, HF models, tech stack bar, podcast episodes, papers, deep research, timeline |
| `/person/[slug]/questions` | Generated interview questions drawn from the person's work |
| `/stats` | Aggregate dashboard — total stars, downloads, language distribution, top repos |

## Stack

Next.js 16 (Turbopack) / React 19 / PandaCSS / Vercel

## Project Structure

```
src/
├── app/
│   ├── page.tsx                     Homepage
│   ├── person/[slug]/               Profile + questions pages
│   ├── stats/                       Aggregate dashboard
│   ├── api/                         REST endpoints + enrichment cron
│   └── _components/                 Nav, search, grid, footer
└── lib/
    ├── personalities/               Profiles, categories, types
    ├── enrichment/                  GitHub + HF data (JSON per person)
    ├── research/                    Generated research (JSON per person)
    ├── episodes.ts                  Spotify episode loader
    └── quotes.ts                    Curated quotes

backend/
├── research_pipeline.py             20-agent LangGraph pipeline
├── question_generator.py            Interview question generation
├── spotify_podcast_search.py        Spotify + Chroma semantic search
├── timeline_enrichment.py           Timeline enrichment (GitHub, HF, web)
├── mlx_client.py                    Local inference (MLX + Qwen2.5)
└── tests/                           deepeval + deterministic evals
```

## Development

```bash
pnpm dev          # Dev server on :3005 (Turbopack)
pnpm build        # Production build
pnpm validate     # Validate personality data
```

## Research Pipeline

```bash
# One-time: download the model
python3 backend/download_model.py

# Generate research for a person
python3 backend/research_pipeline.py --slug harrison-chase
```

The pipeline runs in three phases:

1. **Gather** — Web, GitHub, arXiv, HuggingFace, Spotify, news, video transcripts
2. **Analyze** — Biography, timeline, contributions, quotes, social presence, competitive landscape
3. **Synthesize** — Quality scoring, executive summary, interview questions

Output lands in `src/lib/research/{slug}.json`. To use a smaller model:

```bash
export MLX_MODEL=mlx-community/Qwen2.5-3B-Instruct-4bit
```

### Evals

```bash
cd backend && python3 -m pytest tests/ -v
```

Deterministic checks (identity anchors, structure depth, URL validity, paper counts) plus GEval metrics (biography quality, research completeness, source attribution) using the local MLX model as judge.

## Environment

| Variable | Required | Description |
|----------|----------|-------------|
| `MLX_MODEL` | No | MLX model ID (default: `Qwen2.5-7B-Instruct-4bit`) |
| `GITHUB_TOKEN` | No | Higher GitHub API rate limits for enrichment |
