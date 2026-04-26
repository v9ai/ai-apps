"""Per-source semaphores for paper-author enrichment fan-out branches.

Each branch in ``contact_enrich_paper_author_graph.py`` issues outbound HTTP
calls; without a per-source cap, a busy batch run can saturate the GitHub /
Semantic Scholar / ORCID rate budgets in a few seconds. These gates bound
concurrent in-flight requests *across* contacts.

Lazy-instantiation pattern mirrors ``loaders._chromium_gate`` (line 117–126):
LangGraph invokes us under different event loops across runs, so the gates
must be created on first use inside whichever loop is active rather than
pinned at import time.
"""

from __future__ import annotations

import asyncio

# GitHub: 5K req/hr authenticated. ~12 calls/contact in enrich_github_profile.
# Cap at 8 in-flight to leave headroom for resolve_github_handle's burst of
# Search Users calls running alongside.
_GH_GATE: asyncio.Semaphore | None = None
# ORCID: 24 req/sec public limit. 4 in-flight is well under.
_ORCID_GATE: asyncio.Semaphore | None = None
# Semantic Scholar: 100 req/5min unauthenticated, 1 req/sec keyed. 2 in-flight
# stays inside the keyed sustained rate even with multi-contact parallelism.
_SS_GATE: asyncio.Semaphore | None = None
# Homepage scraper: outbound HTML fetch. Don't pile on the same upstream
# academic web server when many co-authors share an institution.
_HOMEPAGE_GATE: asyncio.Semaphore | None = None
# PDF email-extract: pypdf + ~5MB body per fetch is memory-heavy.
_PDF_GATE: asyncio.Semaphore | None = None
# LinkedIn: pure DB lookup, but cap to keep the connection pool sane under
# bulk batch runs.
_LI_GATE: asyncio.Semaphore | None = None


def gh_gate() -> asyncio.Semaphore:
    global _GH_GATE
    if _GH_GATE is None:
        _GH_GATE = asyncio.Semaphore(8)
    return _GH_GATE


def orcid_gate() -> asyncio.Semaphore:
    global _ORCID_GATE
    if _ORCID_GATE is None:
        _ORCID_GATE = asyncio.Semaphore(4)
    return _ORCID_GATE


def ss_gate() -> asyncio.Semaphore:
    global _SS_GATE
    if _SS_GATE is None:
        _SS_GATE = asyncio.Semaphore(2)
    return _SS_GATE


def homepage_gate() -> asyncio.Semaphore:
    global _HOMEPAGE_GATE
    if _HOMEPAGE_GATE is None:
        _HOMEPAGE_GATE = asyncio.Semaphore(3)
    return _HOMEPAGE_GATE


def pdf_gate() -> asyncio.Semaphore:
    global _PDF_GATE
    if _PDF_GATE is None:
        _PDF_GATE = asyncio.Semaphore(2)
    return _PDF_GATE


def linkedin_gate() -> asyncio.Semaphore:
    global _LI_GATE
    if _LI_GATE is None:
        _LI_GATE = asyncio.Semaphore(2)
    return _LI_GATE
