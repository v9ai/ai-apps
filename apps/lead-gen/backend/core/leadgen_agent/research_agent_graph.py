# Requires: httpx, langchain-openai, langgraph, python-dotenv (already pulled in by llm.py)
"""Research-agent graph — Python port of the Rust `job-prep` crate.

Replaces the 10 Rust binaries (`job-prep`, `job-prep-1` … `job-prep-9`, `job-prep-all`)
with a single LangGraph graph parameterised by ``mode``:

- ``research``              — ad-hoc topic research (was ``job-prep research --topic …``)
- ``remote_job_search``     — the 15-topic sweep for AI/ML remote job strategies
- ``lead_gen_prompt_{1-9}`` — the 9 domain-specific research batches (prompts.rs)
- ``lead_gen_prompt_all``   — run all 9 lead-gen prompts back-to-back

Dropped from the Rust crate (D1/SQLite dependent, irrelevant after the port):

- ``enhance`` / ``enhance-all`` (agentic-coding + backend interview prep writing to D1)
- ``backend`` (20-agent backend prep)
- ``deep-research`` (dual-model DeepSeek+Qwen writing to D1)
- ``slug-fix`` (D1 study_topics category normalisation)
- ``app_context`` / ``research_context`` JSON round-trips

The graph is a small ReAct-style loop modelled after ``admin_chat_graph.py``:
the LLM emits ``{"tool": …, "args": …}`` or ``{"answer": …}`` JSON (the
prompt-driven router pattern is portable across providers), and tool nodes
dispatch to Semantic Scholar. Each task in a mode is a separate agent loop run in
sequence; the final node concatenates per-task findings and asks the LLM for a
synthesis (matching the Rust ``TeamLead::run`` + synthesis step).
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
from dataclasses import dataclass, field
from typing import Any, TypedDict

import httpx
from langgraph.graph import END, START, StateGraph

from .llm import ainvoke_json, is_deepseek_configured, make_llm

log = logging.getLogger(__name__)


# ─── Semantic Scholar client ──────────────────────────────────────────────

SEMANTIC_SCHOLAR_BASE = "https://api.semanticscholar.org/graph/v1"

SEARCH_FIELDS = (
    "paperId,title,abstract,year,citationCount,authors,url,openAccessPdf,"
    "fieldsOfStudy,externalIds"
)
PAPER_FIELDS_FULL = (
    "paperId,title,abstract,year,citationCount,influentialCitationCount,tldr,"
    "authors,venue,publicationDate,isOpenAccess,openAccessPdf,url,"
    "fieldsOfStudy,externalIds"
)

DEFAULT_SEARCH_LIMIT = 8
ABSTRACT_MAX_CHARS = 350
MAX_AUTHORS = 4

# Agent loop bounds (per task). Rust team.rs defaulted to a soft limit via
# max_retries=1 and per-task timeouts; we cap explicit tool calls instead.
MAX_STEPS_PER_TASK = 10
HTTP_TIMEOUT_S = 30.0


async def _scholar_get(path: str, params: dict[str, Any]) -> dict[str, Any]:
    """GET a Semantic Scholar endpoint with optional API-key auth."""
    headers: dict[str, str] = {}
    key = os.environ.get("SEMANTIC_SCHOLAR_API_KEY")
    if key:
        headers["x-api-key"] = key
    async with httpx.AsyncClient(timeout=HTTP_TIMEOUT_S) as client:
        resp = await client.get(
            f"{SEMANTIC_SCHOLAR_BASE}{path}", params=params, headers=headers
        )
        resp.raise_for_status()
        return resp.json()


def _format_papers(papers: list[dict[str, Any]], query: str, total: int) -> str:
    """Mirror Rust ``format_research_papers`` (truncated abstracts, capped authors)."""
    formatted: list[dict[str, Any]] = []
    for p in papers:
        abstract = p.get("abstract")
        if isinstance(abstract, str) and len(abstract) > ABSTRACT_MAX_CHARS:
            abstract = abstract[:ABSTRACT_MAX_CHARS] + "…"
        authors = p.get("authors") or []
        author_names = [a.get("name") for a in authors[:MAX_AUTHORS] if isinstance(a, dict)]
        pdf = p.get("openAccessPdf") or {}
        formatted.append({
            "paper_id": p.get("paperId"),
            "title": p.get("title"),
            "year": p.get("year"),
            "citations": p.get("citationCount"),
            "abstract": abstract,
            "pdf_url": pdf.get("url") if isinstance(pdf, dict) else None,
            "url": p.get("url"),
            "authors": author_names,
            "fields": p.get("fieldsOfStudy"),
        })
    return json.dumps(
        {"query": query, "total_available": total, "returned": len(formatted), "papers": formatted},
        indent=2,
    )


async def search_papers_tool(
    query: str,
    year: str | None = None,
    min_citations: int | None = None,
    limit: int = DEFAULT_SEARCH_LIMIT,
) -> str:
    """Semantic Scholar bulk search — returns a JSON string for the LLM."""
    limit = max(1, min(100, int(limit)))
    params: dict[str, Any] = {
        "query": query,
        "fields": SEARCH_FIELDS,
        "limit": limit,
        "sort": "citationCount:desc",
    }
    if year:
        params["year"] = year
    if min_citations is not None:
        params["minCitationCount"] = int(min_citations)
    try:
        data = await _scholar_get("/paper/search/bulk", params)
    except httpx.HTTPError as exc:
        return f"Error: search_papers failed: {exc}"
    papers = data.get("data") or []
    total = int(data.get("total") or len(papers))
    return _format_papers(papers, query, total)


async def get_paper_detail_tool(paper_id: str) -> str:
    """Semantic Scholar paper detail — accepts S2 ID, arXiv:XXX, DOI:XXX, PMID:XXX."""
    try:
        data = await _scholar_get(f"/paper/{paper_id}", {"fields": PAPER_FIELDS_FULL})
    except httpx.HTTPError as exc:
        return f"Error: get_paper_detail failed: {exc}"
    tldr = data.get("tldr") or {}
    pdf = data.get("openAccessPdf") or {}
    authors = data.get("authors") or []
    obj = {
        "paper_id": data.get("paperId"),
        "title": data.get("title"),
        "year": data.get("year"),
        "citations": data.get("citationCount"),
        "influential_citations": data.get("influentialCitationCount"),
        "tldr": tldr.get("text") if isinstance(tldr, dict) else None,
        "abstract": data.get("abstract"),
        "authors": [a.get("name") for a in authors if isinstance(a, dict)],
        "venue": data.get("venue"),
        "publication_date": data.get("publicationDate"),
        "is_open_access": data.get("isOpenAccess"),
        "pdf_url": pdf.get("url") if isinstance(pdf, dict) else None,
        "url": data.get("url"),
        "fields_of_study": data.get("fieldsOfStudy"),
    }
    return json.dumps(obj, indent=2)


# ─── Task / mode definitions ──────────────────────────────────────────────


@dataclass
class ResearchTask:
    """Single agent assignment within a mode (mirrors Rust ``ResearchTask``)."""

    task_id: int
    subject: str
    preamble: str
    description: str


@dataclass
class ModeSpec:
    """Collection of tasks plus the synthesis preamble that closes them out."""

    label: str
    synthesis_preamble: str
    tasks: list[ResearchTask] = field(default_factory=list)


# ── Lead-gen research prompts 1–9 (summarised from crates/job-prep/src/prompts.rs)
#
# The Rust file carries ~600 lines of per-task preamble + description text. We
# keep the structure but compress the prose — the LLM only needs the research
# question, the search seed, and the comparison baseline to drive tool calls.
# If a caller wants the verbatim original prompts they can still run the Rust
# crate from git history; the graph's synthesis node produces equivalent output.

LEAD_GEN_PROMPTS: dict[int, ModeSpec] = {
    1: ModeSpec(
        label="System Architecture",
        synthesis_preamble=(
            "You are a systems ML researcher. Synthesise findings on local-first ML "
            "infrastructure: memory efficiency, zero-copy data exchange, and "
            "privacy-preserving edge deployment. Contrast each approach against the "
            "current pipeline (SQLite WAL + LanceDB + ChromaDB + asyncio) and rank "
            "upgrades by impact × ease of implementation."
        ),
        tasks=[
            ResearchTask(
                1,
                "rust-ml-backends",
                "You are a systems engineer specialising in high-performance Rust ML runtimes.",
                "Search for: 'Burn framework Rust deep learning benchmark', "
                "'ONNX runtime Rust inference performance 2024', "
                "'candle ML framework Rust Apple Silicon', 'tract ONNX inference safe Rust production', "
                "'CubeCL Rust GPU kernel cross-platform'. Extract: framework, hardware, latency, "
                "memory, ops, SIMD/Metal acceleration. Report top 10 papers with key metrics.",
            ),
            ResearchTask(
                2,
                "zero-copy-data-pipelines",
                "You are a database systems researcher specialising in zero-copy data exchange.",
                "Search for: 'Apache Arrow ADBC zero-copy database 2024', "
                "'Arrow Flight streaming ML pipeline', 'shared memory tensor interop Rust Python', "
                "'zero-copy serialisation machine learning pipeline'. "
                "Extract serialisation overhead (ms/MB), speedup factor, memory reduction.",
            ),
            ResearchTask(
                3,
                "embedded-vector-db-alternatives",
                "You are a database researcher specialising in embedded vector search (<100K vectors).",
                "Search for: 'embedded vector search SQLite extension benchmark', "
                "'DiskANN disk-based ANN low memory', 'HNSW vs IVF embedded vector database 2024', "
                "'Qdrant embedded in-process vector search'. "
                "Compare recall@10, latency, index build time, and memory footprint.",
            ),
        ],
    ),
    2: ModeSpec(
        label="RL Crawler",
        synthesis_preamble=(
            "You are an RL researcher specialising in web information retrieval. "
            "Synthesise findings on DQN-based URL selection and bandit-based domain "
            "scheduling. Compare against the current DQN+UCB1+PER baseline "
            "(15% harvest rate, 448-dim state). Rank by expected harvest-rate "
            "improvement ÷ implementation days."
        ),
        tasks=[
            ResearchTask(
                1,
                "dqn-url-selection-advances",
                "You are an RL researcher specialising in deep Q-networks for IR.",
                "Search for: 'deep Q-network focused web crawling 2024', "
                "'dueling DQN distributional RL web navigation', "
                "'LLM state encoder reinforcement learning URL selection', "
                "'Rainbow DQN information retrieval focused crawler'. "
                "Extract state dim, architecture, harvest rate improvement, training data needed, inference latency.",
            ),
            ResearchTask(
                2,
                "bandit-domain-scheduling",
                "You are a bandit algorithms researcher.",
                "Search for: 'LARL latent autoregressive bandit temporal drift RLC 2025', "
                "'M2-CMAB multi-constraint bandit Lagrangian web', "
                "'sliding window UCB non-stationary domain yield', "
                "'contextual bandit domain scheduling web crawler 2024'. "
                "Extract regret bounds, adaptation speed, constraint satisfaction, overhead vs UCB1.",
            ),
            ResearchTask(
                3,
                "llm-world-model-crawling",
                "You are an AI researcher specialising in LLM-based web agents.",
                "Search for: 'WebRL self-evolving curriculum reinforcement learning ICLR 2025', "
                "'WebDreamer LLM world model web navigation TMLR 2025', "
                "'OpAgent hybrid reward WebJudge web agent arXiv 2026', "
                "'LLM web agent focused crawling quality 2025'. "
                "Extract success on WebArena/Mind2Web, LLM size, inference cost per page.",
            ),
            ResearchTask(
                4,
                "reward-shaping-curriculum",
                "You are an RL researcher specialising in sparse reward problems and curriculum learning.",
                "Search for: 'DISCOVER auto-curriculum goal selection NeurIPS 2025', "
                "'semi-supervised reward shaping sparse reward web crawling arXiv 2026', "
                "'ARB adaptive replay buffer on-policy alignment arXiv 2025', "
                "'Craw4LLM content quality pre-filter URL ACL 2025', "
                "'QMin quality propagation minimum inlinking SIGIR 2025'. "
                "Extract improvement over PER baseline, implementation complexity, sample efficiency.",
            ),
        ],
    ),
    3: ModeSpec(
        label="Extraction / NER",
        synthesis_preamble=(
            "You are an NLP researcher specialising in information extraction for web-scale data. "
            "Synthesise findings on NER and relation extraction. Compare against current BERT NER "
            "(F1 92.3%, ~100 pages/sec). Rank each paper by (F1_delta + new_types_enabled) ÷ hours."
        ),
        tasks=[
            ResearchTask(
                1,
                "zero-shot-ner-advances",
                "You are an NLP researcher specialising in zero-shot and few-shot NER.",
                "Search for: 'GLiNER zero-shot NER generalisation 2024', "
                "'NuNER Zero token-level entity recognition EMNLP 2024', "
                "'UniversalNER instruction-tuned entity recognition', "
                "'span classification NER few-shot 2024 2025'. "
                "Extract model name, F1 CoNLL-2003, zero-shot F1, inference speed, size.",
            ),
            ResearchTask(
                2,
                "llm-structured-extraction",
                "You are an NLP researcher specialising in LLM-based IE with structured output.",
                "Search for: 'AXE DOM-aware web extraction XPath provenance arXiv 2026', "
                "'ScrapeGraphAI web scraping LLM fine-tuning 2025', "
                "'constrained decoding JSON schema information extraction', "
                "'small LLM 3B 7B information extraction web accuracy'. "
                "Extract size, F1, HTML handling, provenance, throughput.",
            ),
            ResearchTask(
                3,
                "relation-extraction-2024",
                "You are an NLP researcher specialising in relation extraction.",
                "Search for: 'relation extraction LLM web text 2024 2025', "
                "'open information extraction neural 2024', "
                "'CPTuning multi-relation extraction trie decoding arXiv 2025', "
                "'KGGen entity relation extraction iterative NeurIPS 2025'. "
                "Extract relation types, F1 on NYT10/DocRED, zero-shot capability.",
            ),
            ResearchTask(
                4,
                "topic-modeling-bertopic-2024",
                "You are an NLP researcher specialising in topic modeling for web-scale collections.",
                "Search for: 'BERTopic improvements dynamic topics 2024 2025', "
                "'neural topic model web pages classification streaming', "
                "'LLM topic labeling zero-shot industry classification', "
                "'online topic modeling streaming documents'. "
                "Extract coherence, topic stability, streaming update latency.",
            ),
        ],
    ),
    4: ModeSpec(
        label="Entity Resolution",
        synthesis_preamble=(
            "You are a database researcher specialising in entity resolution at scale. "
            "Compare against current Siamese + SQL blocking (P=96.8%, R=84.2%, F1=90.1%). "
            "Identify the single highest-ROI change to raise recall >90% without sacrificing precision."
        ),
        tasks=[
            ResearchTask(
                1,
                "zero-shot-entity-matching",
                "You are a database researcher specialising in zero-shot entity matching.",
                "Search for: 'AnyMatch zero-shot entity matching SLM AAAI 2025', "
                "'zero-shot record linkage pre-trained language model 2024', "
                "'in-context learning entity resolution LLM GPT', "
                "'Eridu embeddings contrastive company person matching', "
                "'foundation model entity matching without labels 2024 2025'. "
                "Extract benchmark dataset, P/R/F1, model size, inference cost per pair.",
            ),
            ResearchTask(
                2,
                "llm-distillation-er",
                "You are an ML researcher specialising in knowledge distillation for ER.",
                "Search for: 'DistillER LLM distillation entity matching EDBT 2026', "
                "'knowledge distillation entity resolution small model teacher student', "
                "'LLM annotation entity resolution training data generation', "
                "'GPT-4 labeler entity matching fine-tune local model 2024'. "
                "Extract student size, F1 vs teacher, distillation data size, inference latency.",
            ),
            ResearchTask(
                3,
                "graph-neural-network-er",
                "You are a graph ML researcher specialising in multi-source ER.",
                "Search for: 'GraLMatch multi-source entity group matching EDBT 2025', "
                "'GraphER property graph GDD GNN entity resolution 2025', "
                "'graph neural network entity resolution multi-source 2024', "
                "'OpenSanctions logic-v2 deterministic company matching'. "
                "Extract F1 on DBLP-ACM/Amazon-Google/Walmart-Amazon, training time, memory.",
            ),
        ],
    ),
    5: ModeSpec(
        label="Lead Matching & Scoring",
        synthesis_preamble=(
            "You are an ML researcher specialising in tabular classification for B2B sales. "
            "Compare against current XGBoost ensemble (P=89.7%, R=86.5%, F1=0.88, ~1000 leads/sec). "
            "Produce a decision matrix for replacing vs augmenting XGBoost."
        ),
        tasks=[
            ResearchTask(
                1,
                "tabular-foundation-models",
                "You are an ML researcher specialising in tabular learning.",
                "Search for: 'TabPFN-2.5 tabular prior-data fitted network arXiv 2025', "
                "'TabM BatchEnsemble MLP tabular ICLR 2025', "
                "'ModernNCA retrieval-based tabular learning ICLR 2025', "
                "'in-context learning tabular classification 2024 2025', "
                "'SAINT self-attention tabular improvements 2024'. "
                "Extract F1 on OpenML, training sample efficiency, inference latency.",
            ),
            ResearchTask(
                2,
                "calibration-distribution-shift",
                "You are an ML researcher specialising in probability calibration and distribution shift.",
                "Search for: 'COP conformal online prediction distribution shift ICLR 2026', "
                "'SmartCal automated calibration selection AutoML 2025', "
                "'online calibration tabular distribution shift 2024', "
                "'conformal prediction tabular classification 2024 2025'. "
                "Extract ECE before/after, calibration update latency, coverage guarantees.",
            ),
            ResearchTask(
                3,
                "temporal-event-signals",
                "You are an ML researcher specialising in temporal event sequences for business prediction.",
                "Search for: 'Hawkes process attention lead scoring temporal event arXiv 2025', "
                "'funding event sequence company classification ML', "
                "'temporal graph network company signal B2B', "
                "'hiring activity prediction company readiness ML 2024'. "
                "Extract AUC improvement, event types, sequence length, inference latency.",
            ),
            ResearchTask(
                4,
                "icp-embedding-retrieval",
                "You are an ML researcher specialising in embedding-based retrieval for B2B.",
                "Search for: 'ideal customer profile embedding contrastive learning B2B', "
                "'company profile similarity dense retrieval 2024', "
                "'retrieval augmented classification tabular business', "
                "'dense retrieval tabular features company similarity matching'. "
                "Extract embedding dim, retrieval speed on 100K candidates, F1 on ICP matching.",
            ),
        ],
    ),
    6: ModeSpec(
        label="Report Generation / RAG",
        synthesis_preamble=(
            "You are an NLP researcher specialising in RAG for factual report generation. "
            "Compare against current dual-source RAG (85% factual accuracy, 10–30 sec/report). "
            "Produce a 3-tier upgrade plan: quick wins (<1 day), medium (1 week), architectural (1 month)."
        ),
        tasks=[
            ResearchTask(
                1,
                "rag-architecture-advances",
                "You are an NLP researcher specialising in RAG system design.",
                "Search for: 'A-RAG hierarchical agentic retrieval HotpotQA arXiv 2025', "
                "'CRAG corrective RAG semantic caching latency 2025', "
                "'REFRAG long context retrieval compression Meta arXiv 2025', "
                "'MA-RAG multi-agent collaborative retrieval LLaMA 2025', "
                "'iterative RAG multi-hop question answering 2024'. "
                "Extract HotpotQA/MultiHopRAG F1, latency, retrieval rounds.",
            ),
            ResearchTask(
                2,
                "hallucination-mitigation",
                "You are an NLP researcher specialising in LLM hallucination mitigation.",
                "Search for: 'RAG hallucination mitigation factual grounding 2024 2025', "
                "'citation generation factual accuracy FActScore 2024', "
                "'self-consistency RAG multiple sampling grounding', "
                "'chain-of-thought grounded generation structured output factual'. "
                "Extract hallucination reduction %, FActScore, latency overhead.",
            ),
            ResearchTask(
                3,
                "chunking-retrieval-strategies",
                "You are an IR researcher specialising in document chunking for RAG.",
                "Search for: 'CDTA cross-document topic-aligned chunking faithfulness 2025', "
                "'semantic chunking document structure RAG 2024', "
                "'late chunking full document embedding chunk', "
                "'sentence window retrieval context RAG 2024', "
                "'parent child chunk retrieval hierarchical 2024'. "
                "Extract faithfulness, answer relevance, chunk size recommendations.",
            ),
            ResearchTask(
                4,
                "local-llm-deployment-rag",
                "You are a systems researcher specialising in local LLM deployment for RAG.",
                "Search for: 'Qwen3 local inference RAG deployment 2025', "
                "'Ollama llama.cpp Apple Silicon Metal benchmark 2024', "
                "'speculative decoding local LLM latency reduction', "
                "'INT4 INT8 quantization report generation quality tradeoff'. "
                "Extract model size, tokens/sec on M1, quality vs GPT-4, memory footprint.",
            ),
        ],
    ),
    7: ModeSpec(
        label="Evaluation",
        synthesis_preamble=(
            "You are an ML evaluation researcher. Compare against current evaluation: "
            "CER ~0.15, LLM-as-judge regression tests, manual ablation studies. "
            "Produce an evaluation enhancement roadmap."
        ),
        tasks=[
            ResearchTask(
                1,
                "llm-as-judge-reliability",
                "You are an NLP evaluation researcher.",
                "Search for: 'LLM judge reliability bias position length 2024', "
                "'LLM evaluator consistency agreement human judge 2024 2025', "
                "'MT-Bench Chatbot Arena evaluation bias 2024', "
                "'calibration LLM judge model reliability 2025'. "
                "Extract bias types, correlation with humans (κ/Spearman), correction techniques.",
            ),
            ResearchTask(
                2,
                "cascade-error-attribution",
                "You are an ML systems researcher specialising in error propagation.",
                "Search for: 'cascade error propagation multi-stage NLP pipeline 2024', "
                "'error attribution automated pipeline information extraction', "
                "'counterfactual analysis NLP pipeline robustness 2024', "
                "'compound AI system evaluation error propagation 2025'. "
                "Extract attribution method, exact vs approximate, overhead per prediction.",
            ),
            ResearchTask(
                3,
                "drift-detection-explainability",
                "You are an ML reliability researcher.",
                "Search for: 'concept drift detection NLP streaming 2024', "
                "'SHAP attribution XGBoost tabular production monitoring', "
                "'explainable lead scoring feature attribution B2B', "
                "'online drift detection web content distribution shift 2024', "
                "'counterfactual explanation classification scoring 2024 2025'. "
                "Extract detection delay, false positive rate, overhead, label-free capability.",
            ),
        ],
    ),
    8: ModeSpec(
        label="Pipeline Synthesis / Roadmap",
        synthesis_preamble=(
            "You are a systems architect specialising in ML pipeline optimisation. "
            "Current: 50K pages → 300 leads (0.6% yield), 10 pages/sec bottleneck, "
            "$1,500/year hardware. Produce a 12-month roadmap with quarterly milestones."
        ),
        tasks=[
            ResearchTask(
                1,
                "end-to-end-pipeline-surveys",
                "You are a systems researcher.",
                "Search for: 'end-to-end pipeline web information extraction survey 2024', "
                "'knowledge graph construction web crawl pipeline ML 2024', "
                "'automated company intelligence pipeline machine learning', "
                "'multi-stage NLP pipeline optimisation survey 2024 2025', "
                "'B2B lead generation AI automated pipeline 2024'. "
                "Extract stages covered, bottlenecks identified, recommended architectures.",
            ),
            ResearchTask(
                2,
                "cost-efficiency-active-learning",
                "You are an MLOps researcher.",
                "Search for: 'local vs cloud ML deployment cost analysis 2024', "
                "'active learning data flywheel ML pipeline improvement', "
                "'continuous learning pipeline production deployment 2024', "
                "'ML pipeline cost optimisation edge inference'. "
                "Extract cost comparison methodology, breakeven analysis, active learning strategy.",
            ),
        ],
    ),
    9: ModeSpec(
        label="Novelty Hunt 2025–2026",
        synthesis_preamble=(
            "You are a research scout. SKIP any technique already in the known index: "
            "Craw4LLM, QMin, LARL, ARB, WebDreamer, OpAgent, M2-CMAB, DISCOVER, WebRL, AXE, "
            "NuNER Zero, SeNER, KGGen, CPTuning, ScrapeGraphAI-100k, DistillER, AnyMatch, "
            "OpenSanctions logic-v2, GraLMatch, Eridu, GraphER, TabPFN-2.5, TabM, COP, SmartCal, "
            "ModernNCA, Hawkes Attention, A-RAG, CRAG, CDTA, CoT-RAG, REFRAG, MA-RAG, GFM-RAG. "
            "For each new paper: classify module (1–7), state the breakthrough, and whether "
            "it supersedes a documented technique. Output a diff: ADD/UPDATE/DEPRECATE."
        ),
        tasks=[
            ResearchTask(
                1,
                "novelty-infrastructure-2026",
                "You are a systems ML researcher scouting for 2026 infrastructure breakthroughs.",
                "Search arXiv cs.LG+cs.DC for: 'Rust ML inference 2025 2026 Burn CubeCL Candle', "
                "'Apple MLX machine learning framework 2025', "
                "'embedded vector database 2026 benchmark sqlite-vec'. "
                "Flag papers superseding LanceDB, ChromaDB, or SQLite.",
            ),
            ResearchTask(
                2,
                "novelty-crawler-2026",
                "You are an RL web crawling researcher scouting for 2026 breakthroughs.",
                "Search arXiv cs.LG+cs.IR from 2026-01-01 for: 'web crawling reinforcement learning 2026 new', "
                "'web agent navigation benchmark 2026', 'focused crawler LLM quality 2026'. "
                "State which known technique each paper improves upon.",
            ),
            ResearchTask(
                3,
                "novelty-extraction-er-2026",
                "You are an NLP researcher scouting 2026 breakthroughs in NER/RE/ER.",
                "Search arXiv cs.CL from 2026-01-01 for: 'named entity recognition 2026 new method benchmark', "
                "'entity resolution LLM 2026 new approach', 'web extraction benchmark 2026', "
                "'zero-shot entity matching 2026', 'NER structured output LLM 2026'. "
                "State F1 / speed delta vs the known technique each replaces.",
            ),
            ResearchTask(
                4,
                "novelty-scoring-rag-2026",
                "You are an ML researcher scouting 2026 tabular + RAG breakthroughs.",
                "Search arXiv cs.LG+cs.AI from 2026-01-01 for: 'tabular classification 2026 new method benchmark', "
                "'retrieval augmented generation 2026 new architecture', 'RAG evaluation benchmark 2026', "
                "'tabular learning 2026', 'generative AI report grounding 2026'. "
                "Benchmark new tabular papers against TabPFN-2.5; new RAG papers against REFRAG.",
            ),
            ResearchTask(
                5,
                "novelty-synthesis-gaps",
                "You are a research strategist.",
                "Search for: 'privacy-preserving web crawling GDPR 2025 2026', "
                "'multilingual entity resolution company 2025 2026', "
                "'federated learning lead generation pipeline', "
                "'compliance GDPR web data ML pipeline 2025'. "
                "Synthesise which modules have the most undocumented 2026 activity, "
                "techniques superseding 3+ documented methods, and new module candidates.",
            ),
        ],
    ),
}


# ── Remote-job-search topics (from remote_job_search.rs — 15-agent sweep) ───
#
# Each topic becomes one ResearchTask; the synthesis preamble is generic.

_REMOTE_JOB_TOPICS: list[tuple[str, str, str]] = [
    (
        "ai-engineer-job-market-2025",
        "AI engineer job market trends 2024 2025; machine learning engineer hiring demand remote.",
        "Current AI/ML hiring landscape: which roles are in highest demand, which companies hire "
        "remotely worldwide, remote vs hybrid ratios, compensation trends for AI engineers.",
    ),
    (
        "ai-ml-skill-signals-hiring",
        "AI skills hiring signals machine learning engineers; LLM engineering skills employer demand 2024.",
        "Which AI skills (LLMs, MLOps, agents, fine-tuning, RAG, embeddings) signal strongest in "
        "hiring pipelines. What technical skills differentiate candidates for AI engineering roles.",
    ),
    (
        "ai-engineer-resume-optimization",
        "Resume optimization software engineering ATS systems; CV keyword matching machine learning hiring.",
        "Resume/CV optimization for AI roles: ATS keyword matching, skill framing, project descriptions, "
        "quantifying ML impact. What recruiters scan for in AI engineer resumes.",
    ),
    (
        "ai-technical-interview-prep",
        "Machine learning technical interview preparation; AI system design interview assessment methods.",
        "AI/ML technical interviews: ML system design, coding challenges, theory, take-home projects, "
        "live coding assessments.",
    ),
    (
        "ai-portfolio-projects-hiring",
        "Portfolio projects hiring software engineers; open source contributions developer hiring signal.",
        "Portfolio-based hiring for AI: which projects impress hiring managers, OSS contributions, "
        "demo apps, GitHub profile optimization, technical blog posts.",
    ),
    (
        "networking-referrals-tech-jobs",
        "Employee referral hiring probability tech industry; professional networking job search effectiveness.",
        "Referral impact on hiring probability, cold outreach effectiveness, developer community "
        "engagement, conference networking, LinkedIn strategies for AI engineers.",
    ),
    (
        "job-search-platforms-ai-roles",
        "Job search platform effectiveness AI ML; remote job board hiring AI ML engineer.",
        "Which job platforms (LinkedIn, Wellfound, Otta, AI-Jobs.net, YC Work at a Startup) yield the "
        "highest response rate for AI engineers.",
    ),
    (
        "cold-outreach-hiring-managers",
        "Cold outreach hiring managers recruiters effectiveness; direct application job search success rate.",
        "Cold outreach playbooks for AI roles: DM templates, hiring manager LinkedIn outreach, "
        "founder-direct cold emails, Show HN launches as application vectors.",
    ),
    (
        "remote-work-hiring-trends-global",
        "Remote work hiring trends 2024 2025 global; fully distributed company AI hiring patterns.",
        "Which countries/regions hire remotely for AI roles most aggressively. Time-zone constraints, "
        "payroll vendors (Deel/Remote/Oyster), legal models for global contractors.",
    ),
    (
        "ai-startup-early-stage-hiring",
        "Early stage startup AI engineer hiring; YC seed series A machine learning engineer recruitment.",
        "Seed-through-Series-B AI startup hiring: what skills early-stage teams value, equity/salary "
        "tradeoffs, 'founding engineer' roles, where to find these opportunities.",
    ),
    (
        "big-tech-ai-hiring-processes",
        "Big tech AI ML engineer hiring process FAANG Google Meta; technical interview pipeline AI roles.",
        "FAANG + next-tier (Anthropic, OpenAI, Cohere, Scale, Hugging Face) AI hiring: phone screens, "
        "on-sites, levelling, compensation bands. Remote eligibility patterns.",
    ),
    (
        "compensation-negotiation-ai-roles",
        "Salary negotiation machine learning engineer AI; equity compensation startup software engineer.",
        "Compensation negotiation for AI roles: base vs equity, signing bonus, levelling leverage, "
        "data sources (Levels.fyi, Blind, Glassdoor).",
    ),
    (
        "career-transitions-to-ai-engineering",
        "Career transition software engineer to machine learning; bootcamp certification AI engineer hiring.",
        "Transitioning to AI engineering from SWE/data/DevOps: portfolio strategies, degree signalling, "
        "how recruiters treat bootcamps vs MS/PhD vs self-taught.",
    ),
    (
        "remote-onboarding-ai-team-integration",
        "Remote onboarding software engineer team integration; distributed team culture engineering productivity.",
        "First-90-days playbooks for remote AI hires: async-first comms, code review norms, "
        "time-zone overlap expectations.",
    ),
    (
        "ai-consulting-contracting-remote",
        "AI ML consulting contract engineer remote work; freelance machine learning engineering income.",
        "AI/ML contracting & consulting: rate cards, marketplaces (Toptal, A.Team, Gun.io), "
        "direct client acquisition, scoping 1–3 month engagements.",
    ),
]


def _remote_job_search_spec() -> ModeSpec:
    return ModeSpec(
        label="Remote AI/ML Job Search",
        synthesis_preamble=(
            "You are a career strategist synthesising findings across 15 remote-job-search topics. "
            "Produce a master playbook with: (1) ranked high-leverage actions for landing a fully "
            "remote AI engineering role worldwide, (2) week-by-week execution plan, "
            "(3) which channels yield the highest response rate. Cite the per-topic findings."
        ),
        tasks=[
            ResearchTask(
                task_id=idx + 1,
                subject=slug,
                preamble=f"You are a career researcher focused on: {focus}",
                description=f"Search Semantic Scholar for: {queries} "
                "Then get_paper_detail on the 2–3 most relevant. "
                "Extract actionable advice for a remote AI engineer job search worldwide.",
            )
            for idx, (slug, queries, focus) in enumerate(_REMOTE_JOB_TOPICS)
        ],
    )


def _research_mode_spec(state: ResearchAgentState) -> ModeSpec:
    """Build a one-task spec from an ad-hoc topic request."""
    topic = (state.get("topic") or "").strip() or "remote work trends"
    raw_focus = state.get("focus_areas") or [
        "remote work",
        "distributed teams",
        "global employment",
    ]
    focus = ", ".join(raw_focus)
    queries = [
        topic,
        *[f"{topic} {area}" for area in raw_focus],
        f"{topic} job board recruitment platform",
        f"{topic} NLP machine learning classification",
        f"{topic} global remote work distributed teams",
    ]
    description = (
        "Run search_papers for each of these queries: "
        + "; ".join(f'"{q}"' for q in queries)
        + ". Then get_paper_detail on the 4–5 most promising. Prioritise papers with concrete "
        "implementations, benchmarks, ≥5 citations from 2020+. Extract actionable insights for a "
        "global remote job board aggregator."
    )
    return ModeSpec(
        label=f"Research: {topic}",
        synthesis_preamble=(
            f"You are a research analyst for a global remote job board aggregator. Topic: {topic}. "
            f"Focus areas: {focus}. Produce a structured markdown report with Executive Summary, "
            "Papers Reviewed, Aggregated Insights, Implementation Roadmap (P0/P1/P2), Open Questions, "
            "and Confidence Assessment."
        ),
        tasks=[
            ResearchTask(
                task_id=1,
                subject="research",
                preamble=(
                    "You are a research analyst for lead-gen (global remote job board aggregator). "
                    "Use search_papers and get_paper_detail to survey the literature."
                ),
                description=description,
            )
        ],
    )


# ─── LangGraph state + nodes ──────────────────────────────────────────────


class ResearchAgentState(TypedDict, total=False):
    # input
    mode: str                       # "research" | "remote_job_search" | "lead_gen_prompt_{1..9,all}"
    topic: str                      # for mode="research"
    focus_areas: list[str]          # for mode="research"
    # internal
    specs: list[dict[str, Any]]     # serialised list of ModeSpec for fan-out
    findings: list[dict[str, Any]]  # per-task { spec_label, task_id, subject, content }
    # output
    report: str                     # final synthesis markdown
    error: str                      # populated if something went fatally wrong


_AGENT_STEP_INSTRUCTION = (
    "Return JSON only, one of two shapes:\n"
    '  {"tool": "search_papers"|"get_paper_detail", "args": {...}}\n'
    '  {"answer": "<final markdown analysis>"}\n'
    "Emit `answer` as soon as you have ≥3 strong papers. Do not exceed "
    f"{MAX_STEPS_PER_TASK} tool calls per task."
)

_TOOLS_DOC = (
    "Tools:\n"
    "- search_papers(query: str, year?: str, min_citations?: int, limit?: int) — "
    "Semantic Scholar bulk search sorted by citation count.\n"
    "- get_paper_detail(paper_id: str) — full detail for one paper. "
    "Accepts S2 paperId, arXiv:XXX, DOI:XXX, PMID:XXX.\n"
)


async def _dispatch_tool(tool: str, args: dict[str, Any]) -> str:
    if tool == "search_papers":
        return await search_papers_tool(
            query=str(args.get("query", "")),
            year=args.get("year"),
            min_citations=args.get("min_citations"),
            limit=int(args.get("limit") or DEFAULT_SEARCH_LIMIT),
        )
    if tool == "get_paper_detail":
        return await get_paper_detail_tool(str(args.get("paper_id", "")))
    return f"Error: unknown tool '{tool}'. Use search_papers or get_paper_detail."


async def _run_task(
    spec: ModeSpec,
    task: ResearchTask,
    *,
    provider: str | None = None,
) -> str:
    """Agent loop for a single ResearchTask. Returns markdown content."""
    llm = make_llm(provider=provider)
    system = (
        f"{task.preamble}\n\n"
        "You have access to Semantic Scholar via tool calls. Standards: run ≥3 search_papers "
        "calls with different queries; call get_paper_detail on the 3–4 most promising papers; "
        "weight recent (2020+) papers higher; report confidence honestly.\n\n"
        f"{_TOOLS_DOC}\n{_AGENT_STEP_INSTRUCTION}"
    )
    transcript: list[str] = [f"Task {task.task_id} — {task.subject}\n\n{task.description}"]

    for step in range(MAX_STEPS_PER_TASK):
        try:
            result = await ainvoke_json(
                llm,
                [
                    {"role": "system", "content": system},
                    {"role": "user", "content": "\n\n".join(transcript)},
                ],
                provider=provider,
            )
        except Exception as exc:
            log.warning("task %s step %d: LLM call failed: %s", task.subject, step, exc)
            return f"# {task.subject}\n\n_LLM call failed: {exc}_"

        if not isinstance(result, dict):
            return f"# {task.subject}\n\n{result}"
        if "answer" in result:
            return str(result["answer"])

        tool = str(result.get("tool", ""))
        args = result.get("args", {}) or {}
        if not isinstance(args, dict):
            args = {}
        observation = await _dispatch_tool(tool, args)
        # Truncate observations to keep prompts bounded.
        if len(observation) > 6000:
            observation = observation[:6000] + "\n…(truncated)"
        transcript.append(f"Tool {tool}({json.dumps(args)}) returned:\n{observation}")

    # Loop exhausted — ask for a best-effort wrap-up.
    try:
        final = await ainvoke_json(
            llm,
            [
                {"role": "system", "content": "Emit ONLY {\"answer\": \"<markdown>\"} now."},
                {"role": "user", "content": "\n\n".join(transcript)},
            ],
            provider=provider,
        )
        if isinstance(final, dict) and "answer" in final:
            return str(final["answer"])
    except Exception as exc:
        log.warning("task %s wrap-up failed: %s", task.subject, exc)
    return f"# {task.subject}\n\n_Max steps reached without final answer._"


def _resolve_specs(mode: str, state: ResearchAgentState) -> list[ModeSpec]:
    mode = (mode or "").strip().lower()
    if mode == "research":
        return [_research_mode_spec(state)]
    if mode == "remote_job_search":
        return [_remote_job_search_spec()]
    if mode == "lead_gen_prompt_all":
        return [LEAD_GEN_PROMPTS[n] for n in sorted(LEAD_GEN_PROMPTS)]
    if mode.startswith("lead_gen_prompt_"):
        try:
            n = int(mode.rsplit("_", 1)[-1])
        except ValueError:
            raise ValueError(f"invalid mode {mode!r}: expected lead_gen_prompt_1..9")
        if n not in LEAD_GEN_PROMPTS:
            raise ValueError(f"invalid prompt number {n}: valid range is 1..9")
        return [LEAD_GEN_PROMPTS[n]]
    raise ValueError(
        f"unknown mode {mode!r}: expected research | remote_job_search | "
        "lead_gen_prompt_{1..9} | lead_gen_prompt_all"
    )


async def plan_node(state: ResearchAgentState) -> dict[str, Any]:
    """Expand ``mode`` into a serialisable list of specs for ``run_tasks``."""
    try:
        specs = _resolve_specs(state.get("mode") or "research", state)
    except ValueError as exc:
        log.error("plan_node: %s", exc)
        return {"error": str(exc), "specs": [], "findings": []}

    serialised: list[dict[str, Any]] = []
    for spec in specs:
        serialised.append({
            "label": spec.label,
            "synthesis_preamble": spec.synthesis_preamble,
            "tasks": [
                {
                    "task_id": t.task_id,
                    "subject": t.subject,
                    "preamble": t.preamble,
                    "description": t.description,
                }
                for t in spec.tasks
            ],
        })
    return {"specs": serialised, "findings": []}


async def run_tasks_node(state: ResearchAgentState) -> dict[str, Any]:
    """Execute every task in every spec. Tasks within a spec run in parallel."""
    specs = state.get("specs") or []
    if not specs:
        return {"findings": []}

    provider: str | None = "deepseek" if is_deepseek_configured() else None
    all_findings: list[dict[str, Any]] = []

    for spec_data in specs:
        mode_spec = ModeSpec(
            label=spec_data["label"],
            synthesis_preamble=spec_data["synthesis_preamble"],
            tasks=[ResearchTask(**t) for t in spec_data.get("tasks", [])],
        )
        log.info("research_agent: running %d tasks for %r", len(mode_spec.tasks), mode_spec.label)
        # Parallel fan-out per spec (Rust TeamLead did the same via JoinSet).
        coros = [_run_task(mode_spec, task, provider=provider) for task in mode_spec.tasks]
        results = await asyncio.gather(*coros, return_exceptions=True)
        for task, res in zip(mode_spec.tasks, results):
            if isinstance(res, Exception):
                log.warning("task %s raised: %s", task.subject, res)
                content = f"# {task.subject}\n\n_Task raised: {res}_"
            else:
                content = str(res)
            all_findings.append({
                "spec_label": mode_spec.label,
                "task_id": task.task_id,
                "subject": task.subject,
                "content": content,
            })
    return {"findings": all_findings}


async def synthesize_node(state: ResearchAgentState) -> dict[str, Any]:
    """Ask the LLM to combine per-task markdown into a single report."""
    findings = state.get("findings") or []
    specs = state.get("specs") or []
    if not findings:
        return {"report": "_No findings produced._"}

    provider: str | None = "deepseek" if is_deepseek_configured() else None
    llm = make_llm(provider=provider)

    sections = []
    for spec in specs:
        label = spec["label"]
        preamble = spec["synthesis_preamble"]
        items = [f for f in findings if f["spec_label"] == label]
        body = "\n\n".join(
            f"### [task {f['task_id']} — {f['subject']}]\n\n{f['content']}"
            for f in items
        )
        sections.append(f"## {label}\n\n{preamble}\n\n{body}")
    joined = "\n\n---\n\n".join(sections)

    system = (
        "You are a senior research synthesiser. Combine the per-task findings below into a "
        "coherent markdown report. Keep every concrete finding (paper titles, F1 numbers, "
        "latency figures), deduplicate overlapping insights, and add a top-level Executive "
        "Summary. Respond with JSON: {\"report\": \"<markdown>\"}"
    )
    try:
        result = await ainvoke_json(
            llm,
            [
                {"role": "system", "content": system},
                {"role": "user", "content": joined},
            ],
            provider=provider,
        )
    except Exception as exc:
        log.warning("synthesize_node: LLM failed: %s — returning concatenated findings", exc)
        return {"report": joined}

    if isinstance(result, dict) and "report" in result:
        return {"report": str(result["report"])}
    # Fall back to raw concatenation if the model hands back something unexpected.
    if isinstance(result, str):
        return {"report": result}
    return {"report": joined}


def _route_after_plan(state: ResearchAgentState) -> str:
    return "end" if state.get("error") else "run"


def build_graph(checkpointer: Any = None) -> Any:
    builder = StateGraph(ResearchAgentState)
    builder.add_node("plan", plan_node)
    builder.add_node("run_tasks", run_tasks_node)
    builder.add_node("synthesize", synthesize_node)
    builder.add_edge(START, "plan")
    builder.add_conditional_edges("plan", _route_after_plan, {"run": "run_tasks", "end": END})
    builder.add_edge("run_tasks", "synthesize")
    builder.add_edge("synthesize", END)
    return builder.compile(checkpointer=checkpointer)


graph = build_graph()
