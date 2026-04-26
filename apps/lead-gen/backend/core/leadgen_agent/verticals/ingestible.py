"""Ingestible — token-efficient document ingestion.

Targets companies that
  (a) already use a RAG stack (LangChain / LlamaIndex / Haystack),
  (b) have public evidence of token-cost / context-window pain, or
  (c) require on-prem / air-gapped deploys OR are exposed to EU AI Act / HIPAA.

All config ported from the earlier ``seed_queries/ingestible.py`` and the
Ingestible-specific regexes that used to live in ``company_enrichment_graph``.
Behavior is identical; shape is now generic.
"""

from __future__ import annotations

import re

from .registry import AntiIcpPredicate, ProductVertical, SignalRule, register


# ── Signal rules ──────────────────────────────────────────────────────────
#
# Label rules are checked in list order; first match wins for a given key.
# The regex catalogue here is identical to the v1 Ingestible scorer
# (migrations 0067 / company_enrichment_graph._RAG_STACK_PATTERNS etc.).

_SIGNAL_RULES: tuple[SignalRule, ...] = (
    # --- rag_stack_detected (label) ---
    # Order matters: LlamaIndex first because teams using both typically
    # import LlamaIndex explicitly.
    SignalRule(
        key="rag_stack_detected",
        pattern=re.compile(
            r"\bfrom\s+llama[_-]?index\b|\bllama[_-]?index\b", re.I
        ),
        kind="label",
        label="llamaindex",
    ),
    SignalRule(
        key="rag_stack_detected",
        pattern=re.compile(
            r"\bfrom\s+langchain(_text_splitters|\.text_splitter|_core|_community)?\b|\blangchain\b",
            re.I,
        ),
        kind="label",
        label="langchain",
    ),
    SignalRule(
        key="rag_stack_detected",
        pattern=re.compile(
            r"\bfrom\s+haystack\b|\bhaystack\b(?!\s+(?:demo|tutorial))", re.I
        ),
        kind="label",
        label="haystack",
    ),
    # --- on_prem_required (bool) ---
    SignalRule(
        key="on_prem_required",
        pattern=re.compile(
            r"\b(on[- ]prem(?:ise)?|air[- ]gapped|self[- ]hosted|"
            r"customer[- ]deployed|private cloud|vpc deployment)\b",
            re.I,
        ),
        kind="bool",
    ),
    # --- ai_act_exposure (bool) — compliance footprint ---
    SignalRule(
        key="ai_act_exposure",
        pattern=re.compile(
            r"\b(GDPR|EU AI Act|HIPAA|SOC[- ]?2|ISO[- ]?27001|HITRUST|FedRAMP)\b",
            re.I,
        ),
        kind="bool",
    ),
    # --- token_cost_complaint (bool) — direct pain in copy ---
    SignalRule(
        key="token_cost_complaint",
        pattern=re.compile(
            r"\b(token cost|context window|reduce tokens|token spend|"
            r"llm bill|inference cost|prompt size|\$\s*/\s*query|cost per query)\b",
            re.I,
        ),
        kind="bool",
    ),
)


# ── Anti-ICP predicates ───────────────────────────────────────────────────

_ANTI_ICP: tuple[AntiIcpPredicate, ...] = (
    AntiIcpPredicate(
        name="consumer_chat_wrapper",
        predicate="description_regex",
        value=r"(?i)\b(chatbot|companion app|ChatGPT wrapper|AI girlfriend)\b",
        reason="No document corpus — no ingestion volume.",
    ),
    AntiIcpPredicate(
        name="vector_db_vendor",
        predicate="domain_in",
        value=[
            "pinecone.io",
            "weaviate.io",
            "qdrant.tech",
            "trychroma.com",
            "getmilvus.com",
            "zilliz.com",
        ],
        reason="Coopetition — vector DB vendors ship their own loaders.",
    ),
    AntiIcpPredicate(
        name="bpo_digitization",
        predicate="description_regex",
        value=r"(?i)\b(document imaging|OCR services|digitization|BPO)\b",
        reason="Sells OCR services, not LLM retrieval — no token-cost pain.",
    ),
)


# ── GitHub code-search queries + filters ──────────────────────────────────

_GITHUB_QUERIES: tuple[str, ...] = (
    "from langchain.text_splitter language:python pushed:>2026-01-01",
    "from langchain_text_splitters language:python pushed:>2026-01-01",
    "from llama_index.core.node_parser language:python pushed:>2026-01-01",
    "from haystack.components.preprocessors language:python pushed:>2026-01-01",
)

_GITHUB_OWNER_DENY: frozenset[str] = frozenset(
    {
        "langchain-ai",
        "langchain",
        "run-llama",
        "jerryjliu",          # LlamaIndex creator's personal org
        "deepset-ai",
        "haystack-tutorials",
        "microsoft",          # AutoGen noise
    }
)

_GITHUB_FILTER_OUT: tuple[re.Pattern[str], ...] = (
    re.compile(r"(?i)(tutorial|course|cheat(sheet)?|awesome|example|demo|starter)"),
)


# ── Email templates keyed by step ─────────────────────────────────────────

_TEMPLATE_NAME_BY_STEP: dict[int, str] = {
    0: "ingestible_outreach_day0",
    4: "ingestible_outreach_day4",
    13: "ingestible_outreach_day13",
}


# ── Keywords for the LLM expander ─────────────────────────────────────────

_KEYWORDS: tuple[str, ...] = (
    "rag",
    "retrieval augmented generation",
    "document ingestion",
    "langchain",
    "llamaindex",
    "haystack",
    "on-prem llm",
    "air-gapped rag",
    "self-hosted rag",
    "vector database",
    "document chunking",
    "context window",
    "token cost",
    "eu ai act",
    "gdpr",
)


# ── Score weights (override the flat +1.0 default) ────────────────────────
#
# These sum to ~1.0 so the default tier thresholds (0.66 / 0.33) land
# meaningfully — a hot Ingestible lead has at least two of the four
# heavy-weight signals. rag_stack_detected alone is necessary but not
# sufficient (weight 0.35 ≈ "warm" tier); pairing it with any other
# signal reaches "hot".

_SCORE_WEIGHTS: dict[str, float] = {
    "rag_stack_detected": 0.35,
    "on_prem_required": 0.25,
    "ai_act_exposure": 0.20,
    "token_cost_complaint": 0.20,
}


# ── Register the vertical ─────────────────────────────────────────────────

INGESTIBLE = register(
    ProductVertical(
        slug="ingestible",
        product_id=1,
        schema_version="2.0.0",
        seed_query=(
            "RAG-native SaaS and AI platform teams bleeding tokens on document "
            "retrieval, or shipping on-prem / GDPR / EU-AI-Act-compliant document "
            "ingestion — typically on LangChain or LlamaIndex, ingesting customer "
            "contracts, medical records, codebases, or regulatory documents."
        ),
        keywords=_KEYWORDS,
        signal_rules=_SIGNAL_RULES,
        anti_icp_predicates=_ANTI_ICP,
        github_code_queries=_GITHUB_QUERIES,
        github_owner_deny=_GITHUB_OWNER_DENY,
        github_filter_out=_GITHUB_FILTER_OUT,
        email_template_name_by_step=_TEMPLATE_NAME_BY_STEP,
        score_weights=_SCORE_WEIGHTS,
    )
)
