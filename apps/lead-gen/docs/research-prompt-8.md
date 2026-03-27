# Research Prompt 8 — Pipeline Synthesis
## End-to-End System Integration, Cost-Performance, Upgrade Roadmap

**Module**: `docs/07-synthesis.md`
**Research Crate**: `crates/research`
**Focus**: New papers (2024–2026) on end-to-end ML pipeline optimization, cost-efficiency, multi-stage co-design

---

## Research Mission

Current end-to-end pipeline metrics:
- **Funnel**: 50K pages → 7,500 relevant → 4,200 → 1,800 → 300 qualified leads (0.6% yield)
- **CER ~0.15, EAF 1.2×**
- **Cost**: ~$1,500/year hardware vs $5,400–$13,200 cloud (64–89% savings)
- **Throughput by stage**: Crawling ~10 pages/sec (I/O bound), NER ~100 pages/sec, ER <1ms/query, Matching ~1,000 leads/sec, Report 10–30 sec/report
- **Storage**: SQLite ~500MB, LanceDB 2–4 GB, ChromaDB 1–2 GB, total 4–7 GB

**Synthesis goal**: Find papers that inform cross-cutting upgrade decisions affecting multiple modules:
- Where is the pipeline bottleneck? (currently: crawling at 10 pages/sec)
- What techniques simultaneously improve multiple stages?
- Are there end-to-end architectures that replace multiple stages with one model?

---

## Primary Search Queries

```
"end-to-end information extraction pipeline 2024"
"multi-stage NLP system co-optimization"
"B2B lead generation AI automated pipeline"
"ML pipeline cost performance tradeoff local cloud"
"unified extraction matching report generation"
"focused web crawling entity extraction pipeline"
"automated lead qualification machine learning system"
"knowledge graph construction web crawl pipeline"
"pipeline bottleneck analysis throughput optimization"
"edge AI pipeline embedded ML local inference"
"information retrieval pipeline evaluation benchmark"
"data flywheel active learning pipeline improvement"
```

---

## API Routing Guidance

| Client | Why | Filter |
|---|---|---|
| `OpenAlexClient` | Broad coverage for survey papers and system papers | `from_publication_date: 2024-01-01`, `per_page: 50` |
| `SemanticScholarClient` | VLDB/SIGMOD/ICDE system papers, cited | `year: 2024`, `min_citations: 10`, `limit: 40` |
| `CrossrefClient` | ACM Computing Surveys, IEEE transactions | `from_pub_date: 2024-01-01`, `rows: 30` |
| `ArxivClient` | End-to-end pipeline papers | `sort_by: relevance`, `max_results: 60` |

**Strategy**: Use OpenAlex for breadth, then S2 for depth (citation-ranked survey papers).

---

## TeamLead Configuration

```rust
use research::team::{TeamLead, TeamConfig, LlmProvider};
use std::time::Duration;

let config = TeamConfig {
    team_size: 2,
    provider: LlmProvider::DeepSeek {
        api_key: std::env::var("DEEPSEEK_API_KEY").unwrap(),
        base_url: "https://api.deepseek.com".into(),
    },
    scholar_key: std::env::var("SEMANTIC_SCHOLAR_API_KEY").ok(),
    mailto: std::env::var("RESEARCH_MAILTO").ok(),
    output_dir: Some("docs/research-output/08-synthesis".into()),
    scholar_concurrency: Some(2),
    synthesis_preamble: Some(
        "You are a systems architect specializing in AI/ML pipeline optimization. \
         Synthesize findings on end-to-end ML pipeline design for lead generation. \
         The current pipeline: 50K pages → 300 leads (0.6% yield), 10 pages/sec \
         crawling bottleneck, $1,500/year hardware cost. \
         Identify cross-cutting upgrades that affect multiple modules simultaneously. \
         Focus on: (1) breaking the 10 pages/sec crawl bottleneck, \
         (2) unified models that replace multiple pipeline stages, \
         (3) active learning loops that improve all stages from user feedback. \
         Rank findings by: (yield improvement + cost reduction) ÷ implementation risk.".into()
    ),
    synthesis_provider: Some(LlmProvider::DeepSeek {
        api_key: std::env::var("DEEPSEEK_API_KEY").unwrap(),
        base_url: "https://api.deepseek.com".into(),
    }),
    ..Default::default()
};
```

---

## ResearchTask Definitions

```rust
use research::team::task::{ResearchTask, TaskStatus, TaskPriority};
use std::time::Duration;

let tasks = vec![
    ResearchTask {
        id: 1,
        subject: "end-to-end-pipeline-surveys".into(),
        preamble: "You are a systems researcher. Search for survey papers and \
                   system papers from 2024–2026 on end-to-end ML pipelines for \
                   information extraction, lead generation, or knowledge graph \
                   construction. Focus on papers that analyze bottlenecks, \
                   co-optimization across stages, and unified architectures.".into(),
        description: "Search for: 'end-to-end pipeline web information extraction survey', \
                      'knowledge graph construction web pipeline 2024', \
                      'automated company intelligence pipeline ML', \
                      'multi-stage NLP pipeline optimization survey 2024'. \
                      Find survey papers covering 3+ pipeline stages. \
                      Extract: which stages each paper covers, \
                      identified bottlenecks, recommended architectures, \
                      and benchmark datasets for full-pipeline evaluation.".into(),
        priority: TaskPriority::Critical,
        timeout: Some(Duration::from_secs(2400)),
        max_retries: 1,
        ..Default::default()
    },

    ResearchTask {
        id: 2,
        subject: "cost-efficiency-frameworks".into(),
        preamble: "You are an MLOps researcher. Search for papers from 2024–2026 \
                   on cost-performance tradeoffs for local vs cloud ML deployment, \
                   active learning loops that improve pipeline yield, \
                   and data flywheel strategies for continuous pipeline improvement \
                   without constant manual labeling.".into(),
        description: "Search for: 'local vs cloud ML deployment cost analysis 2024', \
                      'active learning data flywheel ML pipeline improvement', \
                      'continuous learning pipeline production deployment', \
                      'ML pipeline cost optimization edge inference'. \
                      Current cost: $1,500/year hardware vs $5,400–$13,200 cloud. \
                      Find papers that quantify: when local inference becomes cheaper \
                      than cloud, how active learning from user feedback improves \
                      all stages simultaneously, and what monitoring triggers retraining. \
                      Extract: cost comparison methodology, breakeven analysis, \
                      active learning strategy, and annotation effort required.".into(),
        priority: TaskPriority::Normal,
        dependencies: vec![1],
        timeout: Some(Duration::from_secs(2400)),
        ..Default::default()
    },
];
```

---

## Key Research Sub-Topics

### 1. End-to-End Pipeline Co-Optimization
- **Gradient flow across stages**: Can stages be jointly trained end-to-end?
- **Latency-accuracy Pareto frontier**: What is the optimal operating point?
- **Unified architectures**: Can one model handle extraction + ER + scoring? (e.g., instruction-tuned LLM)
- Key question: Does replacing 3 models with 1 LLM improve or hurt the 0.6% funnel yield?

### 2. Crawl Bottleneck Breaking
- Current 10 pages/sec is network I/O limited — not model limited
- **Async fetching + Playwright**: Render JavaScript-heavy pages without blocking
- **Distributed crawling**: Multiple crawl workers on the same machine (asyncio parallelism)
- **Pre-filtering**: Craw4LLM-style URL quality scoring before fetching → 21% URLs = 100% performance

### 3. Active Learning for Yield Improvement
- **Data flywheel**: Every qualified lead reviewed by user → label propagates back to all stages
- **Query-by-committee**: Ensemble disagreement on borderline leads → prioritize for labeling
- **Cross-stage label propagation**: A correct ER decision improves both the Siamese and XGBoost

### 4. Cross-Stage Feature Sharing
- NER confidence scores → features for XGBoost lead scorer (currently not shared)
- ER cluster membership → feature for report generator (related companies context)
- Crawl harvest reward → signal for calibrating ER dedup aggressiveness

---

## Expected Output Format

Save to `docs/research-output/08-synthesis/agent-{id:02}-{subject}.md`:

```markdown
# {subject}

## Top Papers Found
| Title | Year | Venue | Stages Covered | Key Finding |
|---|---|---|---|---|

## Cross-Cutting Upgrades Identified
| Upgrade | Affects Modules | Expected Yield Delta | Cost Delta | Priority |
|---|---|---|---|---|

## Unified Architecture Candidates
| Architecture | Replaces | Quality vs Current | Implementation Risk |
|---|---|---|---|
```

Synthesis: produce a **12-month roadmap** with quarterly milestones, where each milestone improves at least one of: funnel yield (>0.6%), crawl throughput (>10 pages/sec), or hardware cost (<$1,500/year).
