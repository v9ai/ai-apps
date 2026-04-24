"""Seed queries for the Ingestible vertical.

Targets companies that:
  (a) already use a RAG stack (LangChain / LlamaIndex / Haystack)
  (b) have public evidence of token-cost / context-window pain
  (c) require on-prem / air-gapped deploys OR are exposed to the EU AI Act.

The three HOT_LEAD_SIGNALS below are programmatic — each can be run
independently without an LLM and writes into the `companies` columns added
by migration 0067:

    rag_stack_detected, token_cost_complaint, on_prem_required,
    ingestion_volume_hint, ai_act_exposure

The SEED_QUERY/VERTICAL/KEYWORDS fields feed the existing
`company_discovery_graph` LLM expander for the fuzzier top-of-funnel pass.
"""

from __future__ import annotations

# ── Free-text seed for the LLM expander ────────────────────────────────────

SEED_QUERY = (
    "RAG-native SaaS and AI platform teams bleeding tokens on document "
    "retrieval, or shipping on-prem / GDPR / EU-AI-Act-compliant document "
    "ingestion — typically on LangChain or LlamaIndex, ingesting customer "
    "contracts, medical records, codebases, or regulatory documents."
)

VERTICAL = "ingestible"

KEYWORDS = [
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
]

# ── Hot-lead programmatic signals ──────────────────────────────────────────
#
# These are the three high-signal, high-collectability queries from the
# Ingestible lead-gen research (arch-ab96). Each produces candidate companies
# AND sets one or more signal columns on `companies`. Wire into enrichment
# (not discovery) so they can also score existing rows.

HOT_LEAD_SIGNALS: dict[str, dict] = {
    # (1) GitHub code-search for RAG-stack imports. Strong predictor:
    #     commit messages mentioning token/cost/chunk/context on the same
    #     repo elevate it from "toy" to "token-pain felt".
    "github_code_search": {
        "signal_col": "rag_stack_detected",
        "endpoint": "GET /search/code",
        "queries": [
            # LangChain Python
            "from langchain.text_splitter language:python pushed:>2026-01-01",
            "from langchain_text_splitters language:python pushed:>2026-01-01",
            # LlamaIndex Python
            "from llama_index.core.node_parser language:python pushed:>2026-01-01",
            # Haystack (less common but high-signal)
            "from haystack.components.preprocessors language:python pushed:>2026-01-01",
        ],
        # regex → value for `rag_stack_detected`
        "stack_map": {
            r"from\s+langchain(_text_splitters|\.text_splitter)": "langchain",
            r"from\s+llama_index\b": "llamaindex",
            r"from\s+haystack\b": "haystack",
        },
        # Second-pass on the matched repo: scan last 90 days of commit
        # messages for these tokens to flip `token_cost_complaint`.
        "commit_message_regex": r"\b(token|cost|chunk|context)\b",
        "noise_rate_estimate": 0.35,  # ~35% tutorials/forks to dedup
        "filter_out": [
            # tutorial / course / cheatsheet / example forks
            r"(?i)(tutorial|course|cheat(sheet)?|awesome|example|demo|starter)",
        ],
    },
    # (2) HN + Reddit employee complaint mining — token cost / context
    #     window pain. HN Algolia is free; Reddit JSON feeds are free.
    "pain_post_mining": {
        "signal_col": "token_cost_complaint",
        "endpoints": [
            "https://hn.algolia.com/api/v1/search?tags=comment&query={q}",
            "https://www.reddit.com/r/LangChain/search.json?q={q}&restrict_sr=on",
            "https://www.reddit.com/r/LocalLLaMA/search.json?q={q}&restrict_sr=on",
        ],
        "queries": [
            "RAG cost tokens",
            "context window exceeded",
            "LangChain token spend",
            "LlamaIndex chunking cost",
            "retrieval 28000 tokens",
        ],
        "noise_rate_estimate": 0.20,
        # Author → company resolution via their linked GitHub / profile URL.
        "author_to_company": "github_profile_domain_join",
    },
    # (3) Greenhouse/Ashby JD scan — on-prem / air-gapped RAG roles.
    #     Already covered by existing loaders.py ATS board fetch; this
    #     just adds the regex + which columns to set.
    "ats_on_prem_roles": {
        "signal_cols": ["on_prem_required", "rag_stack_detected"],
        "endpoints": [
            "https://boards-api.greenhouse.io/v1/boards/{company}/jobs",
            "https://api.lever.co/v0/postings/{company}?mode=json",
            "https://jobs.ashbyhq.com/api/non-user-graphql",
        ],
        # Case-insensitive; matches either phrase in job title or description.
        "title_regex": (
            r"(?i)\b(RAG|retrieval|LLM platform|AI platform)\b.*"
            r"\b(engineer|architect|lead)\b"
        ),
        "body_regex": (
            r"(?i)\b(on[- ]prem(ise)?|air[- ]gapped|self[- ]hosted|"
            r"customer[- ]deployed|private cloud)\b"
        ),
        "noise_rate_estimate": 0.15,
        # Compliance detection inside the same JD body bumps ai_act_exposure.
        "compliance_regex": r"(?i)\b(GDPR|EU AI Act|HIPAA|SOC[- ]?2|ISO 27001|HITRUST)\b",
    },
}

# ── Anti-ICP veto rules ────────────────────────────────────────────────────
#
# Applied post-discovery — if any predicate matches, the company is flagged
# and excluded from Ingestible outreach even if it has positive signals.

ANTI_ICP_PREDICATES: list[dict] = [
    {
        "name": "consumer_chat_wrapper",
        "predicate": "description_regex",
        "value": r"(?i)\b(chatbot|companion app|ChatGPT wrapper|AI girlfriend)\b",
        "reason": "No document corpus — no ingestion volume.",
    },
    {
        "name": "vector_db_vendor",
        "predicate": "domain_in",
        "value": [
            "pinecone.io",
            "weaviate.io",
            "qdrant.tech",
            "trychroma.com",
            "getmilvus.com",
            "zilliz.com",
        ],
        "reason": "Coopetition — vector DBs ship their own loaders.",
    },
    {
        "name": "bpo_digitization",
        "predicate": "description_regex",
        "value": r"(?i)\b(document imaging|OCR services|digitization|BPO)\b",
        "reason": "Sells OCR services, not LLM retrieval — no token-cost pain.",
    },
]
