# Research Prompt 3 — Information Extraction
## NER, Relation Extraction, Topic Modeling

**Module**: `docs/02-extraction.md`
**Research Crate**: `crates/research`
**Focus**: New papers (2024–2026) on NER, LLM-based extraction, DOM-aware web extraction, structured output

---

## Research Mission

Current extraction pipeline:
- **BERT NER**: bert-base-cased fine-tuned on CoNLL-2003 + 1K press releases
  - Entity types: ORG, PERSON, LOCATION, PRODUCT
  - F1: 92.3% (ORG 94.1%, PERSON 93.2%, LOCATION 89.8%, PRODUCT 88.5%)
  - Thresholds: ORG/PERSON 0.75, LOCATION/PRODUCT 0.60
- **Content extraction**: Trafilatura with chardet fallback
- **Topic modeling**: LDA + BERTopic integration
- **Throughput**: ~100 pages/sec with BERT inference

**Gaps to close:**
- PRODUCT entity F1 is weakest (88.5%) — especially on technical product names
- Zero-shot extraction: no fine-tuning for new entity types (skills, funding amounts)
- DOM structure ignored: valuable signals in `<h1>`, `<title>`, schema.org JSON-LD
- Relation extraction is rudimentary (dependency parsing only)

---

## Primary Search Queries

```
"zero-shot named entity recognition GLiNER 2024"
"LLM information extraction structured output web"
"DOM-aware web content extraction NER"
"span-based NER long document 2024"
"NuNER token-level few-shot entity recognition"
"relation extraction LLM structured output"
"BERTopic topic modeling improvements 2024"
"web boilerplate removal content extraction benchmark"
"schema.org JSON-LD entity extraction"
"open information extraction LLM"
"nested NER entity recognition overlapping spans"
"AXE DOM extraction XPath provenance"
```

---

## API Routing Guidance

| Client | Why | Filter |
|---|---|---|
| `SemanticScholarClient` | ACL/EMNLP/NAACL/EACL NLP papers with citations | `year: 2024`, `limit: 50` |
| `ArxivClient` | LLM extraction preprints appear first here | `sort_by: lastUpdatedDate`, `max_results: 80` |
| `OpenAlexClient` | AAAI/IJCAI/WWW papers, broad coverage | `from_publication_date: 2024-01-01`, `per_page: 50` |

**Fallback**: OpenAlex → Semantic Scholar → arXiv

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
    output_dir: Some("docs/research-output/03-extraction".into()),
    scholar_concurrency: Some(3),
    synthesis_preamble: Some(
        "You are an NLP researcher specializing in information extraction \
         for web-scale data. Synthesize findings on NER and relation extraction, \
         contrasting each against the current BERT NER baseline (F1 92.3%, \
         ~100 pages/sec). Prioritize techniques that: (1) improve PRODUCT entity \
         F1 without re-labeling, (2) add new entity types zero-shot, or \
         (3) exploit DOM structure. Note inference speed requirements — \
         the pipeline must sustain ~100 pages/sec on a single machine.".into()
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
        subject: "zero-shot-ner-advances".into(),
        preamble: "You are an NLP researcher specializing in zero-shot and \
                   few-shot named entity recognition. Search for papers from \
                   2024–2026 on zero-shot NER models that can recognize new \
                   entity types without fine-tuning. Focus on GLiNER, NuNER, \
                   span-based models, and LLM-based NER with structured output.".into(),
        description: "Search for: 'GLiNER zero-shot NER 2024', \
                      'NuNER token-level entity recognition', \
                      'zero-shot NER generalization new entity types', \
                      'span classification NER without fine-tuning'. \
                      Current baseline: BERT NER F1 92.3% on ORG/PERSON/LOC/PROD. \
                      Find models that match or exceed this F1 on standard types \
                      WHILE supporting new types (SKILL, FUNDING_AMOUNT, DATE). \
                      Extract: model name, F1 on CoNLL-2003, zero-shot F1 on \
                      new types, inference speed (tokens/sec), and model size (MB).".into(),
        priority: TaskPriority::Critical,
        timeout: Some(Duration::from_secs(2400)),
        max_retries: 1,
        ..Default::default()
    },

    ResearchTask {
        id: 2,
        subject: "llm-structured-extraction".into(),
        preamble: "You are an NLP researcher specializing in LLM-based \
                   information extraction with structured output. Search for \
                   papers from 2024–2026 on using small LLMs (1B–7B) for \
                   web information extraction with JSON schema constraints, \
                   XPath provenance, and DOM-aware extraction.".into(),
        description: "Search for: 'LLM structured output extraction web 2024', \
                      'AXE DOM-aware extraction XPath provenance', \
                      'ScrapeGraphAI web scraping LLM', \
                      'constrained decoding information extraction', \
                      'small LLM 3B 7B information extraction accuracy'. \
                      Target: models runnable locally (<7B params, <8 GB RAM). \
                      Extract: model size, entity F1, extraction accuracy, \
                      HTML/DOM input handling, provenance support, and \
                      throughput (pages/sec) on modern CPU/GPU.".into(),
        priority: TaskPriority::Critical,
        timeout: Some(Duration::from_secs(2400)),
        max_retries: 1,
        ..Default::default()
    },

    ResearchTask {
        id: 3,
        subject: "relation-extraction-2024".into(),
        preamble: "You are an NLP researcher specializing in relation extraction \
                   from web text. Search for papers from 2024–2026 on relation \
                   extraction between entities (ORG-founded_by-PERSON, \
                   ORG-located_in-LOCATION) using dependency parsing, \
                   LLMs, or knowledge graph completion methods.".into(),
        description: "Search for: 'relation extraction LLM web text 2024', \
                      'open information extraction neural', \
                      'knowledge graph population web crawl', \
                      'dependency parsing relation extraction improvements', \
                      'CPTuning multi-relation extraction trie decoding'. \
                      Focus on extracting business relations: \
                      (company, founded_by, person), (company, located_in, city), \
                      (company, acquired_by, company). \
                      Extract: relation types supported, F1 on standard benchmarks \
                      (NYT10, DocRED), inference time, and zero-shot capability.".into(),
        priority: TaskPriority::Normal,
        timeout: Some(Duration::from_secs(2400)),
        ..Default::default()
    },

    ResearchTask {
        id: 4,
        subject: "topic-modeling-bertopic-2024".into(),
        preamble: "You are an NLP researcher specializing in topic modeling \
                   for web-scale document collections. Search for papers from \
                   2024–2026 on improvements to BERTopic, dynamic topic models, \
                   and alternatives for classifying page content into industry \
                   categories (B2B tech, AI, SaaS, fintech).".into(),
        description: "Search for: 'BERTopic improvements 2024 dynamic topics', \
                      'neural topic model web pages classification', \
                      'LLM topic labeling zero-shot classification', \
                      'online topic modeling streaming documents'. \
                      Current use: BERTopic on ChromaDB embeddings (384-dim). \
                      Find methods that handle: streaming new documents, \
                      hierarchical topics (broad industry → specific niche), \
                      and multilingual company pages. \
                      Extract: coherence score, topic stability, \
                      streaming update latency, and memory per 10K documents.".into(),
        priority: TaskPriority::Normal,
        dependencies: vec![1, 2],
        timeout: Some(Duration::from_secs(2400)),
        ..Default::default()
    },
];
```

---

## Key Research Sub-Topics

### 1. Zero-Shot / Few-Shot NER
- **GLiNER** (NAACL 2024): Generalist NER model — classify any entity type from natural language descriptions
- **NuNER Zero** (EMNLP 2024, arXiv:2402.15343): Token-level NER, +3.1% F1 over GLiNER2
- **UniversalNER**: Instruction-tuned for arbitrary entity types from Wikipedia
- Target: Add SKILL, FUNDING_AMOUNT, TECH_STACK entity types without labeling data

### 2. DOM-Aware Extraction
- **AXE** (arXiv:2602.01838, Feb 2026): 0.6B Qwen3, DOM context, XPath provenance, 88.1% F1
- **ScrapeGraphAI-100k**: Fine-tune 1.7B model on 93K real scraping examples
- HTML semantic signals: `<h1>` → company name, `<meta>` → description, JSON-LD → structured facts

### 3. Structured Output with LLMs
- Constrained decoding: only generate valid JSON matching target schema
- **Outlines / LMQL**: Grammar-constrained generation for structured extraction
- Trie-constrained decoding for relation extraction (CPTuning, arXiv:2501.02196)

### 4. Content Extraction Quality
- **Trafilatura alternatives**: Readability, newspaper4k, goose3 — benchmark on noisy press releases
- **Boilerplate detection**: Learned vs rule-based (faster, less accurate)

---

## Expected Output Format

Save each task result to `docs/research-output/03-extraction/agent-{id:02}-{subject}.md`:

```markdown
# {subject}

## Top Papers Found
| Title | Year | Venue | F1 (ORG) | F1 (new types) | Speed | Size |
|---|---|---|---|---|---|---|

## Applicable to Lead-Gen Pipeline
- Can run locally (<7B, <8 GB RAM): yes/no
- Replaces or augments BERT NER: replace/augment
- New entity types enabled: [list]
- Throughput vs current (100 pages/sec): faster/slower by X%

## Implementation Notes
- Drop-in: [yes/no — what changes in extraction.py]
- Requires re-labeling: [yes/no]
```

Synthesis: rank each paper by `(F1_delta + new_types_enabled) ÷ implementation_hours`.
