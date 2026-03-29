# course-review

10-expert Candle LLM course review pipeline with Lance columnar storage.

## Pipeline

```
CourseInput
    │
    ▼
ExpertScorer::review()          ← single LocalLlm (Qwen2.5-3B-Instruct Q4_K_M)
    │
    ├─ pedagogy_node            (LLM call, JSON parse)
    ├─ technical_accuracy_node  (LLM call, JSON parse)
    ├─ content_depth_node       (LLM call, JSON parse)
    ├─ practical_application_node
    ├─ instructor_clarity_node
    ├─ curriculum_fit_node
    ├─ prerequisites_node
    ├─ ai_domain_relevance_node
    ├─ community_health_node
    └─ value_proposition_node
    │
    ▼
Pure Rust aggregation (weighted average, no LLM)
    │
    ▼
CourseReview → ReviewStore (Lance columnar)
```

## Weights

| Expert                  | Weight |
|-------------------------|--------|
| Technical Accuracy      | 15%    |
| AI Domain Relevance     | 15%    |
| Pedagogy                | 12%    |
| Content Depth           | 12%    |
| Practical Application   | 12%    |
| Instructor Clarity      | 10%    |
| Curriculum Fit          | 8%     |
| Prerequisites           | 8%     |
| Community Health        | 4%     |
| Value Proposition       | 4%     |

## Usage

```bash
# Review a single course
cargo run --bin review-courses -- review \
  --title "Practical Deep Learning for Coders" \
  --url "https://course.fast.ai" \
  --provider "fast.ai" \
  --free

# List top-rated courses
cargo run --bin review-courses -- list --min-score 7.5

# Export all reviews as JSON
cargo run --bin review-courses -- export --output reviews.json
```

## Model

Uses `Qwen/Qwen2.5-3B-Instruct-GGUF` (Q4_K_M quantization, ~2GB) via Candle.
Downloaded automatically on first run from HuggingFace Hub.
Metal GPU acceleration enabled by default on macOS.

## Lance Store

Reviews persisted to `./course-reviews.lance` (configurable via `--store-path`).
Schema: 16 numeric columns + 6 text columns per review.
