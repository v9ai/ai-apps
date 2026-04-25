"""ICP-fit scorer — bridges ``products.icp_analysis`` into company scoring.

Consumed by ``company_enrichment_graph.score_verticals`` to blend the
deterministic regex-based vertical score with the LLM-produced ICP analysis
(segments, personas, deal-breakers, weighted_total). Keeps this logic in a
dedicated module so it's importable from tests without pulling the graph.

Contract (v2.0.0 signals jsonb shape):

    {
      "schema_version": "2.0.0",
      "regex": { ...same v1 keys verbatim... },
      "icp_fit": {
        "weighted_total":     float,
        "segment_match":      {"best_segment": str, "fit": float, "evidence": [str]},
        "persona_match":      {"best_title": str, "fit": float},
        "deal_breaker_hits":  [{"name": str, "severity": str, "matched_pattern": str}],
        "weights_hash":       str,
        "icp_analyzed_at":    str
      },
      "composite_score": float,
      "composite_tier":  "hot" | "warm" | "cold" | "disqualified" | None
    }

v1 shape (regex keys at the top level) is preserved on the regex-only path for
backwards compatibility (test_v1_v2_signals_parity).
"""

from __future__ import annotations

import json
import logging
import os
import re
from pathlib import Path
from typing import Any

log = logging.getLogger(__name__)

try:
    from rapidfuzz.fuzz import token_set_ratio as _token_set_ratio
except Exception:  # noqa: BLE001
    _token_set_ratio = None


DEFAULT_COMPOSITE_WEIGHTS: dict[str, float] = {
    "alpha": 0.30,   # regex vertical score
    "beta":  0.30,   # weighted_total * evidence_match
    "gamma": 0.25,   # segment fit
    "delta": 0.15,   # persona fit
}

HOT_THRESHOLD = 0.66
WARM_THRESHOLD = 0.33


def load_composite_weights() -> dict[str, float]:
    """Read ``config/scoring/composite-weights.json`` or fall back to defaults."""
    candidate = Path(__file__).resolve().parents[2] / "config" / "scoring" / "composite-weights.json"
    if not candidate.exists():
        return dict(DEFAULT_COMPOSITE_WEIGHTS)
    try:
        raw = json.loads(candidate.read_text(encoding="utf-8"))
        return {
            "alpha": float(raw.get("alpha", DEFAULT_COMPOSITE_WEIGHTS["alpha"])),
            "beta":  float(raw.get("beta",  DEFAULT_COMPOSITE_WEIGHTS["beta"])),
            "gamma": float(raw.get("gamma", DEFAULT_COMPOSITE_WEIGHTS["gamma"])),
            "delta": float(raw.get("delta", DEFAULT_COMPOSITE_WEIGHTS["delta"])),
        }
    except Exception:  # noqa: BLE001
        return dict(DEFAULT_COMPOSITE_WEIGHTS)


def _fuzzy_ratio(a: str, b: str) -> float:
    a = (a or "").strip().lower()
    b = (b or "").strip().lower()
    if not a or not b:
        return 0.0
    if a == b:
        return 1.0
    if _token_set_ratio is not None:
        return float(_token_set_ratio(a, b)) / 100.0
    # Cheap fallback — substring containment both ways.
    if a in b or b in a:
        return 0.7
    shared = set(a.split()) & set(b.split())
    longer = max(len(a.split()), len(b.split()), 1)
    return len(shared) / longer


def _count_tokens_hits(text: str, tokens: str, max_expected: int = 3) -> float:
    """Count regex-safe token hits in text, return 0..1 capped at ``max_expected``."""
    if not tokens or not text:
        return 0.0
    hits = 0
    for raw in re.split(r"[,;/|]+|\s{2,}", tokens):
        t = raw.strip().lower()
        if not t or len(t) < 2:
            continue
        if re.search(r"\b" + re.escape(t) + r"\b", text, re.I):
            hits += 1
    return min(hits / max(max_expected, 1), 1.0)


_SEVERITY_SYNONYMS = {
    "low": "low", "minor": "low", "trivial": "low", "small": "low",
    "medium": "medium", "mid": "medium", "moderate": "medium", "med": "medium",
    "high": "high", "critical": "high", "severe": "high",
    "blocker": "high", "showstopper": "high", "major": "high",
}


def _normalize_severity(sev: str) -> str:
    return _SEVERITY_SYNONYMS.get((sev or "medium").strip().lower(), "medium")


def _severity_order(sev: str) -> int:
    # Accept LLM-emitted synonyms (``critical``, ``blocker``, …) so the
    # high-severity short-circuit upstream actually fires; without
    # normalisation the lookup returned 0 and the gate silently no-opped.
    return {"high": 3, "medium": 2, "low": 1}.get(_normalize_severity(sev), 0)


def evaluate_deal_breakers(
    icp_analysis: dict[str, Any], corpus: str
) -> list[dict[str, Any]]:
    """Return list of matching deal-breaker hits — empty when none match."""
    hits: list[dict[str, Any]] = []
    for db_item in icp_analysis.get("deal_breakers") or []:
        if not isinstance(db_item, dict):
            continue
        name = (db_item.get("name") or "").strip()
        severity = _normalize_severity(db_item.get("severity") or "")
        reason = (db_item.get("reason") or "").strip()
        if not name:
            continue

        matched_pattern: str | None = None
        if re.search(r"\b" + re.escape(name) + r"\b", corpus, re.I):
            matched_pattern = name
        elif reason:
            # Derive a soft regex from key tokens in the reason string.
            tokens = [t for t in re.findall(r"[A-Za-z][A-Za-z0-9-]{3,}", reason)][:4]
            for tok in tokens:
                if re.search(r"\b" + re.escape(tok) + r"\b", corpus, re.I):
                    matched_pattern = tok
                    break

        if matched_pattern is not None:
            hits.append({
                "name": name,
                "severity": severity,
                "matched_pattern": matched_pattern,
            })
    return hits


def score_segments(
    icp_analysis: dict[str, Any],
    classification: dict[str, Any],
    corpus: str,
) -> dict[str, Any]:
    """Score each segment and pick the best match."""
    industry = (classification.get("industry") or "").strip().lower()
    segments = icp_analysis.get("segments") or []

    best: dict[str, Any] = {"best_segment": "", "fit": 0.0, "evidence": []}
    best_score = -1.0

    for seg in segments:
        if not isinstance(seg, dict):
            continue
        seg_name = (seg.get("name") or "").strip()
        seg_industry = (seg.get("industry") or "").strip().lower()
        seg_stage = seg.get("stage") or ""
        seg_geo = seg.get("geo") or ""
        seg_fit = float(seg.get("fit") or 0.5)

        if industry and seg_industry and industry == seg_industry:
            industry_match = 1.0
        elif industry and seg_industry:
            industry_match = _fuzzy_ratio(industry, seg_industry)
        else:
            industry_match = 0.0

        stage_match = _count_tokens_hits(corpus, seg_stage, max_expected=2)
        geo_match = _count_tokens_hits(corpus, seg_geo, max_expected=2)

        composite = seg_fit * (
            0.70 * industry_match + 0.15 * stage_match + 0.15 * geo_match
        )
        if composite > best_score:
            evidence: list[str] = []
            if industry_match >= 0.9 and seg_industry:
                evidence.append(f"industry:{seg_industry}")
            if stage_match > 0 and seg_stage:
                evidence.append(f"stage:{seg_stage}")
            if geo_match > 0 and seg_geo:
                evidence.append(f"geo:{seg_geo}")
            best_score = composite
            best = {
                "best_segment": seg_name,
                "fit": round(composite, 4),
                "evidence": evidence,
            }
    return best if best_score >= 0 else {"best_segment": "", "fit": 0.0, "evidence": []}


def score_personas(
    icp_analysis: dict[str, Any], careers_markdown: str
) -> dict[str, Any]:
    """Score each persona against careers markdown and pick the best match."""
    personas = icp_analysis.get("personas") or []
    careers_lc = (careers_markdown or "").lower()

    best = {"best_title": "", "fit": 0.0}
    best_score = -1.0

    for p in personas:
        if not isinstance(p, dict):
            continue
        title = (p.get("title") or "").strip()
        department = (p.get("department") or "").strip()

        fit = 0.0
        if title and re.search(r"\b" + re.escape(title) + r"\b", careers_lc, re.I):
            fit += 0.7
        if department and re.search(r"\b" + re.escape(department) + r"\b", careers_lc, re.I):
            fit += 0.3

        if fit == 0.0 and title:
            # Token-overlap fallback: any single-word title hit counts partial.
            for tok in title.split():
                tok = tok.strip().lower()
                if len(tok) >= 4 and tok in careers_lc:
                    fit = max(fit, 0.3)
                    break

        fit = min(fit, 1.0)
        if fit > best_score:
            best_score = fit
            best = {"best_title": title, "fit": round(fit, 4)}
    return best if best_score >= 0 else {"best_title": "", "fit": 0.0}


def tier_for(score: float) -> str | None:
    if score >= HOT_THRESHOLD:
        return "hot"
    if score >= WARM_THRESHOLD:
        return "warm"
    if score > 0:
        return "cold"
    return None


def compute_icp_fit(
    *,
    icp_analysis: dict[str, Any],
    classification: dict[str, Any],
    home_markdown: str,
    careers_markdown: str,
    regex_score: float,
    weights: dict[str, float] | None = None,
) -> dict[str, Any]:
    """Compute the composite-score block for one (company, product) pair.

    Returns a dict with keys: ``icp_fit``, ``composite_score``, ``composite_tier``.
    Honours deal-breaker gating — a high-severity hit short-circuits to
    ``composite_tier="disqualified"``, ``composite_score=0.0``.
    """
    w = weights or load_composite_weights()
    industry = (classification.get("industry") or "").strip().lower()
    category = (classification.get("category") or "").strip().lower()
    corpus = "\n".join([
        home_markdown or "",
        careers_markdown or "",
        industry,
        category,
    ])

    deal_breaker_hits = evaluate_deal_breakers(icp_analysis, corpus)
    graph_meta = icp_analysis.get("graph_meta") or {}
    icp_fit_block: dict[str, Any] = {
        "weighted_total": float(icp_analysis.get("weighted_total") or 0.0),
        "segment_match": {"best_segment": "", "fit": 0.0, "evidence": []},
        "persona_match": {"best_title": "", "fit": 0.0},
        "deal_breaker_hits": deal_breaker_hits,
        "weights_hash": str(graph_meta.get("weights_hash") or ""),
        "icp_analyzed_at": str(graph_meta.get("run_at") or ""),
    }

    high_hits = [h for h in deal_breaker_hits if _severity_order(h["severity"]) >= 3]
    if high_hits:
        log.info(
            "icp_fit: disqualified by deal-breakers=%s",
            [h["name"] for h in high_hits],
        )
        return {
            "icp_fit": icp_fit_block,
            "composite_score": 0.0,
            "composite_tier": "disqualified",
        }

    segment_match = score_segments(icp_analysis, classification, corpus)
    persona_match = score_personas(icp_analysis, careers_markdown or "")
    icp_fit_block["segment_match"] = segment_match
    icp_fit_block["persona_match"] = persona_match

    weighted_total = icp_fit_block["weighted_total"]
    evidence_match = 1.0 if segment_match.get("evidence") else 0.5
    composite = (
        w["alpha"] * float(regex_score or 0.0)
        + w["beta"] * weighted_total * evidence_match
        + w["gamma"] * float(segment_match.get("fit") or 0.0)
        + w["delta"] * float(persona_match.get("fit") or 0.0)
    )
    composite = round(min(max(composite, 0.0), 1.0), 4)

    return {
        "icp_fit": icp_fit_block,
        "composite_score": composite,
        "composite_tier": tier_for(composite),
    }


def build_v2_signals(
    *,
    schema_version: str,
    regex_signals: dict[str, Any],
    icp_block: dict[str, Any] | None,
    composite_score: float | None,
    composite_tier: str | None,
) -> dict[str, Any]:
    """Assemble the v2 signals jsonb shape. ``regex_signals`` carries the
    v1-compatible keys (minus schema_version, which moves to the root).
    """
    regex_only = {k: v for k, v in regex_signals.items() if k != "schema_version"}
    out: dict[str, Any] = {
        "schema_version": schema_version,
        "regex": regex_only,
    }
    if icp_block is not None:
        out["icp_fit"] = icp_block
    if composite_score is not None:
        out["composite_score"] = composite_score
    if composite_tier is not None:
        out["composite_tier"] = composite_tier
    return out


__all__ = [
    "DEFAULT_COMPOSITE_WEIGHTS",
    "HOT_THRESHOLD",
    "WARM_THRESHOLD",
    "build_v2_signals",
    "compute_icp_fit",
    "evaluate_deal_breakers",
    "load_composite_weights",
    "score_personas",
    "score_segments",
    "tier_for",
]
