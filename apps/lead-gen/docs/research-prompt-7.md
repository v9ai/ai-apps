# Research Prompt 7 — Evaluation
## LLM-as-Judge, Error Propagation, Explainability, Drift Detection

**Module**: `docs/06-evaluation.md`
**Research Crate**: `crates/research`
**Focus**: New papers (2024–2026) on pipeline evaluation, LLM-as-judge reliability, XAI, drift detection

---

## Research Mission

Current evaluation framework:
- **Cascade Error Rate (CER)**: ~0.15 (15% inter-stage error propagation), EAF 1.15×
- **LLM-as-judge**: Automated regression test suite with quality gate assertions
- **Per-stage metrics**: Crawling (15% harvest rate), NER (F1 92.3%), ER (P/R/F1 96.8/84.2/90.1), Matching (P 89.7%, R 86.5%), Report (97% satisfaction)
- **Ablation studies**: Remove RL crawling → −40–50% quality; Replace BERT NER with CRF → −7pp F1
- **Failure modes**: Data quality, model performance, system integration, UX

**Gaps to close:**
- LLM-as-judge introduces its own biases — no calibration or reliability assessment
- No automated drift detection between pipeline runs (concept drift in entity types, ICP shift)
- Explainability is missing: why did a lead score 0.92 vs 0.43? No feature attribution
- Error attribution across stages is manual — needs automated cascade tracing

---

## Primary Search Queries

```
"LLM as judge evaluation reliability bias 2024"
"cascade error propagation ML pipeline evaluation"
"explainable AI feature attribution NLP pipeline"
"data drift detection concept drift web ML"
"uncertainty quantification NER entity recognition"
"automated evaluation benchmark NLP 2024"
"pipeline robustness evaluation multi-stage"
"LLM judge calibration consistency 2025"
"SHAP LIME attribution tabular pipeline"
"continual learning concept drift detection"
"error attribution multi-stage NLP system"
"evaluation framework information extraction pipeline"
```

---

## API Routing Guidance

| Client | Why | Filter |
|---|---|---|
| `SemanticScholarClient` | ACL/EMNLP/ICLR evaluation papers, cited | `year: 2024`, `min_citations: 5`, `limit: 40` |
| `ArxivClient` | LLM-as-judge and drift detection preprints | `sort_by: lastUpdatedDate`, `max_results: 80` |
| `OpenAlexClient` | AAAI/KDD/SIGIR evaluation framework papers | `from_publication_date: 2024-01-01`, `per_page: 50` |

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
    output_dir: Some("docs/research-output/07-evaluation".into()),
    scholar_concurrency: Some(2),
    synthesis_preamble: Some(
        "You are an ML evaluation researcher. Synthesize findings on pipeline \
         evaluation, LLM-as-judge reliability, and drift detection. \
         Compare against current evaluation: CER ~0.15, LLM-as-judge regression tests, \
         manual ablation studies. Identify techniques that automate: cascade error \
         attribution, drift detection between runs, and explainability of lead scores. \
         Prioritize methods compatible with a local-first pipeline (no cloud required \
         for evaluation itself).".into()
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
        subject: "llm-as-judge-reliability".into(),
        preamble: "You are an NLP evaluation researcher. Search for papers from \
                   2024–2026 on LLM-as-judge reliability: bias analysis, \
                   calibration of judge models, position bias, length bias, \
                   and methods to improve judge consistency and agreement \
                   with human evaluators.".into(),
        description: "Search for: 'LLM judge reliability bias evaluation 2024', \
                      'LLM as evaluator consistency agreement', \
                      'position bias length bias LLM evaluation', \
                      'judge calibration reliability NLP 2025'. \
                      Current: LLM-as-judge quality gate assertions. \
                      Find papers quantifying judge bias and methods to correct it. \
                      Extract: bias types found, correlation with human judges (κ), \
                      correction techniques, judge model requirements (size), \
                      and whether a local 7B judge is reliable enough.".into(),
        priority: TaskPriority::Critical,
        timeout: Some(Duration::from_secs(2400)),
        max_retries: 1,
        ..Default::default()
    },

    ResearchTask {
        id: 2,
        subject: "cascade-error-attribution".into(),
        preamble: "You are an ML systems researcher specializing in error propagation \
                   analysis. Search for papers from 2024–2026 on automated cascade \
                   error analysis in multi-stage NLP pipelines: error attribution \
                   across stages, counterfactual error tracing, and pipeline \
                   robustness metrics beyond simple accuracy.".into(),
        description: "Search for: 'cascade error propagation multi-stage NLP', \
                      'error attribution pipeline information extraction', \
                      'counterfactual analysis NLP pipeline robustness', \
                      'pipeline evaluation compound system 2024'. \
                      Current: manual CER calculation (~0.15), manual ablation studies. \
                      Find automated methods to identify which stage causes the most \
                      downstream errors. Extract: attribution method, \
                      which pipeline types were evaluated, \
                      and whether attribution is exact or approximate.".into(),
        priority: TaskPriority::Normal,
        timeout: Some(Duration::from_secs(2400)),
        ..Default::default()
    },

    ResearchTask {
        id: 3,
        subject: "drift-detection-explainability".into(),
        preamble: "You are an ML reliability researcher. Search for papers from \
                   2024–2026 on concept drift detection in NLP/ML pipelines, \
                   feature attribution for tabular ML (SHAP, LIME, integrated \
                   gradients), and explainability methods for scoring/ranking models \
                   in production systems.".into(),
        description: "Search for: 'concept drift detection NLP streaming 2024', \
                      'SHAP attribution tabular classification production', \
                      'explainable lead scoring attribution', \
                      'online drift detection web content shift', \
                      'feature importance XGBoost production monitoring'. \
                      Current: no drift detection between pipeline runs. \
                      Find lightweight drift detectors (<1ms overhead per prediction) \
                      that alert when entity type distribution shifts. \
                      Extract: detection delay (samples to detect), false positive rate, \
                      computational overhead, and whether it works without labels.".into(),
        priority: TaskPriority::Normal,
        dependencies: vec![1],
        timeout: Some(Duration::from_secs(2400)),
        ..Default::default()
    },
];
```

---

## Key Research Sub-Topics

### 1. LLM-as-Judge Reliability
- **Position bias**: Judges prefer first answer — randomize order in automated tests
- **Length bias**: Judges prefer longer responses — length-normalize scoring
- **Self-consistency**: Run judge multiple times on same pair — measure variance
- **Calibration**: Does judge confidence align with accuracy? Track ECE for judge model
- Key papers to find: Zheng et al. MT-Bench/Chatbot Arena follow-ups, RLHF evaluation literature

### 2. Cascade Error Tracing
- **Error Attribution Factor (EAF)**: Current 1.15× — can it be computed automatically per stage?
- **Confound analysis**: When ER fails, how many downstream lead matches are affected?
- **Gold-standard injection**: Run each module with perfect upstream inputs → isolate stage error
- Automate the ablation study table from `06-evaluation.md`

### 3. Drift Detection
- **CUSUM/ADWIN**: Streaming drift detectors — apply to NER confidence distribution
- **Evidently AI**: Data drift reports — track entity type frequency over time
- **Population stability index (PSI)**: Track ICP feature distribution shift between crawl batches
- Trigger retraining when entity drift >15% or ICP distribution PSI >0.2

### 4. Explainability for Lead Scores
- **SHAP for XGBoost**: Already built-in — expose per-lead feature attribution in reports
- **LIME for text**: Explain why a company page was classified as relevant
- **Counterfactual explanations**: "If the company were in Berlin instead of Munich, score drops from 0.92 to 0.71"

---

## Expected Output Format

Save to `docs/research-output/07-evaluation/agent-{id:02}-{subject}.md`:

```markdown
# {subject}

## Top Papers Found
| Title | Year | Venue | Key Contribution | Applicable to Pipeline |
|---|---|---|---|---|

## Current Evaluation Gaps Addressed
| Gap | Paper | Method | Effort to Implement |
|---|---|---|---|

## Recommended Evaluation Additions
1. {technique} — addresses {gap} — implement via {tool/library}
```

Synthesis: produce an **evaluation enhancement roadmap** with: which metrics to add, which biases to correct, and one recommended drift alerting strategy.
