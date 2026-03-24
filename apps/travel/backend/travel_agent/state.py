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


class TravelState(TypedDict, total=False):
    city: str
    num_places: int
    # Populated by research_city
    city_overview: Optional[str]
    # Populated by discover_places
    places: Optional[list[Place]]
    # Populated by enrich_with_maps
    places_with_maps: Optional[list[dict]]
    # Error handling
    error: Optional[str]
