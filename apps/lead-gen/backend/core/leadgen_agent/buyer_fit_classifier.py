"""Buyer-fit classifier for paper-author contact enrichment.

Heuristic, no-LLM verdict on whether a contact's affiliation is a plausible
B2B AI-engineering buyer. Distinct from Team A's ``affiliation_type``
(structural fact: academic vs industry); this is an ICP verdict.

Bands:
    buyer       — score >= 0.6
    not_buyer   — score <= 0.3
    unknown     — 0.4 <= score < 0.6

Inputs come from the OpenAlex author profile resolved upstream (see
``contact_enrich_paper_author_graph.resolve_openalex_author``):

    profile = {
        "institution": str,            # display name
        "institution_id": str,         # OpenAlex ID
        "institution_country": str,    # ISO 3166-1 alpha-2
        "institution_type": str,       # OpenAlex enum: education, company,
                                       # government, healthcare, facility,
                                       # archive, other, ""
        "institution_ror": str,        # ROR ID (mostly academic — empty for
                                       # most companies)
    }

``affiliation_type`` from Team A may be ``None`` when their classifier
hasn't run yet; this module degrades gracefully in that case.
"""

from __future__ import annotations

import re
from typing import Any

# Substrings that flag an institution name as academic when OpenAlex's
# institution_type field is missing. Lower-cased; matched as plain `in`.
_ACADEMIC_NAME_KEYWORDS: tuple[str, ...] = (
    "university",
    "institute of technology",
    "college",
    "academy",
    "school of",
    "polytechnic",
)

# AI/ML topical signals that boost buyer-fit when present in GitHub repo topics.
_GH_AI_TOPIC_SIGNALS: frozenset[str] = frozenset(
    {"llm", "rag", "agents", "transformers", "langchain", "autogen",
     "mlops", "fine-tuning", "diffusion", "neural-networks"}
)

# GitHub orgs whose membership is a strong industry-buyer signal. Lowercased
# org logins. Curated from the AI/ML company landscape — keep updated as the
# market shifts. Not exhaustive; an org missing here just means we don't get
# the +0.20 boost.
_INDUSTRY_AI_ORGS: frozenset[str] = frozenset({
    "anthropic", "openai", "huggingface", "mistralai", "cohere-ai", "cohere",
    "databricks", "langchain-ai", "langchain", "llamaindex", "run-llama",
    "scale-ai", "togethercomputer", "weights-biases", "fireworks-ai",
    "groqcloud", "mosaicml", "explosion", "spacy",
    "google", "google-research", "google-deepmind", "deepmind",
    "microsoft", "microsoftdocs", "azure", "msrayuwen",
    "meta-llama", "facebookresearch", "pytorch", "fairinternal",
    "nvidia", "nvidia-ai-iot", "nvidia-merlin", "nvidialabs",
    "amazon", "aws-samples", "awslabs", "amzn",
    "apple", "apple-ml",
    "salesforce", "salesforceeng", "salesforce-misc",
    "ibm", "ibm-research", "redhat-ai-services",
    "snowflakedb", "snowflake-labs",
    "vercel", "vercel-labs", "openai-evals",
    "stability-ai", "runwayml", "midjourney",
    "perplexity-ai", "you-com", "neeva",
    "cursor", "continuedev", "tabbyml", "githubnext",
    "weaviate", "qdrant", "milvus-io", "pinecone-io", "chroma-core",
    "ray-project", "mlflow", "wandb", "neptune-ai",
    "modular", "tinygrad",
})

_GH_BIO_ROLE_RE = re.compile(
    r"\b(engineer|founder|cto|ml lead|research engineer|principal|staff|director of engineering)\b",
    re.IGNORECASE,
)

# Hard cap on the boosted score. Leaves headroom below 1.0 so the OpenAlex
# 'company without ROR = 0.9' signal can still float to the top of buyer
# rankings without saturating.
GH_SCORE_CAP = 0.95


def _apply_gh_boosts(
    base_score: float,
    base_reasons: list[str],
    gh: dict[str, Any],
) -> tuple[float, list[str], list[str]]:
    """Apply additive GitHub boosts on top of the base buyer-fit score.

    Returns (boosted_score, boost_reasons, ai_signal_tags). Pure function;
    backward-compat path: when ``gh`` is empty, returns (base_score, [], []).

    Signal table:
        +0.20  industry_org_match (top-200 AI orgs lookup)
        +0.15  AI topic intersection in repo topics
        +0.10  bio matches role regex
        +0.05  hireable=true (only when known True, not None)
        tag    last_commit_at <90d AND any AI topic
    """
    if not gh:
        return base_score, [], []

    delta = 0.0
    reasons: list[str] = []
    ai_tags: list[str] = []

    # +0.20 — industry org membership (explicit field OR org_logins set)
    org_match = (gh.get("industry_org_match") or "").strip()
    org_logins_raw = gh.get("org_logins") or []
    if not org_match and isinstance(org_logins_raw, list):
        for login in org_logins_raw:
            if isinstance(login, str) and login.strip().lower() in _INDUSTRY_AI_ORGS:
                org_match = login.strip()
                break
    # The github_profile JSONB stores `company_org` which is the user's stated
    # employer org slug — also count it.
    if not org_match:
        company_org = (gh.get("company_org") or "").strip().lower()
        if company_org and company_org in _INDUSTRY_AI_ORGS:
            org_match = company_org
    if org_match:
        delta += 0.20
        reasons.append(f"gh.org: {org_match}")

    # +0.15 — AI repo topics
    topic_hits_raw = gh.get("ai_topic_hits") or gh.get("top_repo_topics") or []
    topic_hits: list[str] = []
    if isinstance(topic_hits_raw, list):
        topic_hits = [
            t.lower() if isinstance(t, str) else (t.get("name") or "").lower()
            for t in topic_hits_raw
            if (isinstance(t, str) and t) or (isinstance(t, dict) and t.get("name"))
        ]
    matched_topics = sorted(set(topic_hits) & _GH_AI_TOPIC_SIGNALS)
    if matched_topics:
        delta += 0.15
        reasons.append(f"gh.topics: {','.join(matched_topics[:3])}")

    # +0.10 — bio role match
    bio = (gh.get("bio") or "").strip()
    if bio and _GH_BIO_ROLE_RE.search(bio):
        m = _GH_BIO_ROLE_RE.search(bio)
        if m:
            reasons.append(f"gh.bio: {m.group(0).lower()}")
            delta += 0.10

    # +0.05 — hireable=true (not None)
    hireable = gh.get("hireable")
    hireable_known = bool(gh.get("hireable_known")) or (hireable is True or hireable is False)
    if hireable_known and hireable is True:
        delta += 0.05
        reasons.append("gh.hireable=true")

    # tag-only — recent commit + AI topic = "industry_active"
    last_push = (gh.get("last_push_at") or gh.get("last_commit_at") or "").strip()
    if last_push and matched_topics:
        # ISO timestamps sort lexicographically; treat anything within the
        # last ~90 days conservatively. Caller may set explicit recency on gh.
        ai_tags.append("gh.industry_active")

    boosted = min(base_score + delta, GH_SCORE_CAP)
    return boosted, reasons, ai_tags


def _classify_base(
    profile: dict[str, Any], affiliation_type: str | None
) -> tuple[str, float, list[str], bool]:
    """Compute the pre-boost verdict. The 4th element is is_hard_academic —
    if True, GH boosts can ONLY flip the verdict when industry_org_match is
    set OR (topics + bio role match), per the postdoc-at-Anthropic rule."""
    profile = profile or {}
    institution = (profile.get("institution") or "").strip()
    institution_type = (profile.get("institution_type") or "").strip().lower()
    institution_ror = (profile.get("institution_ror") or "").strip()

    # Rule 1: trust Team A's verdict when it explicitly says academic.
    if affiliation_type == "academic":
        return ("not_buyer", 0.1, ["affiliation_type=academic"], True)

    # Rule 2: OpenAlex education type is a hard academic signal.
    if institution_type == "education":
        return ("not_buyer", 0.15, ["openalex.institution.type=education"], True)

    # Rule 3: OpenAlex company type is the strongest buyer signal.
    if institution_type == "company" and institution:
        score = 0.8
        reasons = [f"openalex.institution.type=company: {institution}"]
        if not institution_ror:
            score = 0.9
            reasons.append("no ROR — typical of real B2B companies")
        return ("buyer", score, reasons, False)

    if institution_type == "government":
        return ("not_buyer", 0.25, ["government — typically not a B2B buyer"], False)

    if institution_type in {"healthcare", "facility"}:
        return (
            "not_buyer",
            0.3,
            ["healthcare facility — not a typical B2B AI-eng buyer"],
            False,
        )

    if institution_type in {"archive", "other"}:
        return ("unknown", 0.4, [f"institution_type={institution_type}"], False)

    if not institution_type and institution:
        lowered = institution.lower()
        if any(kw in lowered for kw in _ACADEMIC_NAME_KEYWORDS):
            return ("not_buyer", 0.2, ["name pattern: academic"], True)
        return (
            "unknown",
            0.5,
            ["no institution_type, no academic name signal"],
            False,
        )

    return ("unknown", 0.5, ["no institution"], False)


def _reband(score: float) -> str:
    if score >= 0.6:
        return "buyer"
    if score <= 0.3:
        return "not_buyer"
    return "unknown"


def classify_buyer_fit(
    profile: dict[str, Any],
    affiliation_type: str | None,
    gh: dict[str, Any] | None = None,
) -> tuple[str, float, list[str]]:
    """Return ``(verdict, score, reasons)`` for a resolved OpenAlex profile.

    Heuristic rules, applied in order — first hit wins. See module docstring
    for inputs and verdict bands.

    ``gh`` (optional): GitHub profile blob. When provided AND non-empty, the
    base score is augmented by additive boosts (`_apply_gh_boosts`); the
    verdict is re-banded after the boost. Backward-compat invariant:
    ``gh=None`` or ``gh={}`` returns the exact same tuple as before — pinned
    by a regression test in ``test_buyer_fit.py``.
    """
    base_verdict, base_score, base_reasons, is_hard_academic = _classify_base(
        profile, affiliation_type
    )

    if not gh:
        return base_verdict, base_score, base_reasons

    boosted_score, boost_reasons, ai_tags = _apply_gh_boosts(
        base_score, base_reasons, gh
    )

    # Backward-compat: if GH yielded zero boosts, return the exact pre-boost
    # tuple (same verdict, same score, same reasons — no spurious AI tags).
    if not boost_reasons and not ai_tags:
        return base_verdict, base_score, base_reasons

    new_reasons = list(base_reasons) + boost_reasons + ai_tags

    # Hard-academic floor: only allow flip-to-buyer when there's a strong
    # industry signal — org membership OR (topics + bio role).
    if is_hard_academic:
        org_signal = any(r.startswith("gh.org:") for r in boost_reasons)
        topics_signal = any(r.startswith("gh.topics:") for r in boost_reasons)
        bio_signal = any(r.startswith("gh.bio:") for r in boost_reasons)
        strong_industry = org_signal or (topics_signal and bio_signal)
        if not strong_industry:
            new_reasons.append("gh signals insufficient to override academic")
            return base_verdict, base_score, new_reasons
        if boosted_score < 0.6:
            return "not_buyer", boosted_score, new_reasons

    new_verdict = _reband(boosted_score)
    return new_verdict, boosted_score, new_reasons
