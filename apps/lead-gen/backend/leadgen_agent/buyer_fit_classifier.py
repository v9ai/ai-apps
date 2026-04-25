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


def classify_buyer_fit(
    profile: dict[str, Any], affiliation_type: str | None
) -> tuple[str, float, list[str]]:
    """Return ``(verdict, score, reasons)`` for a resolved OpenAlex profile.

    Heuristic rules, applied in order — first hit wins. See module docstring
    for inputs and verdict bands.
    """
    profile = profile or {}
    institution = (profile.get("institution") or "").strip()
    institution_type = (profile.get("institution_type") or "").strip().lower()
    institution_ror = (profile.get("institution_ror") or "").strip()

    # Rule 1: trust Team A's verdict when it explicitly says academic.
    if affiliation_type == "academic":
        return ("not_buyer", 0.1, ["affiliation_type=academic"])

    # Rule 2: OpenAlex education type is a hard academic signal.
    if institution_type == "education":
        return ("not_buyer", 0.15, ["openalex.institution.type=education"])

    # Rule 3: OpenAlex company type is the strongest buyer signal.
    if institution_type == "company" and institution:
        score = 0.8
        reasons = [f"openalex.institution.type=company: {institution}"]
        # ROR registry is biased toward academic institutions; a company
        # without a ROR is almost always real B2B (ROR'd "companies" are
        # often academic spin-outs / hospitals catalogued as companies).
        if not institution_ror:
            score = 0.9
            reasons.append("no ROR — typical of real B2B companies")
        return ("buyer", score, reasons)

    # Rule 4: government affiliations don't buy B2B SaaS through the same
    # channels as private companies.
    if institution_type == "government":
        return (
            "not_buyer",
            0.25,
            ["government — typically not a B2B buyer"],
        )

    # Rule 5: healthcare / facility — hospital systems and standalone clinics
    # rarely procure AI-engineering tooling at our ICP scale.
    if institution_type in {"healthcare", "facility"}:
        return (
            "not_buyer",
            0.3,
            ["healthcare facility — not a typical B2B AI-eng buyer"],
        )

    # Rule 6: archive / other — keep them as unknown so QA can review.
    if institution_type in {"archive", "other"}:
        return (
            "unknown",
            0.4,
            [f"institution_type={institution_type}"],
        )

    # Rule 7: no institution_type but we have a name — fall back to keyword
    # heuristics. OpenAlex misses the type field for ~10% of institutions.
    if not institution_type and institution:
        lowered = institution.lower()
        if any(kw in lowered for kw in _ACADEMIC_NAME_KEYWORDS):
            return ("not_buyer", 0.2, ["name pattern: academic"])
        return (
            "unknown",
            0.5,
            ["no institution_type, no academic name signal"],
        )

    # Rule 8: nothing to go on.
    return ("unknown", 0.5, ["no institution"])
