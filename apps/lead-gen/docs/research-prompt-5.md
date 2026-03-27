# Research Prompt 5 — Lead Matching & Scoring
## Tabular Classification, ICP Embeddings, Calibration

**Module**: `docs/04-lead-matching.md`
**Research Crate**: `crates/research`
**Focus**: New papers (2024–2026) on tabular ML, calibration, retrieval-based scoring, temporal dynamics

---

## Research Mission

Current lead scoring pipeline:
- **Ensemble**: XGBoost (50%) + Logistic Regression (25%) + Random Forest (25%), soft voting
- **Siamese ICP embeddings**: 128-dim profile vectors, cosine similarity scoring
- **Calibration**: Platt scaling
- **Threshold**: 0.85 probability → Precision 89.7%, Recall 86.5%, F1 0.88, PR-AUC 0.92
- **Throughput**: ~1,000 leads/sec (XGBoost inference)
- **Pipeline funnel**: 50K pages → 7,500 relevant → 4,200 → 1,800 → 300 qualified leads

**Gaps to close:**
- XGBoost requires manual feature engineering — no end-to-end learning
- Calibration assumes static distribution — breaks under ICP drift (new job roles appear)
- No temporal signals: funding rounds, hiring activity, tech stack changes
- 300/50K = 0.6% yield — are we missing relevant leads at recall threshold?

---

## Primary Search Queries

```
"tabular foundation model zero-shot classification 2024"
"XGBoost ensemble improvements 2025"
"retrieval augmented tabular classification in-context"
"conformal prediction tabular distribution shift"
"B2B lead scoring machine learning 2024"
"ICP ideal customer profile embedding contrastive"
"temporal event sequence lead prediction funding hiring"
"TabPFN tabular prior-data fitted network"
"TabM BatchEnsemble tabular classification"
"calibration uncertainty quantification tabular ML"
"SmartCal automated calibration selection"
"ModernNCA retrieval-based tabular learning"
```

---

## API Routing Guidance

| Client | Why | Filter |
|---|---|---|
| `SemanticScholarClient` | ICLR/NeurIPS/ICML tabular ML papers, cited | `year: 2024`, `min_citations: 10`, `limit: 40` |
| `ArxivClient` | Recent tabular ML and calibration preprints | `sort_by: lastUpdatedDate`, `max_results: 80` |
| `OpenAlexClient` | KDD/SIGKDD/ECML papers on lead scoring | `from_publication_date: 2024-01-01`, `per_page: 50` |

**Note**: TabPFN papers appear on arXiv (stat.ML, cs.LG). Search S2 for citation counts.

---

## TeamLead Configuration

```rust
use research::team::{TeamLead, TeamConfig, LlmProvider};
use std::time::Duration;

let config = TeamConfig {
    team_size: 4,
    provider: LlmProvider::DeepSeek {
        api_key: std::env::var("DEEPSEEK_API_KEY").unwrap(),
        base_url: "https://api.deepseek.com".into(),
    },
    scholar_key: std::env::var("SEMANTIC_SCHOLAR_API_KEY").ok(),
    mailto: std::env::var("RESEARCH_MAILTO").ok(),
    output_dir: Some("docs/research-output/05-lead-matching".into()),
    scholar_concurrency: Some(3),
    synthesis_preamble: Some(
        "You are an ML researcher specializing in tabular classification \
         for B2B sales applications. Synthesize findings on tabular foundation models, \
         calibration, and temporal signals. Compare against current XGBoost ensemble \
         (P=89.7%, R=86.5%, F1=0.88, ~1000 leads/sec). Identify: which techniques \
         improve PR-AUC >0.95, which handle ICP drift without retraining, and which \
         add temporal signals (funding, hiring) without slowing inference below \
         500 leads/sec. Prioritize by: F1 improvement × inference speed preservation.".into()
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
        subject: "tabular-foundation-models".into(),
        preamble: "You are an ML researcher specializing in tabular learning. \
                   Search for papers from 2024–2026 on tabular foundation models, \
                   in-context learning for tabular data, and methods that eliminate \
                   feature engineering while matching or beating XGBoost. \
                   Focus on inference speed — must sustain 500+ leads/sec.".into(),
        description: "Search for: 'TabPFN-2.5 tabular prior-data fitted network', \
                      'tabular in-context learning classification', \
                      'TabM BatchEnsemble MLP tabular', \
                      'ModernNCA retrieval-based tabular learning 2024', \
                      'SAINT self-attention tabular 2024'. \
                      Baseline: XGBoost F1=0.88, ~1000 leads/sec. \
                      Find models that beat XGBoost F1 on <10K training samples. \
                      Extract: F1 on OpenML tabular benchmarks, training sample \
                      efficiency (<1K, 1K–10K), inference latency (ms/sample), \
                      and whether feature engineering is still required.".into(),
        priority: TaskPriority::Critical,
        timeout: Some(Duration::from_secs(2400)),
        max_retries: 1,
        ..Default::default()
    },

    ResearchTask {
        id: 2,
        subject: "calibration-distribution-shift".into(),
        preamble: "You are an ML researcher specializing in probability calibration \
                   and distribution shift. Search for papers from 2024–2026 on \
                   online calibration, conformal prediction for tabular data, and \
                   methods that maintain calibration under ICP drift without \
                   full model retraining.".into(),
        description: "Search for: 'conformal prediction tabular classification shift', \
                      'SmartCal automated calibration selection AutoML', \
                      'online calibration distribution shift 2024', \
                      'COP conformal online prediction ICLR 2026', \
                      'Platt scaling isotonic regression alternatives 2024'. \
                      Current: Platt scaling with ECE monitoring. \
                      Find calibration methods that adapt online to new lead types \
                      without storing full dataset. Extract: ECE before/after, \
                      calibration update latency, memory footprint, and whether \
                      coverage guarantees hold under covariate shift.".into(),
        priority: TaskPriority::Critical,
        timeout: Some(Duration::from_secs(2400)),
        max_retries: 1,
        ..Default::default()
    },

    ResearchTask {
        id: 3,
        subject: "temporal-event-signals".into(),
        preamble: "You are an ML researcher specializing in temporal event sequences \
                   for business prediction. Search for papers from 2024–2026 on \
                   using temporal signals (funding rounds, hiring activity, \
                   tech stack changes) as features for B2B lead scoring, \
                   including Hawkes processes, transformer event models, and \
                   graph temporal networks.".into(),
        description: "Search for: 'Hawkes process attention lead scoring temporal', \
                      'funding event sequence company classification', \
                      'temporal graph network company signal', \
                      'hiring activity prediction company readiness', \
                      'event-driven lead scoring time series'. \
                      Find models that take sequences of funding/hiring/product events \
                      as input and predict ICP match probability. \
                      Extract: AUC improvement vs static features, event types used, \
                      sequence length, model size, and inference latency.".into(),
        priority: TaskPriority::Normal,
        timeout: Some(Duration::from_secs(2400)),
        ..Default::default()
    },

    ResearchTask {
        id: 4,
        subject: "icp-embedding-retrieval".into(),
        preamble: "You are an ML researcher specializing in embedding-based \
                   retrieval for business applications. Search for papers from \
                   2024–2026 on ICP (Ideal Customer Profile) modeling via \
                   dense retrieval, contrastive learning on company profiles, \
                   and retrieval-augmented lead scoring.".into(),
        description: "Search for: 'ideal customer profile embedding contrastive', \
                      'company profile similarity learning B2B', \
                      'retrieval augmented classification business', \
                      'dense retrieval tabular features company matching'. \
                      Current: 128-dim Siamese ICP embeddings in LanceDB. \
                      Find improved embedding methods for company similarity. \
                      Extract: embedding dimension, similarity metric, \
                      retrieval speed on 100K candidates (ms), \
                      and F1 on held-out ICP matching task.".into(),
        priority: TaskPriority::Normal,
        dependencies: vec![1],
        timeout: Some(Duration::from_secs(2400)),
        ..Default::default()
    },
];
```

---

## Key Research Sub-Topics

### 1. Tabular Foundation Models
- **TabPFN-2.5 (arXiv:2511.08667, Nov 2025)**: 100% win rate vs XGBoost on <10K samples, zero-shot
- **TabM (ICLR 2025)**: Parameter-efficient MLP ensemble via BatchEnsemble — 5× faster than TabPFN
- **ModernNCA (ICLR 2025)**: Retrieval-based tabular learning — uses training examples as context
- Trade-off: TabPFN-2.5 zero-shot accuracy vs XGBoost inference speed (1000 leads/sec requirement)

### 2. Calibration Under Shift
- **COP (ICLR 2026)**: Online conformal prediction with distribution shift handling
- **SmartCal (AutoML 2025)**: AutoML auto-selects best calibrator from 12 methods
- Current Platt scaling breaks when new industries appear in ICP — need online adaptation

### 3. Temporal Business Signals
- **Hawkes Attention (arXiv:2601.09220)**: Type-specific temporal dynamics for funding/hiring/tech signals
- Funding events: Series A → B → C indicates growth trajectory and budget availability
- Hiring signals: Engineering hiring surge → product expansion → higher ICP match probability

### 4. Retrieval-Augmented Scoring
- Use LanceDB to find K nearest neighbors in embedding space → aggregate their scores
- More robust than pure parametric model when training data is sparse for new ICPs

---

## Expected Output Format

Save to `docs/research-output/05-lead-matching/agent-{id:02}-{subject}.md`:

```markdown
# {subject}

## Top Papers Found
| Title | Year | Venue | F1 | PR-AUC | Speed | Zero-Shot |
|---|---|---|---|---|---|---|

## vs Current Baseline (F1=0.88, PR-AUC=0.92, 1000 leads/sec)
| Technique | F1 delta | PR-AUC delta | Speed ratio | Feature engineering? |
|---|---|---|---|---|

## Implementation Notes
- Replace XGBoost or add as ensemble member?
- Training data required: [samples needed]
- Inference latency impact: [ms/lead]
- Online update capability: yes/no
```

Synthesis: produce a **decision matrix** for replacing vs augmenting the XGBoost ensemble, ordered by PR-AUC improvement at ≥500 leads/sec inference.
