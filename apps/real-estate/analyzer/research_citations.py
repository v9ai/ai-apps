"""Maps valuation methods and features to relevant research papers from the content/ directory."""

from pydantic import BaseModel


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class ResearchCitation(BaseModel):
    slug: str
    title: str
    relevance: str
    url: str  # e.g. /agent-11-avm-gradient-boosting


class AnalysisCitations(BaseModel):
    method_citations: list[ResearchCitation]   # papers backing the methods used
    feature_citations: list[ResearchCitation]   # papers backing feature analysis
    market_citations: list[ResearchCitation]    # papers backing market context


# ---------------------------------------------------------------------------
# Static mapping: valuation concept -> relevant papers
# ---------------------------------------------------------------------------

RESEARCH_MAP: dict[str, list[dict[str, str]]] = {
    "hedonic_pricing": [
        {
            "slug": "agent-11-avm-gradient-boosting",
            "title": "AVM Gradient Boosting",
            "relevance": "Hedonic adjustment coefficients",
        },
        {
            "slug": "agent-13-explainable-avm",
            "title": "Explainable AVM",
            "relevance": "Feature importance in valuation",
        },
    ],
    "comparable_sales": [
        {
            "slug": "agent-14-comparable-sales-automation",
            "title": "Comparable Sales Automation",
            "relevance": "Automated comp selection",
        },
    ],
    "spatial_valuation": [
        {
            "slug": "agent-16-spatial-valuation-models",
            "title": "Spatial Valuation Models",
            "relevance": "Location-aware pricing",
        },
        {
            "slug": "agent-39-poi-neighborhood-embeddings",
            "title": "POI Neighborhood Embeddings",
            "relevance": "Neighborhood characterization",
        },
    ],
    "market_forecasting": [
        {
            "slug": "agent-18-lstm-gru-housing-forecasting",
            "title": "LSTM/GRU Housing Forecasting",
            "relevance": "Price trend prediction",
        },
        {
            "slug": "agent-21-bubble-detection-regime-switching",
            "title": "Bubble Detection",
            "relevance": "Market regime analysis",
        },
    ],
    "rental_analysis": [
        {
            "slug": "agent-22-rental-market-forecasting",
            "title": "Rental Market Forecasting",
            "relevance": "Rental yield estimation",
        },
    ],
    "listing_extraction": [
        {
            "slug": "agent-32-listing-information-extraction",
            "title": "Listing Information Extraction",
            "relevance": "Structured data extraction from listings",
        },
        {
            "slug": "agent-37-multilingual-property-search",
            "title": "Multilingual Property Search",
            "relevance": "Cross-language listing processing",
        },
    ],
    "deceptive_detection": [
        {
            "slug": "agent-33-deceptive-listing-detection",
            "title": "Deceptive Listing Detection",
            "relevance": "Quality and fraud signals",
        },
    ],
    "walkability": [
        {
            "slug": "agent-40-walkability-transit-scoring",
            "title": "Walkability & Transit Scoring",
            "relevance": "Location amenity valuation",
        },
    ],
    "investment_analysis": [
        {
            "slug": "agent-49-real-estate-risk-modeling",
            "title": "Real Estate Risk Modeling",
            "relevance": "Investment risk assessment",
        },
        {
            "slug": "agent-86-investment-risk-synthesis",
            "title": "Investment Risk Synthesis",
            "relevance": "Comprehensive risk framework",
        },
    ],
    "cross_market": [
        {
            "slug": "agent-96-cross-market-comparison",
            "title": "Cross-Market Comparison",
            "relevance": "Moldova/Romania market context",
        },
    ],
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_citation(entry: dict[str, str]) -> ResearchCitation:
    """Convert a raw RESEARCH_MAP entry into a ResearchCitation with a URL."""
    return ResearchCitation(
        slug=entry["slug"],
        title=entry["title"],
        relevance=entry["relevance"],
        url=f"/{entry['slug']}",
    )


def _collect(concepts: list[str]) -> list[ResearchCitation]:
    """Gather unique citations for a list of concept keys, preserving order."""
    seen: set[str] = set()
    result: list[ResearchCitation] = []
    for concept in concepts:
        for entry in RESEARCH_MAP.get(concept, []):
            if entry["slug"] not in seen:
                seen.add(entry["slug"])
                result.append(_make_citation(entry))
    return result


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def get_citations_for_analysis(
    extraction: dict,
    valuation: dict,
) -> AnalysisCitations:
    """Return research citations relevant to a given analysis result.

    Args:
        extraction: dict representation of a ListingExtraction.
        valuation: dict representation of a ValuationResult.

    Returns:
        AnalysisCitations with method, feature, and market citation lists.
    """

    # -- Method citations (always include hedonic_pricing + listing_extraction) --
    method_concepts: list[str] = ["hedonic_pricing", "listing_extraction"]

    # -- Feature citations (conditional on extraction / valuation fields) --
    feature_concepts: list[str] = []

    # Spatial / zone data present
    if extraction.get("zone"):
        feature_concepts.append("spatial_valuation")

    # Walkability / POI relevance when features mention location amenities
    features_lower = [f.lower() for f in extraction.get("features", [])]
    has_location_features = any(
        kw in feat
        for feat in features_lower
        for kw in ("park", "metro", "transport", "bus", "school", "market")
    )
    if has_location_features:
        feature_concepts.append("walkability")

    # Deceptive detection when condition is unknown or risk factors mention quality
    if extraction.get("condition") == "unknown" or any(
        "quality" in rf.lower() or "fraud" in rf.lower()
        for rf in valuation.get("risk_factors", [])
    ):
        feature_concepts.append("deceptive_detection")

    # -- Market citations (conditional) --
    market_concepts: list[str] = []

    # Comparables were used (comparables list lives on AnalysisResponse, but
    # valuation reasoning / key_factors may reference them; the caller can also
    # pass comparables via valuation dict for flexibility).
    has_comparables = bool(valuation.get("comparables")) or any(
        "comp" in kf.lower() for kf in valuation.get("key_factors", [])
    )
    if has_comparables:
        method_concepts.append("comparable_sales")

    # Rental yield computed
    if valuation.get("rental_yield_pct") is not None or valuation.get("rental_estimate_eur") is not None:
        feature_concepts.append("rental_analysis")

    # Investment score present
    if valuation.get("investment_score") is not None:
        market_concepts.append("investment_analysis")

    # Price trend / market forecasting
    if valuation.get("price_trend") is not None or valuation.get("appreciation_pct_1y") is not None:
        market_concepts.append("market_forecasting")

    # Cross-market context (Moldova/Romania)
    city = extraction.get("city", "").lower()
    if valuation.get("market_context") or city in ("chisinau", "chișinău", "bucuresti", "bucurești", "bucharest", "iasi", "iași", "cluj"):
        market_concepts.append("cross_market")

    return AnalysisCitations(
        method_citations=_collect(method_concepts),
        feature_citations=_collect(feature_concepts),
        market_citations=_collect(market_concepts),
    )
