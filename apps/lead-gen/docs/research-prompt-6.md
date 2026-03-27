# Research Prompt 6 — Report Generation
## Retrieval-Augmented Generation, Hallucination Mitigation, Local LLMs

**Module**: `docs/05-report-generation.md`
**Research Crate**: `crates/research`
**Focus**: New papers (2024–2026) on RAG architecture, hallucination mitigation, chunking, local LLM deployment

---

## Research Mission

Current report generation pipeline:
- **RAG architecture**: Dual-source retrieval — SQLite (structured facts) + ChromaDB (unstructured docs, 384-dim)
- **Conditional enrichment**: ChromaDB only when SQLite facts < threshold
- **LLM**: Local Ollama (GPT-4 API fallback), grounded prompting
- **Performance**: 85% factual accuracy, 97% user satisfaction, 10–30 sec/report
- **Hallucination mitigation**: Explicit "only use provided facts" instructions, structured templates

**Gaps to close:**
- ChromaDB retrieval is simple cosine similarity — no semantic re-ranking or cross-encoder reranking
- Chunking strategy is basic — no awareness of document structure (section boundaries, entities)
- Context window: reports often exceed what SQLite+ChromaDB retrieval fills — incomplete grounding
- Long-context LLMs could eliminate chunking overhead but require careful latency management

---

## Primary Search Queries

```
"retrieval augmented generation 2025 improvements"
"agentic RAG hierarchical retrieval multi-hop"
"corrective RAG self-correction hallucination"
"chunking strategy document structure faithfulness"
"multi-agent RAG collaborative retrieval"
"graph RAG knowledge graph retrieval company"
"local LLM RAG report generation deployment"
"chain-of-thought RAG reasoning hallucination"
"long context retrieval augmented generation"
"structured output LLM grounding factual accuracy"
"semantic caching RAG latency reduction"
"cross-encoder reranking RAG retrieval"
```

---

## API Routing Guidance

| Client | Why | Filter |
|---|---|---|
| `ArxivClient` | RAG/LLM papers are on arXiv first — most active area | `sort_by: lastUpdatedDate`, `max_results: 100` |
| `SemanticScholarClient` | ACL/EMNLP/NAACL papers with citations | `year: 2024`, `min_citations: 5`, `limit: 50` |
| `OpenAlexClient` | AAAI/SIGIR/ECIR retrieval papers | `from_publication_date: 2024-01-01`, `per_page: 50` |

**Note**: RAG is the fastest-moving area — prioritize arXiv 2025–2026 preprints over conference papers.

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
    output_dir: Some("docs/research-output/06-report-generation".into()),
    scholar_concurrency: Some(3),
    synthesis_preamble: Some(
        "You are an NLP researcher specializing in retrieval-augmented generation \
         for factual report generation. Synthesize findings on RAG architecture advances, \
         hallucination mitigation, and chunking strategies. Compare against current \
         dual-source RAG (SQLite + ChromaDB, 85% factual accuracy, 10–30 sec/report). \
         Prioritize techniques that: (1) improve factual accuracy to >92%, \
         (2) reduce latency to <10 sec/report, or (3) work with local LLMs (3B–14B). \
         Note which papers require cloud LLMs vs are feasible locally.".into()
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
        subject: "rag-architecture-advances".into(),
        preamble: "You are an NLP researcher specializing in RAG system design. \
                   Search for papers from 2024–2026 on advanced RAG architectures: \
                   hierarchical retrieval, iterative retrieval, agentic RAG, \
                   and corrective RAG. Focus on improvements that maintain \
                   factual accuracy while reducing LLM inference calls.".into(),
        description: "Search for: 'A-RAG hierarchical agentic retrieval 2025', \
                      'CRAG corrective RAG semantic caching', \
                      'iterative retrieval augmented generation', \
                      'multi-hop RAG question answering 2024', \
                      'REFRAG long context faster retrieval'. \
                      Current: single-pass dual-source retrieval. \
                      Find architectures that handle multi-hop reasoning \
                      (e.g., 'Who is the CEO of the company that acquired X?'). \
                      Extract: HotpotQA/MultiHopRAG F1, latency, \
                      number of retrieval rounds, and whether it requires \
                      a separate retrieval LLM or uses the same generation model.".into(),
        priority: TaskPriority::Critical,
        timeout: Some(Duration::from_secs(2400)),
        max_retries: 1,
        ..Default::default()
    },

    ResearchTask {
        id: 2,
        subject: "hallucination-mitigation".into(),
        preamble: "You are an NLP researcher specializing in LLM hallucination \
                   mitigation. Search for papers from 2024–2026 on factual \
                   grounding techniques, citation-backed generation, \
                   self-consistency checking, and hybrid symbolic+neural \
                   approaches that enforce factual accuracy from retrieved context.".into(),
        description: "Search for: 'RAG hallucination mitigation factual grounding', \
                      'citation generation factual accuracy 2024', \
                      'self-consistency RAG multiple generations', \
                      'chain-of-thought grounded generation factual', \
                      'symbolic constraint LLM factual output'. \
                      Current: explicit prompting instructions + structured templates. \
                      Find techniques that detect and correct hallucinations \
                      automatically without human review. \
                      Extract: hallucination rate reduction (%), \
                      FActScore or similar benchmark, \
                      latency overhead vs no mitigation, \
                      and compatibility with local LLMs.".into(),
        priority: TaskPriority::Critical,
        timeout: Some(Duration::from_secs(2400)),
        max_retries: 1,
        ..Default::default()
    },

    ResearchTask {
        id: 3,
        subject: "chunking-retrieval-strategies".into(),
        preamble: "You are an information retrieval researcher. Search for papers \
                   from 2024–2026 on document chunking strategies for RAG: \
                   semantic chunking, cross-document chunking, sentence-window \
                   retrieval, and hierarchical chunking that respects document \
                   structure (sections, paragraphs, entities).".into(),
        description: "Search for: 'CDTA cross-document topic-aligned chunking', \
                      'semantic chunking document structure RAG', \
                      'sentence window retrieval RAG performance', \
                      'hierarchical chunking section-aware retrieval', \
                      'parent-child chunk retrieval context 2024'. \
                      Current: basic ChromaDB chunking with 384-dim embeddings. \
                      Find chunking methods that improve faithfulness on \
                      RAGAS/TruLens benchmarks. Extract: faithfulness score, \
                      answer relevance, chunk size recommendations, \
                      memory overhead for index, and compatible embedding models.".into(),
        priority: TaskPriority::Normal,
        timeout: Some(Duration::from_secs(2400)),
        ..Default::default()
    },

    ResearchTask {
        id: 4,
        subject: "local-llm-deployment-rag".into(),
        preamble: "You are a systems researcher specializing in local LLM deployment \
                   for RAG applications. Search for papers and technical reports \
                   from 2024–2026 on running 3B–14B parameter LLMs locally for \
                   report generation: quantization, speculative decoding, \
                   KV cache optimization, and batching strategies.".into(),
        description: "Search for: 'Qwen3 local inference RAG report generation', \
                      'Ollama local LLM deployment benchmark 2024', \
                      'speculative decoding local LLM latency', \
                      'quantization INT4 INT8 report generation quality', \
                      'KV cache optimization long context local LLM'. \
                      Target: <10 sec/report on Apple M1/M2 with 16 GB RAM. \
                      Extract: model name and size, tokens/sec on M1, \
                      quality vs GPT-4 (ROUGE, human preference), \
                      quantization level, and memory footprint.".into(),
        priority: TaskPriority::Normal,
        dependencies: vec![1],
        timeout: Some(Duration::from_secs(2400)),
        ..Default::default()
    },
];
```

---

## Key Research Sub-Topics

### 1. Advanced RAG Architectures
- **A-RAG (arXiv:2602.03442)**: Hierarchical agentic retrieval — 94.5% HotpotQA, iterative gap detection
- **CRAG/Higress-RAG (arXiv:2602.23374)**: Corrective RAG with semantic caching — 50ms latency
- **REFRAG (Meta, arXiv:2509.01092)**: 16× longer context, 30.85× faster TTFT via retrieval compression
- **MA-RAG (arXiv:2505.20096)**: Multi-agent RAG — LLaMA3-8B beats larger standalone models

### 2. Hallucination Mitigation
- **Chain-of-Citation**: Require LLM to cite source sentence for every factual claim
- **FActScore**: Measure hallucination rate at fact granularity — track improvement
- **Self-RAG**: Train LLM to decide when to retrieve, and reflect on outputs

### 3. Improved Chunking
- **CDTA (arXiv:2601.05265)**: Cross-document topic-aligned chunking — 0.93 faithfulness score
- **Sentence-window retrieval**: Retrieve sentences but include surrounding window for context
- **Late chunking**: Embed full document first, then chunk — preserves cross-sentence context

### 4. Local LLM Selection
- **Qwen 3/3.5**: Hybrid thinking mode, 14B fits on M1, native MCP tools, 95.0 IFEval
- **Ollama + llama.cpp**: Metal GPU acceleration on Apple Silicon — track benchmark vs API
- Target: <10 sec/report generation with >90% factual accuracy

---

## Expected Output Format

Save to `docs/research-output/06-report-generation/agent-{id:02}-{subject}.md`:

```markdown
# {subject}

## Top Papers Found
| Title | Year | Venue | Faithfulness | Latency | Local LLM? |
|---|---|---|---|---|---|

## vs Current Baseline (85% factual accuracy, 10–30 sec/report)
| Technique | Accuracy delta | Latency delta | Hallucination rate | Local? |
|---|---|---|---|---|

## Implementation Plan
- ChromaDB retrieval: upgrade or replace?
- Chunking: current → new strategy
- LLM: keep Ollama or switch model?
- Estimated improvement: [metric targets]
```

Synthesis: produce a **3-tier upgrade plan** — quick wins (<1 day), medium effort (1 week), and architectural changes (1 month) — each with expected factual accuracy and latency targets.
