"""Product-vertical registry — shared contracts for lead-gen verticals.

Every product we sell lives behind one ``ProductVertical`` instance registered
in the module-level ``VERTICALS`` dict. The generic enrichment scorer and
discovery harvester consume this registry; they hold zero product-specific
logic.

Adding a new product is a single file under ``verticals/<slug>.py`` that
constructs and registers a ``ProductVertical``. No new migrations, no new
graph nodes, no new graph files.

Signal shape (``signals`` jsonb on ``company_product_signals``):

    {
      "schema_version": "1.0.0",           # from ProductVertical.schema_version
      "<bool key>": true,                  # kind="bool" rule fired
      "<label key>": "langchain",          # kind="label" rule fired with that label
      ...
    }

The ``schema_version`` lives in the jsonb so a vertical can evolve its signal
shape without a DDL migration — bump the version, write a reader that tolerates
both, drop support when usage is gone.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any, Literal


# ── Shared contracts ──────────────────────────────────────────────────────

@dataclass(frozen=True)
class SignalRule:
    """One regex-driven signal extracted from company text.

    ``kind="bool"`` sets ``signals[key] = True`` when the pattern matches.
    ``kind="label"`` sets ``signals[key] = label`` when the pattern matches —
    useful for enum-ish signals like ``rag_stack_detected`` where one of
    several labels is picked based on which pattern hit.
    """

    key: str
    pattern: re.Pattern[str]
    kind: Literal["bool", "label"]
    label: str | None = None          # required when kind == "label"
    first_match_wins: bool = True     # for label kind; first rule in list that matches


@dataclass(frozen=True)
class AntiIcpPredicate:
    """An exclusion rule applied post-discovery.

    ``predicate`` determines how ``value`` is matched:
      - ``"domain_in"``: ``value`` is a list of canonical domains; company
        is excluded if its ``canonical_domain`` is in the list.
      - ``"description_regex"``: ``value`` is a regex string; company is
        excluded if its ``description`` matches.
    """

    name: str
    predicate: Literal["domain_in", "description_regex"]
    value: Any
    reason: str


@dataclass(frozen=True)
class ProductVertical:
    """A single product's lead-gen configuration.

    Contains everything the generic enrichment scorer and discovery harvester
    need to route work for this product. Frozen so it's safe to share across
    async tasks.
    """

    slug: str                                           # must match products.slug
    product_id: int                                     # FK into products.id
    schema_version: str                                 # goes into signals jsonb
    seed_query: str                                     # for company_discovery_graph expander
    keywords: tuple[str, ...]                           # for keyword heuristics
    signal_rules: tuple[SignalRule, ...]                # applied to home+careers markdown
    anti_icp_predicates: tuple[AntiIcpPredicate, ...]   # post-discovery filters
    github_code_queries: tuple[str, ...]                # GET /search/code queries
    github_owner_deny: frozenset[str]                   # vendor orgs to drop from results
    github_filter_out: tuple[re.Pattern[str], ...]      # tutorial/course/fork regex list
    email_template_name_by_step: dict[int, str] = field(default_factory=dict)
    # Optional: map from `signals[key]` to a per-signal score weight used by
    # the default scorer. If absent the scorer uses a flat +1.0 per truthy
    # signal. Weights sum to roughly 1.0 per vertical; tier thresholds are
    # applied after summing.
    score_weights: dict[str, float] = field(default_factory=dict)

    def __post_init__(self) -> None:
        # Basic validation — fail fast at import time if a vertical is
        # misconfigured, rather than at enrichment-scoring time.
        if not self.slug:
            raise ValueError("ProductVertical.slug is required")
        if not self.schema_version:
            raise ValueError(f"{self.slug}: schema_version is required")
        for rule in self.signal_rules:
            if rule.kind == "label" and not rule.label:
                raise ValueError(
                    f"{self.slug}: SignalRule(key={rule.key!r}) kind=label "
                    f"requires a non-empty label"
                )


# ── Global registry ───────────────────────────────────────────────────────

VERTICALS: dict[str, ProductVertical] = {}


def register(vertical: ProductVertical) -> ProductVertical:
    """Register a ProductVertical in the global registry.

    Called from each ``verticals/<slug>.py`` module at import time. Returns
    the passed-in vertical for convenience (so modules can write
    ``INGESTIBLE = register(ProductVertical(...))``).
    """
    existing = VERTICALS.get(vertical.slug)
    if existing is not None and existing is not vertical:
        raise ValueError(
            f"Vertical slug {vertical.slug!r} already registered — "
            f"each product must have a unique slug."
        )
    VERTICALS[vertical.slug] = vertical
    return vertical


def get_vertical(slug: str) -> ProductVertical:
    """Fetch a registered vertical, raising if the slug is unknown."""
    try:
        return VERTICALS[slug]
    except KeyError as e:
        known = sorted(VERTICALS)
        raise KeyError(
            f"No vertical registered for slug={slug!r}. Known: {known}"
        ) from e


def all_verticals() -> tuple[ProductVertical, ...]:
    """Return all registered verticals in deterministic slug order."""
    return tuple(VERTICALS[slug] for slug in sorted(VERTICALS))


# ── Scoring helpers (used by the generic score_verticals node) ─────────────

def apply_signal_rules(
    vertical: ProductVertical, corpus: str
) -> dict[str, Any]:
    """Run all of a vertical's ``signal_rules`` against ``corpus``.

    Returns a dict ready to merge into the ``signals`` jsonb column. Always
    includes ``schema_version`` so readers can detect old rows. Only rules
    that fire contribute keys — missing keys are implicitly false/unset.

    Label rules with ``first_match_wins=True`` stop at the first hit for
    their ``key``; subsequent label rules for the same key are skipped.
    """
    out: dict[str, Any] = {"schema_version": vertical.schema_version}
    label_keys_claimed: set[str] = set()
    for rule in vertical.signal_rules:
        if not rule.pattern.search(corpus):
            continue
        if rule.kind == "bool":
            out[rule.key] = True
        elif rule.kind == "label":
            if rule.first_match_wins and rule.key in label_keys_claimed:
                continue
            out[rule.key] = rule.label
            label_keys_claimed.add(rule.key)
    return out


def compute_score_and_tier(
    vertical: ProductVertical, signals: dict[str, Any]
) -> tuple[float, str | None]:
    """Default aggregate: weighted-sum score + threshold-based tier.

    Flat +1.0 per truthy signal unless the vertical supplies ``score_weights``.
    The ``schema_version`` key is excluded from scoring. Tier thresholds are
    a simple 3-band cut: ``>= 0.66 → "hot"``, ``>= 0.33 → "warm"``, else
    ``"cold"``. A vertical that wants a different algorithm can override by
    computing its own values before writing.
    """
    weights = vertical.score_weights
    total = 0.0
    for key, value in signals.items():
        if key == "schema_version":
            continue
        # Truthy non-empty values contribute. Label values contribute the
        # same as bool True — their presence is the signal; the specific
        # label is carried for downstream filtering / display only.
        if not value:
            continue
        total += weights.get(key, 1.0)

    if total >= 0.66:
        tier: str | None = "hot"
    elif total >= 0.33:
        tier = "warm"
    elif total > 0:
        tier = "cold"
    else:
        tier = None
    return total, tier
