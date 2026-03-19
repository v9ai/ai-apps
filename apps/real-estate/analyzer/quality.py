"""Rule-based listing quality / deception detector.

Pure Python — no LLM calls, no external APIs.  Runs in < 1 ms.
"""

from __future__ import annotations

import statistics
from typing import Literal

from pydantic import BaseModel, Field

from .models import ComparableListing, ListingExtraction

# ---------------------------------------------------------------------------
# Output model
# ---------------------------------------------------------------------------

Flag = Literal[
    "unrealistic_price",
    "missing_key_fields",
    "inconsistent_details",
    "suspicious_description",
    "price_anomaly",
    "too_good_to_be_true",
]


class ListingQuality(BaseModel):
    quality_score: float = Field(ge=0.0, le=1.0)
    warnings: list[str] = Field(default_factory=list)
    flags: list[Flag] = Field(default_factory=list)
    recommendation: Literal["proceed", "caution", "avoid"]


# ---------------------------------------------------------------------------
# Typical zone averages (EUR/m²) — used for "too good to be true" check
# when no comparables are supplied.  Sourced from the valuator system prompt.
# ---------------------------------------------------------------------------

_ZONE_AVG: dict[str, float] = {
    # Moldova — Chisinau
    "centru": 1250,
    "aeroport": 1050,
    "botanica": 1050,
    "riscani": 1050,
    "râșcani": 1050,
    "ciocana": 1050,
    "telecentru": 1000,
    "buiucani": 1000,
    # Romania — Bucharest
    "sector 1": 2250,
    "sector 2": 2250,
    "sector 3": 1600,
    "sector 4": 1600,
    "sector 5": 1250,
    "sector 6": 1250,
    # Romania — other cities
    "cluj-napoca": 1900,
    "iasi": 1250,
    "iași": 1250,
    "timisoara": 1500,
    "timișoara": 1500,
}

# Fallback when neither comparables nor zone lookup succeed
_DEFAULT_AVG: float = 1000.0


# ---------------------------------------------------------------------------
# Severity weights per flag (used to compute quality_score)
# ---------------------------------------------------------------------------

_SEVERITY: dict[Flag, float] = {
    "unrealistic_price": 0.30,
    "missing_key_fields": 0.15,
    "inconsistent_details": 0.20,
    "suspicious_description": 0.10,
    "price_anomaly": 0.25,
    "too_good_to_be_true": 0.25,
}


# ---------------------------------------------------------------------------
# Helper: look up a zone average from the static table
# ---------------------------------------------------------------------------

def _zone_average(zone: str | None) -> float | None:
    if zone is None:
        return None
    key = zone.strip().lower()
    if key in _ZONE_AVG:
        return _ZONE_AVG[key]
    # Partial match — e.g. "Botanica, str. Dacia" should still match "botanica"
    for z, avg in _ZONE_AVG.items():
        if z in key or key in z:
            return avg
    return None


# ---------------------------------------------------------------------------
# Core assessment function
# ---------------------------------------------------------------------------

def assess_quality(
    extraction: ListingExtraction,
    comparables: list[ComparableListing] | None = None,
) -> ListingQuality:
    """Run fast rule-based checks on an extracted listing and return a quality verdict."""

    warnings: list[str] = []
    flags: list[Flag] = []

    price = extraction.price_eur
    size = extraction.size_m2
    rooms = extraction.rooms
    zone = extraction.zone
    price_per_m2 = extraction.price_per_m2

    # Derive price_per_m2 if not present but computable
    if price_per_m2 is None and price is not None and size is not None and size > 0:
        price_per_m2 = price / size

    # ------------------------------------------------------------------
    # 1. Price sanity
    # ------------------------------------------------------------------
    if price is not None:
        if price < 5_000:
            flags.append("unrealistic_price")
            warnings.append(
                f"Price ({price} EUR) is suspiciously low — possible placeholder or error."
            )
        elif price > 500_000:
            flags.append("unrealistic_price")
            warnings.append(
                f"Price ({price} EUR) is unusually high for a standard apartment."
            )

    # ------------------------------------------------------------------
    # 2. Size sanity
    # ------------------------------------------------------------------
    if size is not None:
        if size < 15:
            flags.append("inconsistent_details")
            warnings.append(
                f"Size ({size} m2) is below 15 m2 — unlikely for a habitable apartment."
            )
        elif size > 300:
            flags.append("inconsistent_details")
            warnings.append(
                f"Size ({size} m2) exceeds 300 m2 — verify this is a single residential unit."
            )

    # ------------------------------------------------------------------
    # 3. Missing key fields
    # ------------------------------------------------------------------
    missing: list[str] = []
    if rooms is None:
        missing.append("rooms")
    if size is None:
        missing.append("size")
    if zone is None:
        missing.append("zone")
    if missing:
        flags.append("missing_key_fields")
        warnings.append(
            f"Key field(s) missing: {', '.join(missing)}. Valuation accuracy is reduced."
        )

    # ------------------------------------------------------------------
    # 4. Inconsistent details — rooms vs size
    # ------------------------------------------------------------------
    if rooms is not None and size is not None:
        if rooms >= 5 and size < 50:
            flags.append("inconsistent_details")
            warnings.append(
                f"{rooms} rooms in only {size} m2 is physically implausible."
            )
        if rooms == 1 and size > 120:
            flags.append("inconsistent_details")
            warnings.append(
                f"1 room but {size} m2 — likely a data-entry error or mislabelled listing."
            )

    # ------------------------------------------------------------------
    # 5. Price/m² outlier vs comparables
    # ------------------------------------------------------------------
    if price_per_m2 is not None and comparables:
        comp_prices = [
            c.price_per_m2
            for c in comparables
            if c.price_per_m2 is not None
        ]
        if comp_prices:
            median_comp = statistics.median(comp_prices)
            if median_comp > 0:
                deviation = abs(price_per_m2 - median_comp) / median_comp
                if deviation > 0.40:
                    flags.append("price_anomaly")
                    warnings.append(
                        f"Price/m2 ({price_per_m2:.0f} EUR) deviates "
                        f"{deviation * 100:.0f}% from comparable median "
                        f"({median_comp:.0f} EUR/m2)."
                    )

    # ------------------------------------------------------------------
    # 6. Too good to be true — vs zone average
    # ------------------------------------------------------------------
    if price_per_m2 is not None:
        zone_avg = _zone_average(zone)
        if zone_avg is None and not comparables:
            zone_avg = _DEFAULT_AVG  # conservative fallback
        if zone_avg is not None and zone_avg > 0:
            ratio = price_per_m2 / zone_avg
            if ratio < 0.50:
                flags.append("too_good_to_be_true")
                warnings.append(
                    f"Price/m2 ({price_per_m2:.0f} EUR) is less than 50% of "
                    f"the typical zone average ({zone_avg:.0f} EUR/m2). "
                    "Verify listing authenticity."
                )

    # ------------------------------------------------------------------
    # Deduplicate flags (a flag type should appear at most once)
    # ------------------------------------------------------------------
    seen: set[Flag] = set()
    unique_flags: list[Flag] = []
    for f in flags:
        if f not in seen:
            seen.add(f)
            unique_flags.append(f)
    flags = unique_flags

    # ------------------------------------------------------------------
    # Compute quality_score
    # ------------------------------------------------------------------
    total_penalty = sum(_SEVERITY.get(f, 0.10) for f in flags)
    quality_score = round(max(0.0, min(1.0, 1.0 - total_penalty)), 2)

    # ------------------------------------------------------------------
    # Recommendation
    # ------------------------------------------------------------------
    if quality_score >= 0.70:
        recommendation: Literal["proceed", "caution", "avoid"] = "proceed"
    elif quality_score >= 0.40:
        recommendation = "caution"
    else:
        recommendation = "avoid"

    return ListingQuality(
        quality_score=quality_score,
        warnings=warnings,
        flags=flags,
        recommendation=recommendation,
    )
