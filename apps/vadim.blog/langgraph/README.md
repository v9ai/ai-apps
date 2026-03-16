# Press — LangGraph Content Pipeline

AI-powered content generation pipeline for vadim.blog. Uses [LangGraph](https://langchain-ai.github.io/langgraph/) to orchestrate multi-agent workflows that research, write, edit, and publish blog articles.

## Overview

Four pipelines, each a LangGraph `StateGraph`:

| Command | Use case | Output |
|---|---|---|
| `press journalism` | Research & write a journalistic article on any topic | 1200–1800 word article |
| `press deep-dive` | Transform a source document into a long-form technical piece | 2500–3500 word deep-dive |
| `press counter` | Write a rebuttal to an article at a given URL | 1200–1800 word counter-article |
| `press blog` | Generate N blog post drafts for a niche | 700–1000 word posts + LinkedIn |

Models used:
- `deepseek-reasoner` — research, writing, editing (heavy reasoning)
- `deepseek-chat` — fast tasks (SEO strategy, LinkedIn posts)

---

## How it Works

### Agents

Every agent is a thin wrapper around a `ChatOpenAI` call:

```
Agent(name, system_prompt, model)
  └── run(input_text) → str
      ├── [SystemMessage(system_prompt), HumanMessage(input_text)]
      ├── retry up to 3× on failure (exponential backoff)
      └── logs: "[agent_name] starting (model)" / "[agent_name] done (N chars)"
```

Agents can run in parallel via `run_parallel(a, b, input)` or `run_all([(agent, input), ...])`.

### Pipeline: Journalism

```
START
  ↓
research_and_seo          ← Researcher + SEO strategist run in parallel
  ↓
write                     ← Writer drafts article from research + SEO brief
  ↓
edit                      ← Editor runs 5 passes: FACT-CHECK, STRUCTURE, CLARITY, TONE, STANDARDS
  ↓
CONDITIONAL
  ├─ approved ──────────→ publish → END
  ├─ revision_rounds < 1 → revise → (back to edit)
  └─ revision_rounds ≥ 1 → save_final → END
```

State: `topic`, `research_output`, `seo_output`, `draft`, `editor_output`, `approved`, `revision_rounds`

### Pipeline: Deep-Dive

```
START
  ↓
read_source               ← Load input_file from disk
  ↓
research_and_seo          ← Optional paper search (4 APIs) + SEO strategist in parallel
  ↓
write                     ← Writer produces deep-dive citing 5+ papers
  ↓
edit                      ← Editor checks: citations, depth, 5+ papers, decision framework
  ↓
CONDITIONAL
  ├─ approved ──────────→ linkedin_approved → publish → END
  ├─ revision_rounds < 1 → revise → (back to edit)
  └─ revision_rounds ≥ 1 → linkedin_final → save_final → END
```

Additional state: `title`, `input_file`, `source_content`, `linkedin`, `paper_count`

### Pipeline: Counter-Article

```
START
  ↓
fetch_source              ← HTTP GET url → strip HTML to plain text
  ↓
research_and_seo          ← Search 4 paper APIs for counter-evidence; counter-researcher + SEO in parallel
  ↓
write                     ← Counter-writer steelmans then dismantles the original
  ↓
edit                      ← Editor fact-checks against counter-research brief
  ↓
CONDITIONAL               ← Same as deep-dive (with LinkedIn)
```

### Pipeline: Blog

```
START
  ↓
scout_node                ← Scout finds 5 trending topics in the niche
  ↓
pick_node                 ← Picker scores and selects top N topics (returns JSON)
  ↓
process_topics            ← For each topic in parallel:
                             ├─ research_phase (paper search if enabled)
                             ├─ writer_agent
                             └─ linkedin_agent (writer + linkedin run in parallel)
  ↓
END
```

---

## Academic Paper Search

When paper search is enabled, `research_phase` queries 4 databases in parallel:

| Source | Endpoint | Notes |
|---|---|---|
| Semantic Scholar | `api.semanticscholar.org` | Filters: year ≥ 2019, citations ≥ 3 |
| OpenAlex | `api.openalex.org` | Sorted by citation count |
| Crossref | `api.crossref.org` | Sorted by reference count |
| CORE | `api.core.ac.uk` | Open access papers |

Results are deduplicated by title + DOI, then ranked by a score:

```
score = citation_count
      + 50  (if paper < 2 years old)
      + 30  (if paper 2–3 years old)
      + 15  (if paper 3–5 years old)
      + 5   (if paper 5+ years old)
```

Top papers are formatted into a digest and fed to the researcher agent.

---

## Publishing

`publisher.publish(blog_md, topic, deploy, git_push)`:

1. Parses frontmatter from the markdown
2. Derives slug from title
3. Writes to `${VADIM_BLOG_DIR}/${YEAR}/${MM-DD-SLUG}/index.md`
4. If `--git-push`: `git add . && git commit -m "blog: {title}" && git push`
5. If `--publish` + `--git-push`: `vercel deploy --prod`

Pre-publish validation checks:
- No double frontmatter
- Non-empty description
- Tags are not just slug words
- Date is not stale (> 7 days old)
- At least 3 inline hyperlinks

---

## Setup

```bash
# Install
uv sync

# Configure
cp .env.example .env
# Set DEEPSEEK_API_KEY (required)
# Set VADIM_BLOG_DIR if publishing outside the default ../blog/ path
```

**Environment variables:**

```bash
# Required
DEEPSEEK_API_KEY=sk_...

# Optional — paper search APIs (rate-limited without keys)
SEMANTIC_SCHOLAR_API_KEY=...
OPENALEX_MAILTO=you@example.com
CROSSREF_MAILTO=you@example.com
CORE_API_KEY=...

# Optional — override blog output directory
VADIM_BLOG_DIR=/path/to/blog
```

---

## Usage

```bash
# Journalism article
press journalism --topic "The real cost of AI inference at scale"

# Deep-dive from a source document
press deep-dive --title "My Title" --input ./notes.md --publish --git-push

# Counter-article
press counter --url https://example.com/article --topic "Why their premise is wrong"

# Blog drafts (3 posts for a niche)
press blog --niche "AI infrastructure" --count 3
```

All commands accept `--output-dir`, `--publish`, and `--git-push` flags.

---

## Output Structure

```
articles/
  research/   {slug}-research.md, {slug}-seo.md
  drafts/     {slug}.md, {slug}-revisions.md, {slug}-linkedin.md
  published/  final content before push to blog

drafts/       (blog pipeline)
  {niche}/
    01_scout_topics.md
    02_picker_selection.json
    {topic}/  research.md, blog.md, linkedin.md
```

---

## Project Structure

```
src/press/
├── __init__.py           slugify, strip_fences, extract_published_content
├── cli.py                Click commands (journalism, deep-dive, blog, counter)
├── models.py             ModelPool — deepseek-reasoner + deepseek-chat
├── agents.py             Agent wrapper with retry logic
├── prompts.py            All system prompts for every agent role
├── publisher.py          Write MDX + git push + vercel deploy
├── research.py           Paper search orchestration + synthesis
├── papers/               API clients: semantic_scholar, openalex, crossref, core_api
└── graphs/
    ├── state.py          TypedDicts: BlogState, JournalismState, DeepDiveState, CounterArticleState
    ├── nodes.py          Shared nodes: publish_node, save_final_node, make_linkedin_node
    ├── blog.py           Blog pipeline
    ├── journalism.py     Journalism pipeline
    ├── deep_dive.py      Deep-dive pipeline
    └── counter_article.py Counter-article pipeline
```
