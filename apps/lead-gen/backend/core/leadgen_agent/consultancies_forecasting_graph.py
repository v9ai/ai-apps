"""Consultancies pipeline-forecasting analysis graph.

Native Python port of ``consultancies/generate_pipeline_forecasting.py`` and
``consultancies/analyze_pipeline_forecasting.py``. Reads AI-feature rows from
``company_facts`` (the canonical store written by the ``consultancies_features``
graph), filters companies with pipeline-prediction / forecasting features,
computes aggregate statistics, and returns the full analysis bundle in graph
state.

Output bundle (returned in state under ``analysis``)::

    {
      "data_source_frequency": {"<source>": <n>, ...},
      "ai_implementation_types": {"<approach>": <n>, ...},
      "automation_level_breakdown": {"semi-auto": n, "agentic": n, ...},
      "realtime_vs_batch": {"realtime": n, "batch": n},
      "key_insights": [{"insight": "...", "detail": "..."}, ...],
      "competitive_differentiators": [{"company": "...", "differentiator": "..."}, ...]
    }

Companies are returned in ``companies`` for the caller (e.g. the dashboard) to
render. A formatted Markdown report is returned in ``report_md``.

The original scripts also emitted CSV / Markdown files to disk; in graph form
the caller persists state where it likes — keeping the graph runtime
side-effect-free.

Environment:
    NEON_DATABASE_URL / DATABASE_URL  Neon connection string (required).
"""

from __future__ import annotations

import json
import logging
import os
import re
import time
from collections import Counter
from datetime import datetime, timezone
from typing import Annotated, Any, TypedDict

import psycopg
from langgraph.graph import END, START, StateGraph

log = logging.getLogger(__name__)


# ── Configuration ─────────────────────────────────────────────────────────────

_PIPELINE_KEYWORDS: frozenset[str] = frozenset({
    "pipeline", "forecast", "predict", "revenue forecast",
    "predictive pipeline", "sales forecast", "revenue intelligence",
})

_ARTICLE_PATTERNS = re.compile(
    r"^(\d+\s+best|\d+\s+top|\d+\s+ai|best\s+ai|top\s+\d|what\s+is|how\s+to|why\s+|"
    r"the\s+\d|guide\s+to|introduction|overview|vs\.|comparison|review|"
    r"welcome\s+to|ai\s+for\s+|era\s+of\s+|building\s+an?\s+)",
    re.IGNORECASE,
)


# ── State ─────────────────────────────────────────────────────────────────────


def _merge_dict(left: dict | None, right: dict | None) -> dict:
    out: dict[str, Any] = dict(left or {})
    if right:
        out.update(right)
    return out


class ConsultanciesForecastingState(TypedDict, total=False):
    """State for the pipeline-forecasting analysis graph.

    Input keys:
        emit_markdown   When true, populate ``report_md`` with a formatted report.

    Output keys:
        total_companies   Companies with pipeline-forecasting features.
        companies         List of {name, domain, website, automation_level, feature}.
        analysis          Full aggregate analysis dict (see module docstring).
        report_md         Markdown report (when emit_markdown=true).
    """

    emit_markdown: bool
    total_companies: int
    companies: list[dict[str, Any]]
    analysis: dict[str, Any]
    report_md: str
    _error: str
    agent_timings: Annotated[dict[str, float], _merge_dict]
    graph_meta: Annotated[dict[str, Any], _merge_dict]


# ── Helpers ───────────────────────────────────────────────────────────────────


def _dsn() -> str:
    dsn = (
        os.environ.get("NEON_DATABASE_URL", "").strip()
        or os.environ.get("DATABASE_URL", "").strip()
    )
    if not dsn:
        raise RuntimeError(
            "Neither NEON_DATABASE_URL nor DATABASE_URL is set."
        )
    return dsn


def _is_pipeline_feature(feature: dict[str, Any]) -> bool:
    name_lower = str(feature.get("name") or "").lower()
    return any(kw in name_lower for kw in _PIPELINE_KEYWORDS)


def _classify_implementation(impl: str) -> str:
    lower = (impl or "").lower()
    if any(k in lower for k in ("time-series", "timeseries", "time series")):
        return "Time-series forecasting"
    if any(k in lower for k in ("trains ml", "trains a ml", "ml model", "machine learning model")):
        return "ML model / Machine Learning"
    if "predictive analytics" in lower:
        return "Predictive analytics"
    if any(k in lower for k in ("neural network", "deep learning", "lstm", "transformer")):
        return "Neural network / Deep learning"
    if any(k in lower for k in ("regression", "linear model", "logistic")):
        return "Regression model"
    if any(k in lower for k in ("ml", "machine learning", "trains", "random forest", "gradient")):
        return "ML model / Machine Learning"
    return "Predictive analytics"


def _clean_company_name(name: str, domain: str) -> str:
    if not name:
        return domain
    if len(name) > 55:
        return domain
    if _ARTICLE_PATTERNS.match(name.strip()):
        return domain
    if "?" in name:
        return domain
    return name


# ── Data loading ──────────────────────────────────────────────────────────────


def _load_companies_with_features() -> list[dict[str, Any]]:
    """Pull AI-feature rows out of company_facts and group by company.

    The features graph writes one ``ai_features`` blob row per company plus one
    ``feature`` row per feature; we read the blob (richer payload) for each
    eligible company.
    """
    sql = """
        SELECT c.id, c.key, c.name,
               COALESCE(c.canonical_domain, ''),
               COALESCE(c.website, ''),
               cf.value_text
        FROM companies c
        JOIN company_facts cf ON cf.company_id = c.id
        WHERE cf.field = 'ai_features'
          AND cf.method = 'LLM'
          AND c.blocked = false
        ORDER BY cf.observed_at DESC
    """
    seen_ids: set[int] = set()
    out: list[dict[str, Any]] = []
    with psycopg.connect(_dsn(), autocommit=True, connect_timeout=10) as conn:
        with conn.cursor() as cur:
            cur.execute(sql)
            for row in cur.fetchall():
                cid = int(row[0])
                if cid in seen_ids:
                    continue
                seen_ids.add(cid)
                try:
                    payload = json.loads(row[5] or "{}")
                except (json.JSONDecodeError, TypeError):
                    continue
                if not isinstance(payload, dict):
                    continue
                features = payload.get("features") or []
                if not features:
                    continue
                out.append({
                    "id": cid,
                    "key": str(row[1]),
                    "name": str(row[2]),
                    "domain": str(row[3] or ""),
                    "website": str(row[4] or ""),
                    "automation_level": payload.get("automation_level") or "assisted",
                    "features": features,
                })
    return out


# ── Filter + analysis ─────────────────────────────────────────────────────────


def _filter_pipeline_companies(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for company in rows:
        pipeline_features = [
            f for f in company.get("features") or []
            if isinstance(f, dict) and _is_pipeline_feature(f)
        ]
        if not pipeline_features:
            continue
        best = next(
            (f for f in pipeline_features if "pipeline forecast" in str(f.get("name") or "").lower()),
            pipeline_features[0],
        )
        name = _clean_company_name(company.get("name", ""), company.get("domain", ""))
        out.append({
            "name": name,
            "domain": company.get("domain", ""),
            "website": company.get("website", ""),
            "automation_level": company.get("automation_level", "assisted"),
            "feature": best,
        })
    return out


def _compute_analysis(companies: list[dict[str, Any]]) -> dict[str, Any]:
    total = len(companies)
    if total == 0:
        return {}

    auto_counts: Counter[str] = Counter(c["automation_level"] for c in companies)
    automation_breakdown = {
        "semi-auto": auto_counts.get("semi-auto", 0),
        "agentic": auto_counts.get("agentic", 0),
        "autonomous": auto_counts.get("autonomous", 0),
        "assisted": auto_counts.get("assisted", 0),
    }

    realtime_count = sum(
        1 for c in companies if c["feature"].get("is_realtime", False)
    )
    realtime_vs_batch = {"realtime": realtime_count, "batch": total - realtime_count}

    source_counter: Counter[str] = Counter()
    canonical: dict[str, str] = {}
    for c in companies:
        for source in c["feature"].get("data_sources") or []:
            key = str(source).strip().lower()
            if not key:
                continue
            source_counter[key] += 1
            canonical.setdefault(key, str(source).strip())
    data_source_freq = {
        canonical[k]: v
        for k, v in sorted(source_counter.items(), key=lambda x: -x[1])
    }

    impl_types: Counter[str] = Counter()
    for c in companies:
        impl = c["feature"].get("ai_implementation", "")
        impl_types[_classify_implementation(impl)] += 1
    ai_impl_types = dict(sorted(impl_types.items(), key=lambda x: -x[1]))

    key_insights: list[dict[str, str]] = []
    if source_counter:
        most_common = source_counter.most_common(2)
        most_common_source, most_common_count = most_common[0]
        if len(most_common) > 1:
            second_source, second_count = most_common[1]
        else:
            second_source, second_count = most_common[0]
        avg_sources = (
            sum(len(c["feature"].get("data_sources") or []) for c in companies) / total
        )
        max_sources = max(
            (len(c["feature"].get("data_sources") or []) for c in companies),
            default=0,
        )
        if impl_types:
            dominant_impl, dominant_count = impl_types.most_common(1)[0]
        else:
            dominant_impl, dominant_count = ("Predictive analytics", 0)

        key_insights = [
            {
                "insight": f"{canonical.get(most_common_source, most_common_source).title()} is Universal",
                "detail": (
                    f"{round(most_common_count / total * 100)}% of companies "
                    f"({most_common_count}/{total}) use "
                    f"{canonical.get(most_common_source, most_common_source)} as a primary source, "
                    f"making it the foundational data layer for pipeline forecasting."
                ),
            },
            {
                "insight": "Historical Data is Critical",
                "detail": (
                    f"{round(second_count / total * 100)}% of companies "
                    f"({second_count}/{total}) rely on "
                    f"{canonical.get(second_source, second_source)}, indicating that "
                    f"time-based pattern recognition is essential for accurate forecasting."
                ),
            },
            {
                "insight": "No Realtime Forecasting" if realtime_count == 0 else "Realtime Forecasting Emerging",
                "detail": (
                    f"{round(realtime_count / total * 100)}% of pipeline forecasting features are realtime"
                    + (
                        " — all are batch processes. This suggests forecasting prioritizes accuracy over immediacy."
                        if realtime_count == 0 else "."
                    )
                ),
            },
            {
                "insight": f"{dominant_impl} Dominates",
                "detail": (
                    f"{round(dominant_count / total * 100)}% of implementations use {dominant_impl}. "
                    f"Average data sources per company: {avg_sources:.1f}."
                ),
            },
            {
                "insight": "Semi-Auto Standard",
                "detail": (
                    f"{round(auto_counts.get('semi-auto', 0) / total * 100)}% offer semi-auto forecasting. "
                    f"Agentic: {auto_counts.get('agentic', 0)}, "
                    f"autonomous: {auto_counts.get('autonomous', 0)}."
                ),
            },
            {
                "insight": "Data Source Sophistication Varies",
                "detail": (
                    f"Basic implementations use 2-3 data sources. "
                    f"Advanced implementations use {max_sources}+ sources "
                    f"including web signals, job postings, and engagement metrics."
                ),
            },
        ]

    sorted_by_sources = sorted(
        companies,
        key=lambda c: len(c["feature"].get("data_sources") or []),
        reverse=True,
    )
    differentiators: list[dict[str, str]] = []
    for c in sorted_by_sources[:5]:
        diff_text = str(c["feature"].get("ai_implementation") or "")[:200]
        if diff_text:
            differentiators.append({
                "company": c["domain"] or c["name"],
                "differentiator": diff_text,
            })

    return {
        "data_source_frequency": data_source_freq,
        "ai_implementation_types": ai_impl_types,
        "automation_level_breakdown": automation_breakdown,
        "realtime_vs_batch": realtime_vs_batch,
        "key_insights": key_insights,
        "competitive_differentiators": differentiators,
    }


# ── Markdown report ───────────────────────────────────────────────────────────


def _render_report_md(companies: list[dict[str, Any]], analysis: dict[str, Any]) -> str:
    total = len(companies)
    when = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")

    parts: list[str] = [
        "# Pipeline Forecasting Analysis Report",
        "",
        f"**Generated:** {when}",
        f"**Total Companies Analyzed:** {total}",
        "",
        "## Data Source Usage",
        "",
        "| Data Source | Companies | Usage % |",
        "|-------------|-----------|---------|",
    ]
    for source, count in list((analysis.get("data_source_frequency") or {}).items())[:10]:
        pct = (count / total) * 100 if total else 0
        parts.append(f"| {source} | {count} | {pct:.0f}% |")

    parts += [
        "",
        "## AI Implementation Types",
        "",
        "| Approach | Count | Percentage |",
        "|----------|-------|------------|",
    ]
    impl_total = sum((analysis.get("ai_implementation_types") or {}).values()) or 1
    for approach, count in (analysis.get("ai_implementation_types") or {}).items():
        parts.append(
            f"| {approach} | {count} | {(count / impl_total) * 100:.1f}% |"
        )

    parts += ["", "## Competitive Differentiators", ""]
    for diff in analysis.get("competitive_differentiators") or []:
        parts.append(f"### {diff['company']}\n\n{diff['differentiator']}\n")

    parts += [
        "",
        "## Methodology",
        "",
        "Pulled from `company_facts.field='ai_features'` rows written by the "
        "`consultancies_features` graph. Each feature with `pipeline / forecast / "
        "predict` keywords in its name is included.",
    ]
    return "\n".join(parts)


# ── Node ──────────────────────────────────────────────────────────────────────


async def forecasting(state: ConsultanciesForecastingState) -> dict[str, Any]:
    if state.get("_error"):
        return {}
    t0 = time.perf_counter()

    rows = _load_companies_with_features()
    log.info("forecasting: loaded %d companies with AI features", len(rows))

    companies = _filter_pipeline_companies(rows)
    log.info("forecasting: %d match pipeline-forecasting filter", len(companies))

    analysis = _compute_analysis(companies)
    out: dict[str, Any] = {
        "total_companies": len(companies),
        "companies": companies,
        "analysis": analysis,
        "agent_timings": {"forecasting": round(time.perf_counter() - t0, 3)},
        "graph_meta": {
            "graph": "consultancies_forecasting", "version": "v1", "node": "forecasting",
        },
    }
    if state.get("emit_markdown") and companies:
        out["report_md"] = _render_report_md(companies, analysis)
    return out


def _build() -> Any:
    g = StateGraph(ConsultanciesForecastingState)
    g.add_node("forecasting", forecasting)
    g.add_edge(START, "forecasting")
    g.add_edge("forecasting", END)
    return g.compile()


graph = _build()
