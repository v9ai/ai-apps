# Research Prompt 4 — Entity Resolution
## Deduplication, Blocking, Graph-Based Matching

**Module**: `docs/03-entity-resolution.md`
**Research Crate**: `crates/research`
**Focus**: New papers (2024–2026) on entity resolution, zero-shot matching, GNN-based ER, scalable blocking

---

## Research Mission

Current entity resolution pipeline:
- **Stage 1**: Rule-based SQL blocking (name normalization, legal suffix stripping, `LIKE` operators)
- **Stage 2**: Siamese networks (shared weights, cosine distance threshold 0.05)
- **Hard negative mining**: Online (within-batch), semi-hard, offline top-k, curriculum
- **Graph-based ER**: SQLite adjacency list, recursive CTEs for transitive closure
- **Performance**: P=96.8%, R=84.2%, F1=90.1%, <1ms ANN queries on 100K+ entities

**Gaps to close:**
- Recall 84.2% is the weak link — missed duplicates propagate as false leads
- Blocking reduces pairs but still misses cross-domain duplicates (e.g., "Google LLC" vs "Alphabet Inc.")
- Siamese requires labeled pairs — expensive to create for new entity types
- No cross-source resolution: company from LinkedIn ≠ company from Crunchbase

---

## Primary Search Queries

```
"entity resolution zero-shot small language model 2024"
"entity matching LLM distillation student teacher"
"siamese network entity deduplication contrastive 2024"
"graph neural network entity resolution GNN"
"blocking strategies entity matching scalable 2024"
"company name matching contrastive learning embeddings"
"record linkage foundation model zero-shot"
"hard negative mining entity resolution curriculum"
"multi-source entity resolution cross-domain"
"AnyMatch zero-shot entity matching SLM"
"GraLMatch multi-source entity group matching"
"DistillER LLM distillation entity resolution"
```

---

## API Routing Guidance

| Client | Why | Filter |
|---|---|---|
| `SemanticScholarClient` | VLDB/SIGMOD/EDBT/PVLDB database papers | `year: 2024`, `min_citations: 3`, `limit: 40` |
| `OpenAlexClient` | AAAI/WWW/WebSci papers on web-scale ER | `from_publication_date: 2024-01-01`, `per_page: 50` |
| `ArxivClient` | LLM-based ER preprints (very recent) | `sort_by: lastUpdatedDate`, `max_results: 60` |
| `CrossrefClient` | ACM DL and Springer proceedings | `from_pub_date: 2024-01-01`, `rows: 30` |

**Priority**: S2 for DB venue papers, arXiv for LLM-based ER.

---

## TeamLead Configuration

```rust
use research::team::{TeamLead, TeamConfig, LlmProvider};
use std::time::Duration;

let config = TeamConfig {
    team_size: 3,
    provider: LlmProvider::DeepSeek {
        api_key: std::env::var("DEEPSEEK_API_KEY").unwrap(),
        base_url: "https://api.deepseek.com".into(),
    },
    scholar_key: std::env::var("SEMANTIC_SCHOLAR_API_KEY").ok(),
    mailto: std::env::var("RESEARCH_MAILTO").ok(),
    output_dir: Some("docs/research-output/04-entity-resolution".into()),
    scholar_concurrency: Some(3),
    synthesis_preamble: Some(
        "You are a database researcher specializing in entity resolution at scale. \
         Synthesize findings on zero-shot, LLM-based, and GNN-based entity resolution. \
         Compare against current baseline: Siamese + SQL blocking (P=96.8%, R=84.2%, F1=90.1%). \
         Identify techniques that improve recall (currently 84.2%) without sacrificing precision. \
         Prioritize methods that work without new labeled pairs and can be distilled \
         into a fast local model (<1ms per query on 100K entities).".into()
    ),
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
        subject: "zero-shot-entity-matching".into(),
        preamble: "You are a database researcher specializing in zero-shot entity \
                   matching. Search for papers from 2024–2026 on entity resolution \
                   without labeled pairs, using pre-trained language models, \
                   contrastive embeddings, or in-context learning with LLMs.".into(),
        description: "Search for: 'AnyMatch zero-shot entity matching 2024', \
                      'zero-shot record linkage pre-trained language model', \
                      'in-context learning entity resolution LLM', \
                      'foundation model entity matching without labels'. \
                      Current Siamese requires 1K+ labeled pairs per domain. \
                      Find methods achieving F1 >85% without labeled training data. \
                      Extract: benchmark dataset, P/R/F1, LLM size, \
                      inference cost per pair, and whether it runs locally.".into(),
        priority: TaskPriority::Critical,
        timeout: Some(Duration::from_secs(2400)),
        max_retries: 1,
        ..Default::default()
    },

    ResearchTask {
        id: 2,
        subject: "llm-distillation-er".into(),
        preamble: "You are an ML researcher specializing in knowledge distillation \
                   for entity resolution. Search for papers from 2024–2026 on \
                   distilling GPT-4 or other large LLMs into small (1B–3B) local \
                   models for entity matching, trading some accuracy for 100–1000× \
                   lower inference cost.".into(),
        description: "Search for: 'DistillER LLM distillation entity matching', \
                      'knowledge distillation entity resolution small model', \
                      'GPT-4 teacher student entity matching 2024', \
                      'LLM annotation entity resolution training data'. \
                      Compare: GPT-4 cost ($0.002/pair) vs local 1B model (<$0.00001/pair). \
                      Extract: student model size, F1 vs teacher, distillation data size, \
                      inference latency (ms/pair), and whether it handles company names well.".into(),
        priority: TaskPriority::Critical,
        timeout: Some(Duration::from_secs(2400)),
        max_retries: 1,
        ..Default::default()
    },

    ResearchTask {
        id: 3,
        subject: "graph-neural-network-er".into(),
        preamble: "You are a graph ML researcher. Search for papers from 2024–2026 \
                   on graph neural networks for entity resolution, especially \
                   multi-source ER where the same entity appears with different \
                   attributes across data sources (LinkedIn, Crunchbase, company website).".into(),
        description: "Search for: 'graph neural network entity resolution 2024', \
                      'GraLMatch multi-source entity group matching', \
                      'GraphER property graph entity resolution GDD', \
                      'multi-source record linkage transitivity graph'. \
                      Current approach: SQLite adjacency list + recursive CTEs. \
                      Find GNN methods that improve transitive closure detection \
                      across sources. Extract: F1 on standard benchmarks (DBLP-ACM, \
                      Amazon-Google, Walmart-Amazon), training time, inference latency, \
                      and whether the graph fits in RAM for 100K entities.".into(),
        priority: TaskPriority::Normal,
        dependencies: vec![1],
        timeout: Some(Duration::from_secs(2400)),
        ..Default::default()
    },
];
```

---

## Key Research Sub-Topics

### 1. Zero-Shot Entity Matching
- **AnyMatch (AAAI 2025)**: Zero-shot SLM matching — 3899× cheaper than GPT-4
- **Eridu embeddings**: Contrastively trained on 2M company/person pairs — drop-in Siamese replacement
- **OpenSanctions logic-v2**: Deterministic symbol-tagged company matching — high precision rule system
- Key question: Can pre-trained embeddings trained on company data replace our domain-specific Siamese?

### 2. LLM Distillation for ER
- **DistillER (arXiv:2602.05452, EDBT 2026)**: Distill LLM entity matcher into 1–3B local student
- **LLM-as-labeler**: Use GPT-4 to generate 10K pseudo-labeled pairs → train small model
- Cost math: GPT-4 labels 10K pairs for ~$20 → local model runs for free thereafter

### 3. Graph-Based ER
- **GraLMatch (EDBT 2025)**: Multi-source entity group matching with transitivity checking
- **GraphER (Inf. Systems 2025)**: GDD-guided GNN, 95.4% F1 on property graphs
- Apply to: resolve "Google DeepMind" (web) = "DeepMind Technologies" (Crunchbase) = "Alphabet AI" (news)

### 4. Scalable Blocking Improvements
- **Canopy clustering**: Cheap distance → coarse clusters → expensive distance within clusters
- **BLAST blocking**: Token-based blocking with inverted index — handles abbreviations
- Current SQL LIKE blocking misses: "IBM" ↔ "International Business Machines"

---

## Expected Output Format

Save to `docs/research-output/04-entity-resolution/agent-{id:02}-{subject}.md`:

```markdown
# {subject}

## Top Papers Found
| Title | Year | Venue | P | R | F1 | Cost/pair | Local? |
|---|---|---|---|---|---|---|---|

## Comparison to Current Baseline (P=96.8%, R=84.2%, F1=90.1%)
| Technique | Precision delta | Recall delta | F1 delta | No labeled data? |
|---|---|---|---|---|

## Migration Path
- Replace or augment current Siamese?
- Blocking: keeps SQL LIKE or replaces?
- Labeled pairs needed: [count]
```

Synthesis: identify the single highest-ROI change to improve recall from 84.2% to >90% without sacrificing precision.
