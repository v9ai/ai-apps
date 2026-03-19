"""Classify apartment features by their impact on property value.

Rule-based classifier using keyword matching against hedonic adjustment
factors from real estate research (aligned with the valuator's system prompt).
"""

from __future__ import annotations

import re
from typing import Literal

from pydantic import BaseModel, Field


class ClassifiedFeature(BaseModel):
    name: str
    impact: Literal["positive", "neutral", "negative"]
    category: Literal["location", "condition", "amenity", "building", "risk"]
    weight: float = Field(
        description="Estimated % impact on value, e.g. 0.05 = +5%"
    )
    description: str


# ---------------------------------------------------------------------------
# Keyword rule tables
# Each entry: (compiled regex, impact, category, weight, description)
# ---------------------------------------------------------------------------

_POSITIVE_RULES: list[tuple[re.Pattern[str], str, str, float, str]] = [
    # Condition
    (
        re.compile(
            r"(euro[- ]?r[eé]par|euro[- ]?renov|renovat\b|repar(at|ație)\s*(euro|nou[aă])|renovare\s+complet[aă])",
            re.IGNORECASE,
        ),
        "positive", "condition", 0.12,
        "Euro-renovation or full renovation adds 10-15% to value",
    ),
    (
        re.compile(
            r"(condi[tț]ie\s+bun[aă]|stare\s+bun[aă]|well[- ]?maintained)",
            re.IGNORECASE,
        ),
        "positive", "condition", 0.05,
        "Good condition adds moderate value vs average stock",
    ),
    # Amenity — balcony / loggia
    (
        re.compile(r"(balcon|loggia|lod?j[iî])", re.IGNORECASE),
        "positive", "amenity", 0.04,
        "Balcony or loggia adds 3-5% to value",
    ),
    # Amenity — parking
    (
        re.compile(
            r"(parking|parcare|garaj|loc\s+de\s+parcare|underground\s+park)",
            re.IGNORECASE,
        ),
        "positive", "amenity", 0.07,
        "Parking included adds 5-8% (underground up to 12%)",
    ),
    # Building — autonomous heating
    (
        re.compile(
            r"([îi]nc[aă]lzire\s+(autonom[aă]|individual[aă])|autonomous\s+heat|own\s+heat|centrala\s+(proprie|termic[aă]))",
            re.IGNORECASE,
        ),
        "positive", "amenity", 0.06,
        "Autonomous heating adds 5-7% — lower bills, independence from central system",
    ),
    # Building — new construction
    (
        re.compile(
            r"(bloc\s+nou|construc[tț]ie\s+nou[aă]|new\s+build|dat\s+[iî]n\s+exploatare\s*(20(1[5-9]|2\d))|anul\s*(20(1[5-9]|2\d)))",
            re.IGNORECASE,
        ),
        "positive", "building", 0.10,
        "New building (2015+) adds 8-12% — modern standards, lower maintenance",
    ),
    # Building — elevator (contextual, but marked positive; floor check done in classify_features)
    (
        re.compile(r"(ascensor|lift|elevator)", re.IGNORECASE),
        "positive", "building", 0.04,
        "Elevator adds 3-5% value (especially for floors above 4)",
    ),
    # Amenity — furnished / equipped kitchen
    (
        re.compile(
            r"(mobilat|mobilier|furnished|buc[aă]t[aă]rie\s+echipat[aă]|equipped\s+kitchen)",
            re.IGNORECASE,
        ),
        "positive", "amenity", 0.03,
        "Furnished or equipped kitchen adds 2-4%",
    ),
    # Amenity — security / intercom
    (
        re.compile(
            r"(securitate|paz[aă]|interfon|intercom|supraveghere\s+video|security|guard)",
            re.IGNORECASE,
        ),
        "positive", "amenity", 0.015,
        "Security or intercom adds 1-2%",
    ),
    # Amenity — storage
    (
        re.compile(
            r"(debara|c[aă]mar[aă]|boxa|storage\s+room|pantry)",
            re.IGNORECASE,
        ),
        "positive", "amenity", 0.015,
        "Storage room adds 1-2%",
    ),
    # Building — brick / monolith
    (
        re.compile(
            r"(c[aă]r[aă]mid[aă]|brick|monolit|monolithic|carcas[aă])",
            re.IGNORECASE,
        ),
        "positive", "building", 0.05,
        "Brick or monolith construction adds ~5% vs panel",
    ),
    # Location — park / green zone nearby
    (
        re.compile(
            r"(parc\b|vedere\s+la\s+parc|green\s+zone|zon[aă]\s+verde|park\s+view)",
            re.IGNORECASE,
        ),
        "positive", "location", 0.04,
        "Park or green area proximity adds 3-5%",
    ),
    # Amenity — air conditioning
    (
        re.compile(r"(aer\s+condi[tț]ionat|conditioner|AC\b|split\s+system)", re.IGNORECASE),
        "positive", "amenity", 0.02,
        "Air conditioning adds 1-3%",
    ),
]

_NEGATIVE_RULES: list[tuple[re.Pattern[str], str, str, float, str]] = [
    # Risk — near railway / highway
    (
        re.compile(
            r"(cale\s+ferat[aă]|railway|l[iî]ng[aă]\s+(autostrad[aă]|[șs]osea)|highway\s+near|near\s+(railway|highway))",
            re.IGNORECASE,
        ),
        "negative", "risk", 0.08,
        "Proximity to railway or highway reduces value 5-10%",
    ),
    # Building — old / Soviet-era
    (
        re.compile(
            r"(bloc\s+(sovietic|vechi|hru[sș][cč][ioe]v)|soviet|pre[- ]?198[0-9]|construi?t?\s*(19[4-7]\d|198[0-3])|seria\s+(102|135|143|MS))",
            re.IGNORECASE,
        ),
        "negative", "building", 0.07,
        "Old Soviet-era building reduces value 5-8%",
    ),
    # Building — panel construction
    (
        re.compile(r"(panel|panou|blocuri\s+de\s+panouri)", re.IGNORECASE),
        "negative", "building", 0.06,
        "Panel construction reduces value 5-8% vs brick/monolith",
    ),
    # Amenity — no balcony
    (
        re.compile(r"(f[aă]r[aă]\s+balcon|no\s+balcon|lipsă\s+balcon)", re.IGNORECASE),
        "negative", "amenity", 0.04,
        "No balcony reduces value 3-5%",
    ),
    # Amenity — shared / central heating
    (
        re.compile(
            r"([iî]nc[aă]lzire\s+central[aă]|centralizat[aă]|central\s+heat|termoficare|CET\b)",
            re.IGNORECASE,
        ),
        "negative", "amenity", 0.025,
        "Shared/central heating reduces value 2-3% vs autonomous",
    ),
    # Condition — needs renovation
    (
        re.compile(
            r"(necesit[aă]\s+repar|needs?\s+renov|f[aă]r[aă]\s+repar|var[ei]ant[aă]\s+alb[aă]|stare\s+satisf[aă]c[aă]toare)",
            re.IGNORECASE,
        ),
        "negative", "condition", 0.12,
        "Needs renovation reduces value 10-15% (cost to bring to standard)",
    ),
    # Risk — industrial view / road noise
    (
        re.compile(
            r"(vedere\s+(industrial|drum|[șs]osea)|industrial\s+view|road\s+(noise|view)|noise|zgomot)",
            re.IGNORECASE,
        ),
        "negative", "risk", 0.06,
        "Industrial view or road noise reduces value 5-8%",
    ),
    # Risk — airport proximity / aircraft noise
    (
        re.compile(
            r"(aeroport|airport|avia[tț]i[ei]|runway|pist[aă]\s+de\s+aterizare|flight\s*path|aircraft\s+noise|zbor|avion)",
            re.IGNORECASE,
        ),
        "negative", "risk", 0.08,
        "Airport proximity — aircraft noise reduces value 5-10%",
    ),
    # Risk — cemetery proximity
    (
        re.compile(
            r"(cimitir|cemetery|graveyard)",
            re.IGNORECASE,
        ),
        "negative", "risk", 0.03,
        "Cemetery proximity reduces value 2-4%",
    ),
    # Risk — landfill / waste facility
    (
        re.compile(
            r"(groap[aă]\s+de\s+gunoi|landfill|depozit\s+de[șs]euri|waste\s*(facility|plant)|gunoiste)",
            re.IGNORECASE,
        ),
        "negative", "risk", 0.10,
        "Landfill or waste facility proximity reduces value 8-12%",
    ),
]


def _check_floor_features(
    floor: int | None,
    total_floors: int | None,
    condition: str | None,
) -> list[ClassifiedFeature]:
    """Generate implicit features from floor position."""
    results: list[ClassifiedFeature] = []

    if floor is None:
        return results

    # First floor penalty
    if floor == 1:
        results.append(
            ClassifiedFeature(
                name="First floor",
                impact="negative",
                category="building",
                weight=0.08,
                description="First/ground floor reduces value 5-10% (noise, security, privacy)",
            )
        )

    # Last floor — negative for old buildings, neutral/positive for new
    if total_floors is not None and floor == total_floors:
        is_old = condition in ("needs_renovation", "good", None) or condition == "unknown"
        if is_old:
            results.append(
                ClassifiedFeature(
                    name="Last floor (old building)",
                    impact="negative",
                    category="building",
                    weight=0.04,
                    description="Top floor in older building: -3-5% (roof leaks, heat in summer)",
                )
            )
        else:
            results.append(
                ClassifiedFeature(
                    name="Top floor (new building)",
                    impact="positive",
                    category="building",
                    weight=0.05,
                    description="Top floor in new building: +5-8% with view, no upstairs noise",
                )
            )

    # High floor without elevator — handled if no elevator keyword is found
    # (see _check_missing_elevator below)

    return results


def _check_missing_elevator(
    features: list[str],
    floor: int | None,
) -> ClassifiedFeature | None:
    """If floor > 4 and no elevator keyword found, add a negative feature."""
    if floor is None or floor <= 4:
        return None

    elevator_re = re.compile(r"(ascensor|lift|elevator)", re.IGNORECASE)
    has_elevator = any(elevator_re.search(f) for f in features)
    if not has_elevator:
        return ClassifiedFeature(
            name="No elevator (high floor)",
            impact="negative",
            category="building",
            weight=0.07,
            description="No elevator above floor 4 reduces value 5-8%",
        )
    return None


def classify_features(
    features: list[str],
    condition: str | None = None,
    floor: int | None = None,
    total_floors: int | None = None,
) -> list[ClassifiedFeature]:
    """Classify apartment features by their impact on property value.

    Args:
        features: Raw feature strings from ListingExtraction.features.
        condition: Listing condition (new, renovated, good, needs_renovation, unknown).
        floor: Apartment floor number.
        total_floors: Total floors in the building.

    Returns:
        List of ClassifiedFeature objects sorted by absolute weight descending.
    """
    classified: list[ClassifiedFeature] = []
    matched_features: set[int] = set()  # indices of features already matched

    for idx, feature in enumerate(features):
        feature_matched = False

        # Check positive rules
        for pattern, impact, category, weight, description in _POSITIVE_RULES:
            if pattern.search(feature):
                # Contextual adjustment: elevator only valuable on high floors
                if "ascensor" in feature.lower() or "lift" in feature.lower() or "elevator" in feature.lower():
                    if floor is not None and floor <= 4:
                        # Elevator exists but not critical on low floors — still slightly positive
                        weight = 0.01
                        description = "Elevator present but less critical on lower floors"

                classified.append(
                    ClassifiedFeature(
                        name=feature,
                        impact=impact,
                        category=category,
                        weight=weight,
                        description=description,
                    )
                )
                feature_matched = True
                matched_features.add(idx)
                break  # first matching rule wins

        if feature_matched:
            continue

        # Check negative rules
        for pattern, impact, category, weight, description in _NEGATIVE_RULES:
            if pattern.search(feature):
                classified.append(
                    ClassifiedFeature(
                        name=feature,
                        impact=impact,
                        category=category,
                        weight=weight,
                        description=description,
                    )
                )
                feature_matched = True
                matched_features.add(idx)
                break

        if feature_matched:
            continue

        # No rule matched — neutral
        classified.append(
            ClassifiedFeature(
                name=feature,
                impact="neutral",
                category="amenity",
                weight=0.0,
                description="No significant impact on value identified",
            )
        )

    # Add implicit floor-based features
    classified.extend(_check_floor_features(floor, total_floors, condition))

    # Check for missing elevator on high floors
    missing_elevator = _check_missing_elevator(features, floor)
    if missing_elevator is not None:
        classified.append(missing_elevator)

    # Sort by absolute weight descending so highest-impact features come first
    classified.sort(key=lambda f: abs(f.weight), reverse=True)

    return classified


def summarize_features(classified: list[ClassifiedFeature]) -> dict:
    """Summarize classified features into an aggregate adjustment overview.

    Returns:
        Dictionary with:
            net_adjustment_pct: net % adjustment (positive features minus negative)
            positive_count: number of positive features
            negative_count: number of negative features
            top_positive: name of highest-weight positive feature (or "none")
            top_negative: name of highest-weight negative feature (or "none")
    """
    positives = [f for f in classified if f.impact == "positive"]
    negatives = [f for f in classified if f.impact == "negative"]

    positive_sum = sum(f.weight for f in positives)
    negative_sum = sum(f.weight for f in negatives)
    net = round(positive_sum - negative_sum, 4)

    top_positive = max(positives, key=lambda f: f.weight).name if positives else "none"
    top_negative = max(negatives, key=lambda f: f.weight).name if negatives else "none"

    return {
        "net_adjustment_pct": net,
        "positive_count": len(positives),
        "negative_count": len(negatives),
        "top_positive": top_positive,
        "top_negative": top_negative,
    }
