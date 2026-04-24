"""Seed-query configs for product-specific lead-gen verticals.

Each module exports:
    SEED_QUERY: str               — free-text seed for `company_discovery_graph`
    VERTICAL: str                 — short vertical slug stored on companies
    KEYWORDS: list[str]           — heuristic keywords used by the LLM expander
    HOT_LEAD_SIGNALS: dict        — programmatic signal definitions (GitHub code
                                    search, HN/Reddit mining, ATS scrape regex)
                                    for downstream enrichment to populate the
                                    per-product signal columns on `companies`.

Callers pass SEED_QUERY/VERTICAL/KEYWORDS into ``CompanyDiscoveryState`` and
consume HOT_LEAD_SIGNALS from whichever enrichment node scores the vertical.
"""

from . import ingestible  # noqa: F401 — re-exports the module

__all__ = ["ingestible"]
