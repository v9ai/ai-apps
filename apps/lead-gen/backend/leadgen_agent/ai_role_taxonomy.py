"""AI-role taxonomy classifier for Ashby job postings.

Pure, side-effect free. Single source of truth for "is this an AI engineering
role?" and "is this remote?" decisions used by the Ashby ingest graph and the
ICP scorer.

The remote detection chain mirrors ``_job_tags()`` in
``ashby_ingest_graph.py`` so opportunities tagged ``remote`` in D1 line up
with the company-level ``remote_ai_role_count_30d`` counter on Neon.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any

# ── AI role detection ────────────────────────────────────────────────────────

# Multi-word patterns are matched as substrings (case-insensitive). Order
# matters only for ``matched_pattern`` reporting — the first hit wins, so
# more specific patterns come first.
_AI_PATTERNS: tuple[str, ...] = (
    "machine learning engineer",
    "ai research engineer",
    "ai infrastructure",
    "ai infra",
    "ai platform",
    "applied scientist",
    "applied ai",
    "foundation model",
    "ai engineer",
    "ml engineer",
    "llm engineer",
    "rag engineer",
    "genai engineer",
    "agentic",
    "mlops",
    "ai/ml",
)

# Phrases that suppress an otherwise positive AI match. These target
# non-IC roles whose titles legitimately contain AI-family terms (a
# recruiter for the AI team, a sales engineer selling AI products, etc.).
_AI_NEGATIVES: tuple[str, ...] = (
    "recruiter",
    "marketer",
    "marketing",
    "sales engineer for ai",
    "ai sales engineer",
    "sales engineer, ai",
    "sales engineer - ai",
    "sales engineer — ai",
    "sales engineer – ai",
    "account executive",
    "customer success",
)

# ── Remote detection ─────────────────────────────────────────────────────────

# Word-boundary match on remote-ish location strings, with hybrid/on-site
# qualifiers acting as a veto. ``_REMOTE_LOC_RE`` is checked against the
# raw location string only; title/description fall through to the explicit
# "fully remote" / "100% remote" rule.
_REMOTE_LOC_RE = re.compile(r"\b(remote|worldwide|anywhere)\b", re.IGNORECASE)
_HYBRID_VETO_RE = re.compile(r"\b(hybrid|on[- ]?site|in[- ]?office)\b", re.IGNORECASE)
_FULLY_REMOTE_RE = re.compile(r"\b(fully\s+remote|100\s*%\s*remote)\b", re.IGNORECASE)

_REMOTE_WORKPLACE_TYPES: frozenset[str] = frozenset({"remote", "fully remote"})

# Description scan budget for the **remote** detector. Bounded because Ashby
# ``descriptionPlain`` can be many KB and the "fully remote" / "100% remote"
# signal lives in the first paragraph.
#
# The AI-role classifier intentionally does **not** scan the description —
# Ashby boards reliably contain company-tagline boilerplate ("we build AI
# applications", "framework for building AI applications") that produced
# false positives like "Senior Security Engineer" and "Deployed Engineer".
# Even AI-first companies label their AI roles in the title.
_DESC_SCAN_CHARS = 2000


@dataclass(frozen=True)
class RoleClassification:
    """Result of :func:`classify_role`."""

    is_ai_role: bool
    is_remote: bool
    matched_pattern: str | None


def _norm(s: Any) -> str:
    if not s:
        return ""
    return str(s).lower()


def _has_negative(text: str) -> bool:
    return any(neg in text for neg in _AI_NEGATIVES)


def _first_ai_match(text: str) -> str | None:
    for pat in _AI_PATTERNS:
        if pat in text:
            return pat
    return None


def is_ai_role(
    title: str | None,
    description: str | None = None,
) -> tuple[bool, str | None]:
    """Return ``(is_ai_role, matched_pattern)``.

    The title is the primary signal; description is only consulted when the
    title alone is silent. A negative term anywhere in either field
    suppresses the match.
    """
    title_lc = _norm(title)
    desc_lc = _norm(description)[:_DESC_SCAN_CHARS]

    if _has_negative(title_lc) or _has_negative(desc_lc):
        return False, None

    title_match = _first_ai_match(title_lc)
    if title_match is not None:
        return True, title_match

    desc_match = _first_ai_match(desc_lc)
    if desc_match is not None:
        return True, desc_match

    return False, None


def is_remote(job: dict[str, Any]) -> bool:
    """Mirror the priority chain documented in the plan.

    1. ``isRemote`` truthy → remote.
    2. ``workplaceType`` in {Remote, Fully Remote} → remote.
    3. ``location`` matches ``\\b(remote|worldwide|anywhere)\\b`` and does
       not contain a hybrid/on-site qualifier → remote.
    4. Title or first 2k chars of ``descriptionPlain`` contains
       ``fully remote`` / ``100% remote`` → remote.

    Anything else is non-remote.
    """
    if job.get("isRemote") is True:
        return True

    workplace = _norm(job.get("workplaceType"))
    if workplace in _REMOTE_WORKPLACE_TYPES:
        return True

    location = job.get("location") or ""
    if location:
        if _REMOTE_LOC_RE.search(location) and not _HYBRID_VETO_RE.search(location):
            return True

    title = job.get("title") or ""
    desc = (job.get("descriptionPlain") or "")[:_DESC_SCAN_CHARS]
    if _FULLY_REMOTE_RE.search(title) or _FULLY_REMOTE_RE.search(desc):
        return True

    return False


def classify_role(
    title: str | None,
    description: str | None = None,
    *,
    workplace_type: str | None = None,
    is_remote_flag: bool | None = None,
    location: str | None = None,
) -> RoleClassification:
    """Classify a single Ashby job.

    The ``workplace_type`` / ``is_remote_flag`` / ``location`` keyword
    arguments correspond to the Ashby payload fields. They're optional so
    the function works on the bare minimum (title + description) and
    upgrades cleanly when given the full job dict.
    """
    ai, pattern = is_ai_role(title, description)

    job: dict[str, Any] = {
        "title": title,
        "descriptionPlain": description,
        "workplaceType": workplace_type,
        "isRemote": is_remote_flag,
        "location": location,
    }
    remote = is_remote(job)

    return RoleClassification(
        is_ai_role=ai,
        is_remote=remote,
        matched_pattern=pattern,
    )


def classify_job(job: dict[str, Any]) -> RoleClassification:
    """Convenience wrapper for code paths that already hold the Ashby dict."""
    return classify_role(
        title=job.get("title"),
        description=job.get("descriptionPlain"),
        workplace_type=job.get("workplaceType"),
        is_remote_flag=job.get("isRemote"),
        location=job.get("location"),
    )


__all__ = [
    "RoleClassification",
    "classify_job",
    "classify_role",
    "is_ai_role",
    "is_remote",
]
