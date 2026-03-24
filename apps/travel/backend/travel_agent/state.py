"""State definition for the Katowice travel guide pipeline."""

from typing import Optional, TypedDict


class Place(TypedDict):
    name: str
    description: str
    category: str  # culture, nature, food, nightlife, architecture, etc.
    address: str
    lat: float
    lng: float
    rating: float  # 1-5
    visit_duration: str  # e.g. "1-2 hours"
    tips: str
    image_query: str  # search term for finding images
    price_level: str  # budget, moderate, premium
    price_display: str  # €, €€, €€€


class TravelState(TypedDict, total=False):
    city: str
    num_places: int
    # Populated by research_city
    city_overview: Optional[str]
    # Populated by discover_places
    places: Optional[list[Place]]
    # Populated by enrich_with_maps
    places_with_maps: Optional[list[dict]]
    # Populated by rank_places
    rankings: Optional[dict]  # {"best": [...], "cheapest": [...]}
    # Populated by translate_to_romanian
    city_overview_ro: Optional[str]
    places_translated: Optional[list[dict]]
    # Populated by generate_booking
    places_with_booking: Optional[list[dict]]
    booking_summary: Optional[dict]
    # Populated by generate_seo
    seo_metadata: Optional[dict]
    # Error handling
    error: Optional[str]
