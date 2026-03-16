# agentic_press

A multi-agent content pipeline that autonomously generates publication-ready articles using DeepSeek and Qwen. It orchestrates a team of specialist agents that collaborate through research, writing, and editorial review cycles to produce evidence-backed content.

## Pipeline Modes

### Blog Mode

```
Scout (Reasoner)  → find trending topics in niche
Picker (Fast)     → select top N by misconception + evidence score
[Parallel per topic]
  Researcher (Reasoner) + Writer (Reasoner) → research + draft
  LinkedIn (Fast)                           → LinkedIn post
```

### Journalism Mode

```
Researcher (Reasoner) ∥ SEO (Fast)  → research brief + SEO strategy (parallel)
Writer (Reasoner)                   → draft article
Editor (Reviewer)                   → approve or request revision (max 1 round)
→ Publish
```

### Deep-Dive Mode

```
Research Phase + SEO (parallel) → academic papers + SEO strategy
DeepDiveWriter (Reasoner)       → enhance source article with research
Editor (Reviewer)               → approve or revise (max 1 round)
LinkedIn (Fast)                 → post from final content
→ Publish
```

## Agent Routing

| Role       | Model                | Purpose                              |
|------------|----------------------|--------------------------------------|
| Reasoner   | DeepSeek-reasoner    | Research, writing, editing           |
| Fast       | Qwen-plus (fallback: DeepSeek) | LinkedIn posts, SEO, topic picks |
| Reviewer   | DeepSeek             | Editorial quality gates              |

## Usage

### CLI

```bash
agentic_press --title "My Article" --input source.md --output-dir ./articles \
  [--publish] [--git-push]
```

| Flag           | Description                                      |
|----------------|--------------------------------------------------|
| `--title`      | Article title (required)                         |
| `--input`      | Path to source markdown file (required)          |
| `--output-dir` | Output directory (default: `./articles`)         |
| `--publish`    | Write to vadim.blog + trigger Vercel deploy      |
| `--git-push`   | Git commit+push in blog repo (requires `--publish`) |

### Library

```rust
use agentic_press::pipeline::Pipeline;
use agentic_press::PipelineMode;

let pipeline = Pipeline::new("niche", "./articles")
    .with_mode(PipelineMode::DeepDive)
    .with_topic("My Topic")
    .with_input_file("source.md")
    .with_research(ResearchConfig::default())
    .with_publish(true);

let result = pipeline.run().await?;
```

## Environment Variables

| Variable                   | Required | Purpose                          |
|----------------------------|----------|----------------------------------|
| `DEEPSEEK_API_KEY`         | Yes      | DeepSeek API token               |
| `DASHSCOPE_API_KEY`        | No       | Enables Qwen as fast model       |
| `SEMANTIC_SCHOLAR_API_KEY` | No       | Academic paper search             |
| `OPENALEX_MAILTO`          | No       | Academic paper search             |
| `CROSSREF_MAILTO`          | No       | Academic paper search             |
| `CORE_API_KEY`             | No       | Academic paper search             |
| `VADIM_BLOG_DIR`           | No       | Override default blog output path |

## Research Integration

The research phase queries four academic databases (Semantic Scholar, OpenAlex, Crossref, CORE), deduplicates results by title, ranks by citation count, and synthesizes findings using multi-model analysis.

## Output Structure

```
./articles/
├── research/          # Research briefs + SEO strategies
├── drafts/            # Work-in-progress articles
├── published/         # Editor-approved final versions
└── {slug}/            # Per-topic outputs (blog mode)
    ├── blog.md
    ├── linkedin.md
    └── research.md
```

## Publishing

When `--publish` is used, articles are written to `apps/vadim.blog/blog/{YYYY}/{MM-DD-slug}/index.md` with auto-generated frontmatter (title, slug, tags, date, author). Optionally triggers Vercel deployment and git commit+push.

## Testing

```bash
cargo test -p agentic_press
```

Tests include unit tests (slugify, strip_fences, task list, deduplication), integration tests with wiremock-based HTTP mocking, and YAML-based evals in `evals/`.
