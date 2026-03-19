"""Neighborhood scoring using OpenStreetMap Overpass API for POI data."""

import asyncio
import logging
import math
import httpx
from pydantic import BaseModel

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------

class POICategory(BaseModel):
    category: str  # "education", "transport", "shopping", "health", "leisure", "food"
    count: int
    nearest_distance_m: float | None
    examples: list[str]  # first 3 POI names


class NeighborhoodScore(BaseModel):
    overall_score: float  # 0-10
    walkability: float  # 0-10
    transit_access: float  # 0-10
    amenities: float  # 0-10
    education: float  # 0-10
    green_spaces: float  # 0-10
    categories: list[POICategory]
    summary: str  # one-line human readable


class EnvironmentalHazard(BaseModel):
    name: str
    hazard_type: str  # "airport", "railway", "industrial", "highway", "landfill", "power_plant", "wastewater"
    distance_m: float
    impact: str  # "high", "moderate", "low"


class EnvironmentalContext(BaseModel):
    hazards: list[EnvironmentalHazard]
    noise_level: str  # "high", "moderate", "low"
    air_quality_risk: str  # "high", "moderate", "low"
    adjustment_pct: float  # suggested negative hedonic adjustment, e.g. -0.08
    summary: str  # human-readable summary for the valuator


# ---------------------------------------------------------------------------
# Rate-limiting helpers
# ---------------------------------------------------------------------------

_nominatim_lock = asyncio.Lock()
_nominatim_last: float = 0.0

_overpass_lock = asyncio.Lock()
_overpass_last: float = 0.0

_USER_AGENT = "RealEstateAnalyzer/1.0 (neighborhood-scoring; contact: dev@example.com)"
_TIMEOUT = httpx.Timeout(30.0)


async def _rate_limit(lock: asyncio.Lock, last_attr: str, min_interval: float) -> None:
    """Enforce minimum interval between requests behind a shared lock."""
    global _nominatim_last, _overpass_last
    async with lock:
        now = asyncio.get_event_loop().time()
        last = _nominatim_last if last_attr == "nominatim" else _overpass_last
        wait = min_interval - (now - last)
        if wait > 0:
            await asyncio.sleep(wait)
        if last_attr == "nominatim":
            _nominatim_last = asyncio.get_event_loop().time()
        else:
            _overpass_last = asyncio.get_event_loop().time()


# ---------------------------------------------------------------------------
# Geocoding (Nominatim)
# ---------------------------------------------------------------------------

async def geocode_address(city: str, zone: str) -> tuple[float, float] | None:
    """Use Nominatim free geocoding to get (lat, lon) from city + zone.

    Returns None when the location cannot be resolved.
    """
    await _rate_limit(_nominatim_lock, "nominatim", 1.0)

    query = f"{zone}, {city}"
    url = "https://nominatim.openstreetmap.org/search"
    params = {
        "q": query,
        "format": "json",
        "limit": 1,
        "addressdetails": 0,
    }

    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        resp = await client.get(url, params=params, headers={"User-Agent": _USER_AGENT})
        resp.raise_for_status()
        data = resp.json()

    if not data:
        # Fallback: try city alone if zone lookup fails
        await _rate_limit(_nominatim_lock, "nominatim", 1.0)
        params["q"] = city
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            resp = await client.get(url, params=params, headers={"User-Agent": _USER_AGENT})
            resp.raise_for_status()
            data = resp.json()

    if not data:
        return None

    return float(data[0]["lat"]), float(data[0]["lon"])


# ---------------------------------------------------------------------------
# Overpass POI fetch
# ---------------------------------------------------------------------------

# Mapping from Overpass tags to our scoring categories
_TAG_TO_CATEGORY: dict[str, str] = {
    # education
    "amenity=school": "education",
    "amenity=kindergarten": "education",
    "amenity=university": "education",
    "amenity=college": "education",
    # transport
    "highway=bus_stop": "transport",
    "public_transport=stop_position": "transport",
    "railway=tram_stop": "transport",
    "railway=station": "transport",
    "station=subway": "transport",
    "amenity=bus_station": "transport",
    # shopping
    "shop=supermarket": "shopping",
    "shop=mall": "shopping",
    "shop=convenience": "shopping",
    "shop=clothes": "shopping",
    "shop=department_store": "shopping",
    # health
    "amenity=pharmacy": "health",
    "amenity=hospital": "health",
    "amenity=clinic": "health",
    "amenity=doctors": "health",
    "amenity=dentist": "health",
    # leisure / green spaces
    "leisure=park": "leisure",
    "leisure=playground": "leisure",
    "leisure=sports_centre": "leisure",
    "leisure=fitness_centre": "leisure",
    "leisure=garden": "leisure",
    # food
    "amenity=restaurant": "food",
    "amenity=cafe": "food",
    "amenity=fast_food": "food",
    "amenity=bar": "food",
}


def _build_overpass_query(lat: float, lon: float, radius_m: int) -> str:
    """Build a single Overpass QL query fetching all POI types we care about."""
    lines = [f"[out:json][timeout:25];("]

    # Collect unique key=value pairs
    seen: set[str] = set()
    for tag_expr in _TAG_TO_CATEGORY:
        if tag_expr in seen:
            continue
        seen.add(tag_expr)
        key, value = tag_expr.split("=", 1)
        lines.append(
            f'  node["{key}"="{value}"](around:{radius_m},{lat},{lon});'
        )
        # Also query ways for things like parks and schools (they are often mapped as areas)
        if key in ("leisure", "amenity") and value in (
            "park", "school", "university", "hospital", "kindergarten",
            "playground", "sports_centre", "college",
        ):
            lines.append(
                f'  way["{key}"="{value}"](around:{radius_m},{lat},{lon});'
            )

    lines.append(");out center;")
    return "\n".join(lines)


def _haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Distance in metres between two points on Earth."""
    R = 6_371_000  # Earth radius in metres
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _classify_element(tags: dict[str, str]) -> str | None:
    """Return our category for an OSM element based on its tags."""
    for tag_expr, category in _TAG_TO_CATEGORY.items():
        key, value = tag_expr.split("=", 1)
        if tags.get(key) == value:
            return category
    return None


async def fetch_pois(lat: float, lon: float, radius_m: int = 1000) -> list[dict]:
    """Query Overpass API for nearby POIs.

    Returns a list of dicts with keys: name, category, lat, lon, distance_m.
    """
    await _rate_limit(_overpass_lock, "overpass", 1.0)

    query = _build_overpass_query(lat, lon, radius_m)
    url = "https://overpass-api.de/api/interpreter"

    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        resp = await client.post(
            url,
            data={"data": query},
            headers={"User-Agent": _USER_AGENT},
        )
        resp.raise_for_status()
        data = resp.json()

    results: list[dict] = []
    seen_ids: set[int] = set()

    for element in data.get("elements", []):
        eid = element.get("id")
        if eid in seen_ids:
            continue
        seen_ids.add(eid)

        tags = element.get("tags", {})
        category = _classify_element(tags)
        if category is None:
            continue

        # For ways, use the center coordinates
        elat = element.get("lat") or (element.get("center", {}) or {}).get("lat")
        elon = element.get("lon") or (element.get("center", {}) or {}).get("lon")
        if elat is None or elon is None:
            continue

        name = tags.get("name", tags.get("operator", category))
        distance = _haversine(lat, lon, elat, elon)

        results.append({
            "name": name,
            "category": category,
            "lat": elat,
            "lon": elon,
            "distance_m": round(distance, 1),
        })

    return results


# ---------------------------------------------------------------------------
# Scoring
# ---------------------------------------------------------------------------

_CATEGORY_WEIGHTS: dict[str, float] = {
    "transport": 0.25,
    "shopping": 0.20,
    "education": 0.20,
    "leisure": 0.15,
    "food": 0.10,
    "health": 0.10,
}


def _count_to_base_score(count: int) -> float:
    """Map POI count to a base score 0-10."""
    if count == 0:
        return 0.0
    if count == 1:
        return 3.0
    if count <= 3:
        return 5.0
    if count <= 6:
        return 7.0
    return 9.0


def _distance_adjustment(nearest_m: float | None) -> float:
    """Adjust score based on nearest POI distance. Returns a multiplier 0.5-1.0."""
    if nearest_m is None:
        return 0.7  # no distance info, moderate penalty
    if nearest_m <= 200:
        return 1.0
    if nearest_m <= 500:
        return 0.9
    if nearest_m <= 800:
        return 0.8
    if nearest_m <= 1200:
        return 0.7
    return 0.5


def _build_categories(pois: list[dict]) -> list[POICategory]:
    """Group POIs by category and build POICategory list."""
    grouped: dict[str, list[dict]] = {}
    for poi in pois:
        cat = poi["category"]
        grouped.setdefault(cat, []).append(poi)

    categories: list[POICategory] = []
    for cat_name in _CATEGORY_WEIGHTS:
        items = grouped.get(cat_name, [])
        items_sorted = sorted(items, key=lambda p: p["distance_m"])
        nearest = items_sorted[0]["distance_m"] if items_sorted else None
        examples = []
        seen_names: set[str] = set()
        for item in items_sorted:
            n = item["name"]
            if n not in seen_names and n != cat_name:
                examples.append(n)
                seen_names.add(n)
            if len(examples) >= 3:
                break

        categories.append(POICategory(
            category=cat_name,
            count=len(items),
            nearest_distance_m=nearest,
            examples=examples,
        ))

    return categories


def _compute_scores(categories: list[POICategory]) -> dict[str, float]:
    """Compute individual dimension scores and weighted overall score."""
    cat_scores: dict[str, float] = {}
    for cat in categories:
        base = _count_to_base_score(cat.count)
        adj = _distance_adjustment(cat.nearest_distance_m)
        cat_scores[cat.category] = round(min(10.0, base * adj), 1)

    # Weighted overall
    overall = sum(
        cat_scores.get(cat, 0.0) * weight
        for cat, weight in _CATEGORY_WEIGHTS.items()
    )

    # Walkability: average of all categories with distance bonus
    all_scores = [s for s in cat_scores.values() if s > 0]
    walkability = round(sum(all_scores) / len(all_scores), 1) if all_scores else 0.0

    return {
        "overall_score": round(min(10.0, overall), 1),
        "walkability": walkability,
        "transit_access": cat_scores.get("transport", 0.0),
        "amenities": cat_scores.get("shopping", 0.0),
        "education": cat_scores.get("education", 0.0),
        "green_spaces": cat_scores.get("leisure", 0.0),
    }


def _generate_summary(scores: dict[str, float], categories: list[POICategory]) -> str:
    """Generate a one-line human-readable summary."""
    overall = scores["overall_score"]

    if overall >= 8:
        quality = "Excellent"
    elif overall >= 6:
        quality = "Good"
    elif overall >= 4:
        quality = "Moderate"
    elif overall >= 2:
        quality = "Below average"
    else:
        quality = "Poor"

    # Find best and worst dimensions
    dims = {
        "transit": scores["transit_access"],
        "shopping": scores["amenities"],
        "education": scores["education"],
        "green spaces": scores["green_spaces"],
    }
    best = max(dims, key=dims.get)
    worst = min(dims, key=dims.get)

    total_pois = sum(c.count for c in categories)

    return (
        f"{quality} neighborhood ({overall}/10) with {total_pois} POIs nearby. "
        f"Strongest: {best} ({dims[best]}/10). "
        f"Weakest: {worst} ({dims[worst]}/10)."
    )


# ---------------------------------------------------------------------------
# Environmental hazard detection (dynamic, OSM-based)
# ---------------------------------------------------------------------------

# Tags that map to environmental disamenities.
# Searched at wider radii than amenity POIs because noise/pollution
# impact extends further (e.g. airport noise zones reach 3-5 km).
_HAZARD_TAG_TO_TYPE: dict[str, str] = {
    "aeroway=aerodrome": "airport",
    "aeroway=runway": "airport",
    "landuse=industrial": "industrial",
    "railway=rail": "railway",
    "landuse=landfill": "landfill",
    "man_made=wastewater_plant": "wastewater",
    "power=plant": "power_plant",
    "highway=motorway": "highway",
    "highway=trunk": "highway",
}

# Impact thresholds: (type, high_m, moderate_m)
# Within high_m -> "high" impact; within moderate_m -> "moderate"; beyond -> "low"
_IMPACT_THRESHOLDS: dict[str, tuple[float, float]] = {
    "airport":       (1500, 4000),  # runway noise is significant up to 4km
    "railway":       (200,  600),
    "industrial":    (300,  1000),
    "highway":       (150,  500),
    "landfill":      (500,  2000),
    "wastewater":    (300,  1000),
    "power_plant":   (500,  2000),
}

# Hedonic adjustment per hazard type at "high" impact
_HAZARD_ADJUSTMENT: dict[str, float] = {
    "airport":      -0.08,  # -5 to -10%
    "railway":      -0.06,
    "industrial":   -0.07,
    "highway":      -0.05,
    "landfill":     -0.10,
    "wastewater":   -0.06,
    "power_plant":  -0.05,
}


def _build_hazard_query(lat: float, lon: float, radius_m: int) -> str:
    """Build an Overpass QL query for environmental disamenities."""
    lines = [f"[out:json][timeout:25];("]

    seen: set[str] = set()
    for tag_expr in _HAZARD_TAG_TO_TYPE:
        if tag_expr in seen:
            continue
        seen.add(tag_expr)
        key, value = tag_expr.split("=", 1)
        # Query nodes, ways, and relations (airports are often mapped as polygons)
        lines.append(f'  node["{key}"="{value}"](around:{radius_m},{lat},{lon});')
        lines.append(f'  way["{key}"="{value}"](around:{radius_m},{lat},{lon});')
        # Relations for large features like airports
        if key in ("aeroway", "landuse"):
            lines.append(f'  relation["{key}"="{value}"](around:{radius_m},{lat},{lon});')

    lines.append(");out center;")
    return "\n".join(lines)


def _classify_hazard_element(tags: dict[str, str]) -> str | None:
    """Return hazard type for an OSM element, or None."""
    for tag_expr, hazard_type in _HAZARD_TAG_TO_TYPE.items():
        key, value = tag_expr.split("=", 1)
        if tags.get(key) == value:
            return hazard_type
    return None


def _hazard_impact(hazard_type: str, distance_m: float) -> str:
    """Classify impact level based on distance thresholds."""
    high_m, moderate_m = _IMPACT_THRESHOLDS.get(hazard_type, (300, 1000))
    if distance_m <= high_m:
        return "high"
    if distance_m <= moderate_m:
        return "moderate"
    return "low"


async def fetch_hazards(lat: float, lon: float, radius_m: int = 4000) -> list[dict]:
    """Query Overpass API for nearby environmental disamenities.

    Uses a wider radius than amenity POIs (default 4km) because
    noise/pollution from airports and highways extends far.
    """
    await _rate_limit(_overpass_lock, "overpass", 1.0)

    query = _build_hazard_query(lat, lon, radius_m)
    url = "https://overpass-api.de/api/interpreter"

    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        resp = await client.post(
            url,
            data={"data": query},
            headers={"User-Agent": _USER_AGENT},
        )
        resp.raise_for_status()
        data = resp.json()

    results: list[dict] = []
    seen_ids: set[int] = set()

    for element in data.get("elements", []):
        eid = element.get("id")
        if eid in seen_ids:
            continue
        seen_ids.add(eid)

        tags = element.get("tags", {})
        hazard_type = _classify_hazard_element(tags)
        if hazard_type is None:
            continue

        elat = element.get("lat") or (element.get("center", {}) or {}).get("lat")
        elon = element.get("lon") or (element.get("center", {}) or {}).get("lon")
        if elat is None or elon is None:
            continue

        name = tags.get("name", tags.get("operator", hazard_type))
        distance = _haversine(lat, lon, elat, elon)

        results.append({
            "name": name,
            "hazard_type": hazard_type,
            "distance_m": round(distance, 1),
            "impact": _hazard_impact(hazard_type, distance),
        })

    # Deduplicate by type — keep the closest of each type
    by_type: dict[str, dict] = {}
    for h in results:
        t = h["hazard_type"]
        if t not in by_type or h["distance_m"] < by_type[t]["distance_m"]:
            by_type[t] = h

    return sorted(by_type.values(), key=lambda h: h["distance_m"])


def assess_environment(hazards: list[dict]) -> EnvironmentalContext:
    """Build an environmental context assessment from detected hazards.

    Produces a human-readable summary and a suggested hedonic adjustment
    that the valuator can use to refine fair value.
    """
    if not hazards:
        return EnvironmentalContext(
            hazards=[],
            noise_level="low",
            air_quality_risk="low",
            adjustment_pct=0.0,
            summary="No environmental disamenities detected within search radius.",
        )

    env_hazards = [EnvironmentalHazard(**h) for h in hazards]

    # Determine noise level from noise-producing hazards
    noise_types = {"airport", "railway", "highway"}
    noise_hazards = [h for h in env_hazards if h.hazard_type in noise_types]
    if any(h.impact == "high" for h in noise_hazards):
        noise_level = "high"
    elif any(h.impact == "moderate" for h in noise_hazards):
        noise_level = "moderate"
    else:
        noise_level = "low"

    # Air quality risk from pollution-producing hazards
    air_types = {"industrial", "landfill", "wastewater", "power_plant", "airport"}
    air_hazards = [h for h in env_hazards if h.hazard_type in air_types]
    if any(h.impact == "high" for h in air_hazards):
        air_quality_risk = "high"
    elif any(h.impact == "moderate" for h in air_hazards):
        air_quality_risk = "moderate"
    else:
        air_quality_risk = "low"

    # Compute aggregate hedonic adjustment (cap at -20%)
    total_adj = 0.0
    for h in env_hazards:
        base = _HAZARD_ADJUSTMENT.get(h.hazard_type, -0.03)
        if h.impact == "high":
            total_adj += base
        elif h.impact == "moderate":
            total_adj += base * 0.5
        # "low" impact = negligible adjustment
    total_adj = max(-0.20, total_adj)

    # Build summary
    lines = []
    for h in env_hazards:
        if h.impact in ("high", "moderate"):
            lines.append(f"- {h.name} ({h.hazard_type}): {h.distance_m:.0f}m away, {h.impact} impact")
    summary_detail = "\n".join(lines) if lines else "Minor environmental factors only."
    summary = (
        f"ENVIRONMENTAL CONTEXT (noise: {noise_level}, air quality risk: {air_quality_risk}, "
        f"suggested adjustment: {total_adj*100:+.1f}%):\n{summary_detail}"
    )

    return EnvironmentalContext(
        hazards=env_hazards,
        noise_level=noise_level,
        air_quality_risk=air_quality_risk,
        adjustment_pct=round(total_adj, 4),
        summary=summary,
    )


async def get_environmental_context(city: str, zone: str) -> EnvironmentalContext | None:
    """Geocode a location and assess its environmental context.

    Returns None if geocoding fails. Non-fatal — callers should
    catch exceptions and proceed without environmental data.
    """
    coords = await geocode_address(city, zone)
    if coords is None:
        return None

    lat, lon = coords
    hazards = await fetch_hazards(lat, lon, radius_m=4000)
    return assess_environment(hazards)


# ---------------------------------------------------------------------------
# Main orchestrator
# ---------------------------------------------------------------------------

async def score_neighborhood(city: str, zone: str) -> NeighborhoodScore | None:
    """Orchestrate geocoding, POI fetch, and scoring for a city + zone.

    Returns None if geocoding fails.
    """
    coords = await geocode_address(city, zone)
    if coords is None:
        return None

    lat, lon = coords
    pois = await fetch_pois(lat, lon, radius_m=1000)
    categories = _build_categories(pois)
    scores = _compute_scores(categories)
    summary = _generate_summary(scores, categories)

    return NeighborhoodScore(
        overall_score=scores["overall_score"],
        walkability=scores["walkability"],
        transit_access=scores["transit_access"],
        amenities=scores["amenities"],
        education=scores["education"],
        green_spaces=scores["green_spaces"],
        categories=categories,
        summary=summary,
    )
