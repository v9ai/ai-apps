from pydantic import BaseModel
from fastapi import APIRouter


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class RenovationItem(BaseModel):
    category: str  # flooring, walls, kitchen, bathroom, electrical, plumbing, windows, doors, other
    description: str
    cost_eur: int
    priority: str  # essential, recommended, optional


class RenovationScope(BaseModel):
    scope: str  # cosmetic, standard, full
    items: list[RenovationItem]
    total_cost_eur: int
    cost_per_m2: float
    duration_weeks: int


class RenovationROI(BaseModel):
    renovation_cost: int
    pre_renovation_value: int
    post_renovation_value: int
    uplift_pct: float
    roi_pct: float  # (post_value - pre_value - cost) / cost * 100
    payback_months: int


# ---------------------------------------------------------------------------
# Cost tables per market (EUR/m2 ranges)
# Each item tuple: (category, description, share_of_total)
# ---------------------------------------------------------------------------

COST_TABLES: dict[str, dict[str, dict]] = {
    "chisinau": {
        "cosmetic": {
            "min": 80,
            "max": 120,
            "duration_weeks": 3,
            "items": [
                ("walls", "Painting and wallpaper", 0.25),
                ("flooring", "Laminate/vinyl flooring", 0.30),
                ("doors", "Interior doors replacement", 0.15),
                ("electrical", "Light fixtures and switches", 0.10),
                ("other", "Cleaning and minor fixes", 0.20),
            ],
        },
        "standard": {
            "min": 150,
            "max": 250,
            "duration_weeks": 8,
            "items": [
                ("walls", "Full wall treatment (plaster, paint)", 0.15),
                ("flooring", "Engineered hardwood/quality laminate", 0.18),
                ("kitchen", "Kitchen renovation (cabinets, countertops, appliances)", 0.22),
                ("bathroom", "Bathroom renovation (tiles, fixtures, plumbing)", 0.18),
                ("electrical", "Rewiring and new fixtures", 0.10),
                ("plumbing", "Pipe replacement and fixtures", 0.07),
                ("doors", "Interior and entrance doors", 0.05),
                ("windows", "Window replacement if needed", 0.05),
            ],
        },
        "full": {
            "min": 300,
            "max": 450,
            "duration_weeks": 16,
            "items": [
                ("walls", "Complete wall demolition/rebuild, insulation, plaster, paint", 0.12),
                ("flooring", "Premium flooring with underfloor heating", 0.15),
                ("kitchen", "Full designer kitchen with appliances", 0.18),
                ("bathroom", "Complete bathroom rebuild (2 bathrooms)", 0.15),
                ("electrical", "Full rewiring, smart home prep", 0.10),
                ("plumbing", "Complete pipe replacement, radiators", 0.10),
                ("windows", "Triple-glazed windows", 0.08),
                ("doors", "Premium interior and security entrance door", 0.05),
                ("other", "Balcony, storage, misc structural", 0.07),
            ],
        },
    },
    "bucharest": {
        "cosmetic": {
            "min": 100,
            "max": 150,
            "duration_weeks": 3,
            "items": [
                ("walls", "Painting and decorative finishes", 0.25),
                ("flooring", "Laminate or vinyl plank flooring", 0.28),
                ("doors", "Interior doors and hardware", 0.17),
                ("electrical", "Light fixtures, switches, outlets", 0.10),
                ("other", "Cleaning, touch-ups, minor repairs", 0.20),
            ],
        },
        "standard": {
            "min": 200,
            "max": 350,
            "duration_weeks": 10,
            "items": [
                ("walls", "Full wall treatment (leveling, plaster, paint)", 0.14),
                ("flooring", "Engineered hardwood or premium laminate", 0.17),
                ("kitchen", "Kitchen renovation (cabinets, countertops, appliances)", 0.22),
                ("bathroom", "Bathroom renovation (tiles, sanitary ware, fixtures)", 0.19),
                ("electrical", "Full rewiring with modern panel", 0.10),
                ("plumbing", "Pipe replacement and new fixtures", 0.08),
                ("doors", "Interior and armored entrance door", 0.05),
                ("windows", "Double-glazed PVC window replacement", 0.05),
            ],
        },
        "full": {
            "min": 400,
            "max": 600,
            "duration_weeks": 20,
            "items": [
                ("walls", "Demolition, rebuild, insulation, premium finishes", 0.12),
                ("flooring", "Premium hardwood with underfloor heating", 0.14),
                ("kitchen", "Designer kitchen with premium appliances", 0.18),
                ("bathroom", "Complete rebuild of 2 bathrooms, premium fixtures", 0.15),
                ("electrical", "Full rewiring, smart home infrastructure", 0.10),
                ("plumbing", "Complete pipe replacement, central heating upgrade", 0.10),
                ("windows", "Triple-glazed windows with thermal break", 0.08),
                ("doors", "Premium interior doors and security entrance", 0.05),
                ("other", "Balcony enclosure, storage, structural reinforcement", 0.08),
            ],
        },
    },
    "london": {
        "cosmetic": {
            "min": 300,
            "max": 500,
            "duration_weeks": 4,
            "items": [
                ("walls", "Painting and decorating throughout", 0.28),
                ("flooring", "Engineered wood or luxury vinyl tile", 0.27),
                ("doors", "Interior door replacement and hardware", 0.15),
                ("electrical", "Light fixtures, switches, socket fronts", 0.10),
                ("other", "Deep clean, sealant, minor touch-ups", 0.20),
            ],
        },
        "standard": {
            "min": 600,
            "max": 1000,
            "duration_weeks": 12,
            "items": [
                ("walls", "Replastering, skimming, premium paint", 0.13),
                ("flooring", "Hardwood or premium LVT throughout", 0.16),
                ("kitchen", "New kitchen (units, worktops, integrated appliances)", 0.23),
                ("bathroom", "Bathroom refit (tiling, suite, fixtures)", 0.18),
                ("electrical", "Rewire to Part P standards", 0.11),
                ("plumbing", "Pipework and boiler replacement", 0.09),
                ("doors", "Internal fire doors and front door upgrade", 0.05),
                ("windows", "Double-glazed sash or casement replacement", 0.05),
            ],
        },
        "full": {
            "min": 1200,
            "max": 2000,
            "duration_weeks": 24,
            "items": [
                ("walls", "Strip back, insulate, replaster, premium decoration", 0.11),
                ("flooring", "Solid hardwood with underfloor heating", 0.13),
                ("kitchen", "Bespoke kitchen with premium appliances", 0.19),
                ("bathroom", "Two bathrooms, full refit, underfloor heating", 0.15),
                ("electrical", "Complete rewire, consumer unit, smart home", 0.10),
                ("plumbing", "Full replumb, new boiler/heat pump, radiators", 0.11),
                ("windows", "Heritage-style double/triple glazing throughout", 0.08),
                ("doors", "Solid core internal, composite front door", 0.05),
                ("other", "Loft conversion prep, structural, garden/patio", 0.08),
            ],
        },
    },
}

# Value uplift ranges per scope
_UPLIFT: dict[str, tuple[float, float]] = {
    "cosmetic": (0.08, 0.14),
    "standard": (0.15, 0.25),
    "full": (0.25, 0.40),
}

# Condition -> default scope mapping
_CONDITION_SCOPE: dict[str, str] = {
    "needs_renovation": "full",
    "good": "cosmetic",
    "renovated": "cosmetic",
    "new": "cosmetic",
    "unknown": "standard",
}


# ---------------------------------------------------------------------------
# Core logic
# ---------------------------------------------------------------------------

def estimate_renovation(
    size_m2: float,
    condition: str,
    city: str,
    scope: str | None = None,
) -> RenovationScope:
    """Estimate renovation costs based on property size, condition, and market."""
    market_key = _normalize_city(city)
    market = COST_TABLES.get(market_key, COST_TABLES["chisinau"])

    if scope is None:
        scope = _CONDITION_SCOPE.get(condition, "standard")

    scope_data = market.get(scope, market["standard"])
    avg_cost_per_m2 = (scope_data["min"] + scope_data["max"]) / 2
    total_cost = round(avg_cost_per_m2 * size_m2)

    items: list[RenovationItem] = []
    for i, (category, description, share) in enumerate(scope_data["items"]):
        item_cost = round(total_cost * share)
        priority = "essential" if i < 3 else ("recommended" if i < 6 else "optional")
        items.append(RenovationItem(
            category=category,
            description=description,
            cost_eur=item_cost,
            priority=priority,
        ))

    return RenovationScope(
        scope=scope,
        items=items,
        total_cost_eur=total_cost,
        cost_per_m2=round(avg_cost_per_m2, 1),
        duration_weeks=scope_data["duration_weeks"],
    )


def compute_renovation_roi(
    size_m2: float,
    current_price_per_m2: float,
    renovation: RenovationScope,
    city: str,
) -> RenovationROI:
    """Calculate ROI from renovation investment."""
    pre_value = round(size_m2 * current_price_per_m2)

    uplift_min, uplift_max = _UPLIFT.get(renovation.scope, (0.10, 0.20))
    avg_uplift = (uplift_min + uplift_max) / 2
    post_value = round(pre_value * (1 + avg_uplift))

    cost = renovation.total_cost_eur
    profit = post_value - pre_value - cost
    roi_pct = round((profit / cost) * 100, 1) if cost > 0 else 0.0

    # Payback: estimate monthly rent increase from renovation
    # Rough heuristic: renovation adds ~1-2% of cost as monthly rent increase
    monthly_rent_increase = cost * 0.015
    payback_months = round(cost / monthly_rent_increase) if monthly_rent_increase > 0 else 0

    return RenovationROI(
        renovation_cost=cost,
        pre_renovation_value=pre_value,
        post_renovation_value=post_value,
        uplift_pct=round(avg_uplift * 100, 1),
        roi_pct=roi_pct,
        payback_months=payback_months,
    )


def _normalize_city(city: str) -> str:
    """Map city name to cost table key."""
    city_lower = city.lower().strip()
    if city_lower in ("chisinau", "chișinău", "kishinev"):
        return "chisinau"
    if city_lower in ("bucharest", "bucurești", "bucuresti"):
        return "bucharest"
    if city_lower in ("london",):
        return "london"
    return "chisinau"


# ---------------------------------------------------------------------------
# Request / Response models for API
# ---------------------------------------------------------------------------

class EstimateRequest(BaseModel):
    size_m2: float
    condition: str = "unknown"
    city: str = "chisinau"
    scope: str | None = None


class ROIRequest(BaseModel):
    size_m2: float
    current_price_per_m2: float
    city: str = "chisinau"
    scope: str | None = None
    condition: str = "unknown"


class ROIResponse(BaseModel):
    renovation: RenovationScope
    roi: RenovationROI


# ---------------------------------------------------------------------------
# FastAPI router
# ---------------------------------------------------------------------------

renovation_router = APIRouter(tags=["renovation"])


@renovation_router.post("/renovation/estimate", response_model=RenovationScope)
async def estimate_renovation_endpoint(req: EstimateRequest):
    return estimate_renovation(
        size_m2=req.size_m2,
        condition=req.condition,
        city=req.city,
        scope=req.scope,
    )


@renovation_router.post("/renovation/roi", response_model=ROIResponse)
async def renovation_roi_endpoint(req: ROIRequest):
    renovation = estimate_renovation(
        size_m2=req.size_m2,
        condition=req.condition,
        city=req.city,
        scope=req.scope,
    )
    roi = compute_renovation_roi(
        size_m2=req.size_m2,
        current_price_per_m2=req.current_price_per_m2,
        renovation=renovation,
        city=req.city,
    )
    return ROIResponse(renovation=renovation, roi=roi)
