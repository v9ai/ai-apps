"""Company enrichment graph — category, ai_tier, score, and company_facts provenance.

Five-node linear pipeline (load → fetch → classify → score → persist) that
enriches a single company row identified by ``company_id``. Writes
``extractor_version='python-qwen-2026-04'`` into ``company_facts`` so rows
produced here coexist queryably alongside the Rust enricher's rows (which stamp
``rust-bge-*``). The UPDATE to ``companies`` sets ``category``, ``ai_tier``,
``score``, ``score_reasons``, ``ai_classification_reason``, and
``ai_classification_confidence`` — columns also written by the Rust enricher,
so the most-recent write wins by design (last-writer-wins UPDATE semantics).
"""

from __future__ import annotations

import asyncio
import json
import os
import re
import time
from datetime import datetime, timezone
from typing import Any

import psycopg
from langgraph.graph import END, START, StateGraph

from .deep_icp_graph import _dsn
from .llm import ainvoke_json_with_telemetry, compute_totals, make_llm, merge_node_telemetry
from .loaders import fetch_url
from .product_intel_schemas import product_intel_graph_meta
from .state import CompanyEnrichmentState

EXTRACTOR_VERSION = "python-qwen-2026-04"

# ── Node 1: load ──────────────────────────────────────────────────────────────

async def load(state: CompanyEnrichmentState) -> dict:
    if state.get("_error"):
        return {}
    company_id = state.get("company_id")
    if company_id is None:
        return {"_error": "load: company_id is required"}
    sql = "SELECT id, name, canonical_domain, website FROM companies WHERE id = %s LIMIT 1"
    try:
        with psycopg.connect(_dsn(), autocommit=True, connect_timeout=10) as conn:
            with conn.cursor() as cur:
                cur.execute(sql, (int(company_id),))
                row = cur.fetchone()
                if not row:
                    return {"_error": f"load: company id {company_id} not found"}
                cols = [d[0] for d in cur.description or []]
    except psycopg.Error as e:
        return {"_error": f"load: {e}"}

    rec = dict(zip(cols, row))
    domain = (rec.get("canonical_domain") or "").strip()
    if not domain:
        return {"_error": "load: company has no canonical_domain"}

    return {
        "company": {
            "id": rec["id"],
            "name": rec.get("name") or "",
            "canonical_domain": domain,
            "website": rec.get("website") or "",
        }
    }


# ── Node 2: fetch ─────────────────────────────────────────────────────────────

async def fetch(state: CompanyEnrichmentState) -> dict:
    if state.get("_error"):
        return {}
    t0 = time.perf_counter()
    domain = state["company"]["canonical_domain"]
    home_url = f"https://{domain}"
    careers_paths = ("/careers", "/jobs", "/company/careers", "/join-us")
    careers_candidates = [f"https://{domain}{p}" for p in careers_paths]

    try:
        home_res, *careers_results = await asyncio.gather(
            fetch_url(home_url),
            *[fetch_url(u) for u in careers_candidates],
            return_exceptions=False,
        )
    except Exception as e:  # noqa: BLE001
        return {"_error": f"fetch: {e}"}

    home_markdown: str = (home_res.get("markdown") or "")[:15000]

    careers_markdown = ""
    careers_url = ""
    for res in careers_results:
        md = res.get("markdown") or ""
        if len(md) > 500:
            careers_markdown = md[:15000]
            careers_url = res.get("url") or ""
            break

    return {
        "home_markdown": home_markdown,
        "careers_markdown": careers_markdown,
        "careers_url": careers_url,
        "agent_timings": {"fetch": round(time.perf_counter() - t0, 3)},
    }


# ── Node 3: classify ──────────────────────────────────────────────────────────

def _heuristic_classify(home_markdown: str, careers_markdown: str) -> dict[str, Any]:
    text = (home_markdown + " " + careers_markdown).lower()

    if any(k in text for k in ("llm", "genai", "agent", "rag", "foundation model")):
        ai_tier = 2
    elif any(k in text for k in ("machine learning", " ml ", "data science")):
        ai_tier = 1
    else:
        ai_tier = 0

    if "consult" in text or "services" in text:
        category = "CONSULTANCY"
    elif "staff" in text or "recruit" in text:
        category = "STAFFING"
    elif "agency" in text or "marketing" in text:
        category = "AGENCY"
    elif any(k in text for k in ("platform", "saas", "product")):
        category = "PRODUCT"
    else:
        category = "UNKNOWN"

    return {
        "category": category,
        "ai_tier": ai_tier,
        "industry": "",
        "remote_policy": "unknown",
        "has_open_roles": bool(careers_markdown),
        "confidence": 0.5,
        "reason": "heuristic fallback",
    }


async def classify(state: CompanyEnrichmentState) -> dict:
    if state.get("_error"):
        return {}
    t0 = time.perf_counter()
    company = state.get("company") or {}
    home_markdown = state.get("home_markdown") or ""
    careers_markdown = state.get("careers_markdown") or ""

    system_prompt = (
        "You classify a company for B2B AI-consultancy ICP targeting. "
        'Return strict JSON: {"category": "CONSULTANCY"|"STAFFING"|"AGENCY"|"PRODUCT"|"UNKNOWN", '
        '"ai_tier": 0|1|2, "industry": string, '
        '"remote_policy": "full_remote"|"hybrid"|"onsite"|"unknown", '
        '"has_open_roles": boolean, "confidence": 0..1, "reason": string}. '
        "Category rules: CONSULTANCY (paid AI/ML services), STAFFING (body-shop), "
        "AGENCY (marketing/creative), PRODUCT (SaaS). "
        "ai_tier: 2=AI core to product, 1=AI as capability, 0=no AI."
    )
    user_prompt = (
        f"Company: {company.get('name')}\n"
        f"Domain: {company.get('canonical_domain')}\n\n"
        f"Home page:\n{home_markdown[:6000]}\n\n"
        f"Careers page:\n{careers_markdown[:3000]}\n\n"
        "Return JSON only."
    )

    classification: dict[str, Any] | None = None
    tel: dict[str, Any] = {}
    classify_source = "llm"

    try:
        llm = make_llm(temperature=0.2, provider="deepseek", tier="deep")
        result, tel = await ainvoke_json_with_telemetry(
            llm,
            [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            provider="deepseek",
        )
        if isinstance(result, dict) and result.get("confidence", 0) >= 0.4:
            classification = result
        else:
            classify_source = "heuristic"
    except Exception:  # noqa: BLE001
        classify_source = "heuristic"

    if classification is None:
        classification = _heuristic_classify(home_markdown, careers_markdown)
        classify_source = "heuristic"

    elapsed = round(time.perf_counter() - t0, 3)
    return {
        "classification": classification,
        "classify_source": classify_source,
        "agent_timings": {"classify": elapsed},
        "graph_meta": {
            "telemetry": merge_node_telemetry(None, "classify", tel),
        },
    }


# ── Node 4: score ─────────────────────────────────────────────────────────────

async def score(state: CompanyEnrichmentState) -> dict:
    if state.get("_error"):
        return {}
    t0 = time.perf_counter()
    c = state.get("classification") or {}

    s = 0.0
    reasons: list[str] = []

    if c.get("category") in ("CONSULTANCY", "AGENCY"):
        s += 0.25
        reasons.append("ICP category")

    ai_tier = c.get("ai_tier", 0)
    s += {2: 0.25, 1: 0.18, 0: 0.0}.get(ai_tier, 0.0)
    if ai_tier >= 1:
        reasons.append(f"AI tier {ai_tier}")

    rp = c.get("remote_policy")
    s += {"full_remote": 0.20, "hybrid": 0.12}.get(rp, 0.0)
    if rp in ("full_remote", "hybrid"):
        reasons.append(rp)

    if c.get("has_open_roles"):
        s += 0.10
        reasons.append("hiring")

    s *= 0.6 + 0.4 * c.get("confidence", 0.5)
    score_value = round(min(s, 1.0), 3)
    needs_review = c.get("confidence", 0) < 0.6

    return {
        "scores": {
            "score": score_value,
            "reasons": reasons,
            "needs_review": needs_review,
        },
        "agent_timings": {"score": round(time.perf_counter() - t0, 3)},
    }


# ── Node 5: persist ───────────────────────────────────────────────────────────

_RAG_STACK_PATTERNS: tuple[tuple[re.Pattern, str], ...] = (
    # Order matters — first match wins. LlamaIndex patterns checked before
    # LangChain because teams using both typically import LlamaIndex explicitly.
    (re.compile(r"\bfrom\s+llama[_-]?index\b|\bllama[_-]?index\b", re.I), "llamaindex"),
    (re.compile(r"\bfrom\s+langchain(_text_splitters|\.text_splitter|_core|_community)?\b|\blangchain\b", re.I), "langchain"),
    (re.compile(r"\bfrom\s+haystack\b|\bhaystack\b(?!\s+(?:demo|tutorial))", re.I), "haystack"),
)
_ON_PREM_RE = re.compile(
    r"\b(on[- ]prem(?:ise)?|air[- ]gapped|self[- ]hosted|customer[- ]deployed|private cloud|vpc deployment)\b",
    re.I,
)
_COMPLIANCE_RE = re.compile(
    r"\b(GDPR|EU AI Act|HIPAA|SOC[- ]?2|ISO[- ]?27001|HITRUST|FedRAMP)\b",
    re.I,
)
_TOKEN_COST_RE = re.compile(
    r"\b(token cost|context window|reduce tokens|token spend|llm bill|"
    r"inference cost|prompt size|\$\s*/\s*query|cost per query)\b",
    re.I,
)


async def score_ingestible(state: CompanyEnrichmentState) -> dict:
    """Populate the 5 Ingestible signal columns on `companies`.

    Runs after `persist` so a failure here does not roll back the core
    enrichment UPDATE. Deterministic regex only — no LLM call, no external
    API. Inputs: `home_markdown`, `careers_markdown` already fetched by
    `fetch`. Signals set conservatively — only flipped true when the keyword
    actually appears in the fetched text.

    The two remaining HOT_LEAD_SIGNALS from seed_queries/ingestible.py
    (GitHub code-search, HN/Reddit pain mining) require external API calls
    and are not wired here — they're documented for a follow-up signal
    harvester that can run out-of-band and UPDATE these columns later.
    """
    if state.get("_error"):
        return {}
    company_id = state.get("company_id")
    if company_id is None:
        return {}
    t0 = time.perf_counter()

    home_markdown = state.get("home_markdown") or ""
    careers_markdown = state.get("careers_markdown") or ""
    corpus = (home_markdown + "\n" + careers_markdown)
    if not corpus.strip():
        # Nothing to score against — leave signals at their defaults.
        return {"agent_timings": {"score_ingestible": round(time.perf_counter() - t0, 3)}}

    rag_stack: str | None = None
    for pattern, label in _RAG_STACK_PATTERNS:
        if pattern.search(corpus):
            rag_stack = label
            break

    on_prem = bool(_ON_PREM_RE.search(corpus))
    ai_act_exposure = bool(_COMPLIANCE_RE.search(corpus))
    token_cost_complaint = bool(_TOKEN_COST_RE.search(corpus))

    try:
        with psycopg.connect(_dsn(), autocommit=True, connect_timeout=10) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE companies
                    SET rag_stack_detected   = COALESCE(%s, rag_stack_detected),
                        on_prem_required     = on_prem_required OR %s,
                        ai_act_exposure      = ai_act_exposure  OR %s,
                        token_cost_complaint = token_cost_complaint OR %s,
                        updated_at           = now()::text
                    WHERE id = %s
                    """,
                    (rag_stack, on_prem, ai_act_exposure, token_cost_complaint, int(company_id)),
                )
    except psycopg.Error:
        # Non-fatal — the core enrichment already committed in `persist`.
        # Don't set `_error` because downstream routing would treat this run
        # as a failure even though classification + scores landed.
        return {"agent_timings": {"score_ingestible": round(time.perf_counter() - t0, 3)}}

    return {
        "ingestible_signals": {
            "rag_stack_detected": rag_stack,
            "on_prem_required": on_prem,
            "ai_act_exposure": ai_act_exposure,
            "token_cost_complaint": token_cost_complaint,
        },
        "agent_timings": {"score_ingestible": round(time.perf_counter() - t0, 3)},
    }


async def persist(state: CompanyEnrichmentState) -> dict:
    if state.get("_error"):
        return {}
    t0 = time.perf_counter()
    company = state.get("company") or {}
    company_id = state.get("company_id")
    classification = state.get("classification") or {}
    scores = state.get("scores") or {}
    home_markdown = state.get("home_markdown") or ""
    careers_markdown = state.get("careers_markdown") or ""
    careers_url = state.get("careers_url") or ""
    domain = company.get("canonical_domain") or ""

    reasons = scores.get("reasons") or []
    score_value = scores.get("score", 0.0)
    confidence = classification.get("confidence", 0.0)
    now_ts = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
    now_iso = datetime.now(timezone.utc).isoformat()

    facts_persisted = 0
    try:
        with psycopg.connect(_dsn(), autocommit=True, connect_timeout=10) as conn:
            with conn.cursor() as cur:
                # a. UPDATE companies
                cur.execute(
                    """
                    UPDATE companies
                    SET category                      = %s,
                        ai_tier                       = %s,
                        score                         = %s,
                        score_reasons                 = %s,
                        ai_classification_reason      = %s,
                        ai_classification_confidence  = %s,
                        updated_at                    = now()::text
                    WHERE id = %s
                    """,
                    (
                        classification.get("category"),
                        classification.get("ai_tier"),
                        score_value,
                        json.dumps(reasons),
                        classification.get("reason"),
                        confidence,
                        int(company_id),
                    ),
                )

                # b. INSERT company_facts — home row
                home_value_json = json.dumps({
                    "home_markdown": home_markdown[:2000],
                    "classification": classification,
                    "scores": scores,
                })
                cur.execute(
                    """
                    INSERT INTO company_facts
                      (tenant_id, company_id, field, value_json, value_text,
                       confidence, source_type, source_url, capture_timestamp,
                       observed_at, method, extractor_version, http_status, created_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, now()::text)
                    """,
                    (
                        "nyx",
                        int(company_id),
                        "classification.home",
                        home_value_json,
                        None,
                        confidence,
                        "LIVE_FETCH",
                        f"https://{domain}",
                        now_ts,
                        now_iso,
                        "LLM",
                        EXTRACTOR_VERSION,
                        200,
                    ),
                )
                facts_persisted += 1

                # careers row — only when content was found
                if careers_markdown:
                    careers_value_json = json.dumps({"careers_markdown": careers_markdown[:2000]})
                    cur.execute(
                        """
                        INSERT INTO company_facts
                          (tenant_id, company_id, field, value_json, value_text,
                           confidence, source_type, source_url, capture_timestamp,
                           observed_at, method, extractor_version, http_status, created_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, now()::text)
                        """,
                        (
                            "nyx",
                            int(company_id),
                            "classification.careers",
                            careers_value_json,
                            None,
                            confidence,
                            "LIVE_FETCH",
                            careers_url,
                            now_ts,
                            now_iso,
                            "LLM",
                            EXTRACTOR_VERSION,
                            200,
                        ),
                    )
                    facts_persisted += 1

    except psycopg.Error as e:
        return {"_error": f"persist: {e}"}

    model = os.environ.get("DEEPSEEK_MODEL_DEEP", "deepseek-reasoner")
    telemetry = (state.get("graph_meta") or {}).get("telemetry") or {}
    meta = product_intel_graph_meta(
        graph="company_enrichment",
        model=model,
        agent_timings=state.get("agent_timings") or {},
        telemetry=telemetry,
        totals=compute_totals(telemetry),
    )

    summary = {
        "company_id": company_id,
        "company_name": company.get("name"),
        "canonical_domain": domain,
        "category": classification.get("category"),
        "ai_tier": classification.get("ai_tier"),
        "score": score_value,
        "classify_source": state.get("classify_source"),
        "facts_persisted": facts_persisted,
        "graph_meta": meta,
    }

    return {
        "facts_persisted": facts_persisted,
        "updated": True,
        "summary": summary,
        "agent_timings": {"persist": round(time.perf_counter() - t0, 3)},
    }


# ── Graph builder ─────────────────────────────────────────────────────────────

def build_graph(checkpointer: Any = None) -> Any:
    builder = StateGraph(CompanyEnrichmentState)
    builder.add_node("load", load)
    builder.add_node("fetch", fetch)
    builder.add_node("classify", classify)
    builder.add_node("score", score)
    builder.add_node("persist", persist)
    builder.add_node("score_ingestible", score_ingestible)
    builder.add_edge(START, "load")
    builder.add_edge("load", "fetch")
    builder.add_edge("fetch", "classify")
    builder.add_edge("classify", "score")
    builder.add_edge("score", "persist")
    # Per-vertical signal scorers run after core persist so their failures
    # never roll back classification + score commits. Additive; safe to
    # extend with future vertical nodes (archreview, onboardingtutor).
    builder.add_edge("persist", "score_ingestible")
    builder.add_edge("score_ingestible", END)
    return builder.compile(checkpointer=checkpointer)


graph = build_graph()
