import asyncio
import json

from crewai import Agent as CrewAgent, Task, Crew, LLM
from pydantic import BaseModel, Field
from typing import Literal

from .config import settings

try:
    from deepeval.integrations.crewai import instrument_crewai
    instrument_crewai()
except Exception:
    pass


class LondonPredictionRequest(BaseModel):
    postcode: str = Field(description="Full or partial UK postcode, e.g. 'SW1A 1AA' or 'E14'")
    property_type: Literal["flat", "terraced", "semi_detached", "detached", "maisonette"] = "flat"
    bedrooms: int = Field(ge=0, le=10)
    bathrooms: int = Field(ge=1, le=5, default=1)
    size_sqft: float | None = Field(default=None, description="Internal area in sq ft")
    size_m2: float | None = Field(default=None, description="Internal area in m² (used if sqft not given)")
    floor: int | None = Field(default=None, description="Floor level for flats")
    total_floors: int | None = None
    tenure: Literal["freehold", "leasehold", "share_of_freehold"] | None = None
    condition: Literal["new_build", "refurbished", "good", "needs_work", "unknown"] = "unknown"
    has_garden: bool | None = None
    has_parking: bool | None = None
    has_balcony: bool | None = None
    year_built: int | None = None
    epc_rating: Literal["A", "B", "C", "D", "E", "F", "G"] | None = None


class ScoreBreakdown(BaseModel):
    location_score: float = Field(ge=0.0, le=10.0)
    size_score: float = Field(ge=0.0, le=10.0)
    condition_score: float = Field(ge=0.0, le=10.0)
    transport_score: float = Field(ge=0.0, le=10.0)


class LondonPrediction(BaseModel):
    """Structured prediction from the LLM."""
    estimated_price_gbp: int
    price_per_sqft: int
    price_per_m2: int
    confidence: float = Field(ge=0.0, le=1.0)
    price_low_gbp: int
    price_high_gbp: int
    borough: str
    zone_transport: str | None = None  # e.g. "Zone 2"

    # Rental
    rental_estimate_monthly_gbp: int
    rental_yield_gross_pct: float
    rental_yield_net_pct: float

    # Investment
    investment_score: float = Field(ge=0.0, le=10.0)
    score_breakdown: ScoreBreakdown
    recommendation: Literal["strong_buy", "buy", "hold", "avoid"]
    appreciation_pct_1y: float
    appreciation_pct_5y: float
    price_trend: Literal["rising", "stable", "declining"]

    # Market context
    borough_avg_price_per_m2: int
    borough_median_price: int
    reasoning: str
    key_factors: list[str] = Field(default_factory=list)
    opportunity_factors: list[str] = Field(default_factory=list)
    risk_factors: list[str] = Field(default_factory=list)
    market_context: str

    # Comparisons
    stamp_duty_gbp: int
    total_acquisition_cost_gbp: int
    price_to_rent_ratio: float
    breakeven_years: float


class LondonPredictionResponse(BaseModel):
    postcode: str
    property_type: str
    bedrooms: int
    size_sqft: float | None
    size_m2: float | None
    prediction: LondonPrediction


LONDON_PREDICTOR_BACKSTORY = """You are a senior London property valuation specialist with deep expertise in the UK residential market.
Given property features (postcode, type, bedrooms, size, condition), produce a structured price prediction.

LONDON MARKET REFERENCE PRICES (£/m², 2025-2026, Land Registry + ONS derived):

PRIME CENTRAL LONDON (Zone 1):
  Kensington & Chelsea: avg £21,797/m² (avg price £1,275K, yield 4.0-5.0%)
  Westminster: avg £19,749/m² (avg price £891K, yield 4.0-5.0%)
  Camden: avg £14,863/m² (avg price £896K, yield 4.5-5.5%)
  City of London: avg £13,500/m² (avg price £750K, yield 4.0-5.0%)

INNER LONDON PREMIUM (Zones 1-2):
  Hammersmith & Fulham: avg £12,153/m² (avg price £764K, yield 4.5-5.5%)
  Islington: avg £11,280/m² (avg price £634K, yield 4.5-5.5%)
  Wandsworth: avg £9,517/m² (avg price £600K, yield 4.5-5.5%)
  Haringey: avg £9,500/m² (avg price £550K, yield 5.5-6.5%)
  Southwark: avg £8,784/m² (avg price £550K, yield 5.0-5.5%)
  Hackney: avg £8,541/m² (avg price £634K, yield 5.0-5.5%)
  Lambeth: avg £8,440/m² (avg price £530K, yield 5.0-5.5%)
  Richmond upon Thames: avg £8,190/m² (avg price £650K, yield 4.0-4.5%)

INNER LONDON MID-RANGE (Zones 2-3):
  Brent: avg £7,927/m² (avg price £500K, yield 5.0-5.5%)
  Tower Hamlets: avg £7,914/m² (avg price £480K, yield 5.0-5.5%)
  Barnet: avg £7,673/m² (avg price £530K, yield 4.5-5.0%)
  Ealing: avg £7,412/m² (avg price £480K, yield 5.0-5.5%)
  Merton: avg £7,339/m² (avg price £500K, yield 4.5-5.0%)

OUTER LONDON (Zones 3-5):
  Hounslow: avg £6,596/m² (avg price £420K, yield 5.0-5.5%)
  Lewisham: avg £6,421/m² (avg price £430K, yield 5.0-5.5%)
  Harrow: avg £6,202/m² (avg price £450K, yield 5.0-5.5%)
  Greenwich: avg £6,171/m² (avg price £410K, yield 5.5-6.5%)
  Kingston upon Thames: avg £6,171/m² (avg price £470K, yield 4.5-5.0%)
  Waltham Forest: avg £5,973/m² (avg price £430K, yield 5.0-5.5%)
  Enfield: avg £5,946/m² (avg price £400K, yield 5.0-5.5%)

OUTER LONDON AFFORDABLE (Zones 4-6):
  Hillingdon: avg £5,449/m² (avg price £400K, yield 5.0-5.5%)
  Bromley: avg £5,291/m² (avg price £430K, yield 4.5-5.0%)
  Redbridge: avg £5,261/m² (avg price £400K, yield 5.0-5.5%)
  Croydon: avg £5,258/m² (avg price £380K, yield 5.5-6.5%)
  Newham: avg £5,118/m² (avg price £370K, yield 5.5-6.5%)
  Sutton: avg £4,964/m² (avg price £370K, yield 5.0-5.5%)
  Bexley: avg £4,587/m² (avg price £350K, yield 5.0-5.5%)
  Havering: avg £4,506/m² (avg price £370K, yield 5.0-5.5%)
  Barking & Dagenham: avg £3,916/m² (avg price £354K, yield 5.5-6.5%)

PROPERTY TYPE ADJUSTMENTS (vs flat £/m²):
  Flat: baseline (often highest £/m² due to new builds and prime area stock)
  Maisonette: -5 to +5% (similar to flat, depends on garden/separate entrance)
  Terraced house: -10 to -20% £/m² but higher total price (larger)
  Semi-detached: -15 to -25% £/m² but higher total price
  Detached: -20 to -30% £/m² but significantly higher total price

HEDONIC ADJUSTMENT FACTORS:
  Bedrooms: studio -10 to -15% | 1br baseline | 2br +5% | 3br +8% | 4br+ +10-15%
  Floor (flats): ground -5 to -10% | 1-3 baseline | 4-8 +3 to +5% | high-rise 10+ +5 to +10%
  Condition: new_build +15 to +25% | refurbished +5 to +10% | good baseline | needs_work -15 to -25%
  Tenure: freehold baseline | leasehold with 80+ years same | leasehold <80 years -10 to -30%
  Garden: +5 to +10% for houses, +3 to +5% for ground floor flats
  Parking: +£20K-50K in zones 1-2, +£10K-25K in zones 3-6
  Balcony: +2 to +5%
  EPC: A-B +3 to +5% | C baseline | D-E -3 to -5% | F-G -8 to -15%
  Period property (pre-1930): +5 to +10% in prime areas, neutral elsewhere
  New build premium: +10 to +20% over resale

TRANSPORT PROXIMITY PREMIUM (Nationwide 2025 research):
  Within 500m of station: +8% premium
  Within 750m: +5.6% | Within 1000m: +3.5%
  Elizabeth Line stations (Crossrail): additional +7 to +9% since 2022
    Woolwich: +7.9% YoY | Ealing Broadway: +9% YoY | Abbey Wood: +6-7% YoY
    Rental impact near Elizabeth Line: +28% (2022-2025)
  Zone 1-2: premium already captured in borough prices
  Overground/DLR only: -3 to -5% vs equivalent Tube area
  Bus only (no rail): -8 to -12% vs rail-connected area

RENTAL MARKET REFERENCE (£/month, 2025-2026):
  Kensington & Chelsea 1br: £2,200-3,000 | 2br: £3,000-4,500
  Westminster 1br: £2,000-2,800 | 2br: £2,800-4,000
  Islington/Camden 1br: £1,800-2,300 | 2br: £2,400-3,200
  Hackney/Tower Hamlets 1br: £1,600-2,000 | 2br: £2,200-2,800
  Wandsworth/Lambeth 1br: £1,500-1,900 | 2br: £2,000-2,600
  Greenwich/Lewisham 1br: £1,300-1,600 | 2br: £1,700-2,200
  Newham/Barking 1br: £1,200-1,500 | 2br: £1,500-1,900
  Croydon/Bromley 1br: £1,100-1,400 | 2br: £1,400-1,800
  Outer boroughs 1br: £1,000-1,300 | 2br: £1,300-1,700

RENTAL YIELD BY ZONE:
  Barking & Dagenham: 6.0-6.5% gross
  Newham: 5.8-6.2%
  Croydon: 5.5-6.0%
  Haringey (Tottenham): 5.5-6.5%
  Greenwich: 5.3-5.8%
  Tower Hamlets: 5.0-5.5%
  Lewisham: 5.0-5.5%
  Hackney: 4.5-5.0%
  Lambeth/Southwark: 4.5-5.0%
  Islington: 4.3-4.8%
  Wandsworth: 4.0-4.5%
  Westminster: 3.5-4.5%
  Kensington & Chelsea: 3.0-4.0%

NEW BUILD VS EXISTING STOCK:
  New builds: avg £10,400/m² vs existing stock £7,100/m² (47% premium London-wide)
  However, new_build condition adjustment should be +15 to +25% over local area average,
  not the London-wide premium (which includes location differences)

PRICE GROWTH OUTLOOK (2025-2026, Land Registry + Savills/JLL consensus):
  London overall: +2.3% (Jan 2025), forecast +3 to +5% for 2026
  Top performers 2024-25: Hackney +6.3%, Bexley +5.1%, Wandsworth +2.9%
  Elizabeth Line corridor (Woolwich, Abbey Wood, Custom House): +5 to +8%
  East London regeneration (Stratford, Barking Riverside): +4 to +7%
  Prime Central recovering from 2024-25 correction: +1 to +3%
  Outer suburban: +2 to +4%
  South London (Lewisham, Catford, Peckham gentrification): +3 to +6%

STAMP DUTY (SDLT) 2025-2026 rates:
  First-time buyers: 0% up to £425K, 5% on £425K-£625K (no relief above £625K)
  Moving home: 0% up to £250K, 5% on £250K-£925K, 10% on £925K-£1.5M, 12% above £1.5M
  Additional property: +5% surcharge on top of standard rates
  Non-UK resident: additional +2%
  Compute stamp_duty_gbp using MOVING HOME rates by default

ACQUISITION COSTS (add to stamp_duty for total_acquisition_cost_gbp):
  Solicitor/conveyancing: £1,500-3,000
  Survey: £500-1,500
  Mortgage arrangement fee: £0-2,000
  Use £3,000 as default estimate for additional costs on top of stamp duty

DERIVED METRICS:
  rental_yield_gross_pct = (rental_estimate_monthly_gbp * 12 / estimated_price_gbp) * 100
  rental_yield_net_pct = rental_yield_gross_pct * 0.70 (30% management, maintenance, voids, insurance)
  price_to_rent_ratio = estimated_price_gbp / (rental_estimate_monthly_gbp * 12)
  breakeven_years = total_acquisition_cost_gbp / (rental_estimate_monthly_gbp * 12 * 0.70)
  appreciation_pct_5y = compound annual growth * 5 (use zone outlook, multiply single-year by ~4.5 for 5yr cumulative)
  total_acquisition_cost_gbp = estimated_price_gbp + stamp_duty_gbp + 3000

SCORE BREAKDOWN:
  location_score: prime central 9-10 | inner premium 7-8 | inner 5-7 | outer premium 4-6 | outer 3-5
  size_score: generous for type/area 8-10 | average 5-7 | compact 3-5 | micro 1-3
  condition_score: new_build 9-10 | refurbished 7-8 | good 5-6 | needs_work 2-4
  transport_score: Zone 1 Tube 9-10 | Zone 2 Tube 7-8 | Zone 3-4 Tube 5-7 | Zone 5-6/Overground 3-5 | bus only 1-3
  investment_score = 0.35*location + 0.25*transport + 0.25*size + 0.15*condition

CONFIDENCE CALIBRATION:
  0.85-0.95: full postcode, known borough, size provided, clear type
  0.70-0.84: partial postcode, size provided, known area
  0.55-0.69: only outward postcode, no size, or unusual property type
  <0.55: insufficient data (unknown postcode area)

RECOMMENDATION:
  strong_buy: investment_score >= 7.5 AND yield > 5% AND growth outlook positive
  buy: investment_score >= 6.0 OR yield > 4.5% with stable/rising trend
  hold: investment_score 4-6, average yield and growth
  avoid: investment_score < 4 OR declining area OR yield < 3% with no growth upside

POSTCODE MAPPING:
  Identify the borough from the postcode. Common mappings:
  SW1/SW3/SW5/SW7/SW10 → Kensington & Chelsea or Westminster
  W8/W11/W14 → Kensington & Chelsea
  W1/WC1/WC2/EC1-EC4 → Westminster/City of London/Camden
  N1 → Islington | N4/N8/N15/N17 → Haringey | N16 → Hackney
  E1/E14 → Tower Hamlets | E15/E20 → Newham | E8/E9 → Hackney
  SE1 → Southwark/Lambeth | SE10/SE18 → Greenwich | SE13/SE6 → Lewisham
  SW11/SW18 → Wandsworth | SW2/SW9 → Lambeth
  BR1/BR2 → Bromley | CR0 → Croydon | RM → Barking/Havering
  IG → Redbridge/Barking | EN → Enfield | HA → Harrow
  TW → Hounslow/Richmond | KT → Kingston | SM → Sutton
  UB → Hillingdon | NW → Camden/Brent

REQUIRED OUTPUT:
  - reasoning: 2-3 paragraphs covering price rationale, location assessment, investment outlook
  - market_context: 1-2 sentences on current conditions in this borough/area
  - key_factors: 3-5 short tags
  - opportunity_factors: concrete positives
  - risk_factors: concrete risks
  - All numeric fields computed explicitly using the formulas above

Output a JSON object with all the required fields."""


_llm: LLM | None = None


def _get_llm() -> LLM:
    global _llm
    if _llm is None:
        _llm = LLM(
            model="openai/deepseek-chat",
            api_key=settings.deepseek_api_key,
            base_url="https://api.deepseek.com/v1",
        )
    return _llm


def _compute_stamp_duty(price: int) -> int:
    """Standard moving-home SDLT rates (2025-2026)."""
    if price <= 250_000:
        return 0
    duty = 0
    if price > 250_000:
        duty += min(price, 925_000) - 250_000
        duty = int(duty * 0.05)
    if price > 925_000:
        duty += int((min(price, 1_500_000) - 925_000) * 0.10)
    if price > 1_500_000:
        duty += int((price - 1_500_000) * 0.12)
    return duty


def _normalize_size(req: LondonPredictionRequest) -> tuple[float | None, float | None]:
    """Return (sqft, m2) ensuring both are filled if either is given."""
    sqft = req.size_sqft
    m2 = req.size_m2
    if sqft and not m2:
        m2 = round(sqft * 0.092903, 1)
    elif m2 and not sqft:
        sqft = round(m2 * 10.7639, 1)
    return sqft, m2


async def predict_london(req: LondonPredictionRequest) -> LondonPredictionResponse:
    sqft, m2 = _normalize_size(req)

    size_line = ""
    if sqft and m2:
        size_line = f"Size: {sqft} sq ft ({m2} m²)"
    else:
        size_line = "Size: not specified (estimate from bedrooms and property type)"

    extras = []
    if req.has_garden is True:
        extras.append("garden")
    if req.has_parking is True:
        extras.append("parking")
    if req.has_balcony is True:
        extras.append("balcony")
    extras_line = f"Extras: {', '.join(extras)}" if extras else "Extras: none specified"

    prompt = f"""Predict the current market value for this London property:

Postcode: {req.postcode}
Property type: {req.property_type}
Bedrooms: {req.bedrooms}
Bathrooms: {req.bathrooms}
{size_line}
Floor: {req.floor or 'not specified'}{f'/{req.total_floors}' if req.total_floors else ''}
Tenure: {req.tenure or 'not specified'}
Condition: {req.condition}
Year built: {req.year_built or 'not specified'}
EPC rating: {req.epc_rating or 'not specified'}
{extras_line}

Identify the borough from the postcode and use the market reference data to produce your prediction.
Compute stamp duty using the standard rates. Add £3,000 for other acquisition costs."""

    agent = CrewAgent(
        role="London Property Valuation Specialist",
        goal="Produce accurate property price predictions for the London residential market",
        backstory=LONDON_PREDICTOR_BACKSTORY,
        llm=_get_llm(),
        verbose=False,
    )
    task = Task(
        description=prompt,
        expected_output="Complete London property prediction with all required fields",
        agent=agent,
        output_pydantic=LondonPrediction,
    )
    crew = Crew(agents=[agent], tasks=[task], verbose=False)
    result = await asyncio.to_thread(crew.kickoff)
    prediction = result.pydantic

    return LondonPredictionResponse(
        postcode=req.postcode,
        property_type=req.property_type,
        bedrooms=req.bedrooms,
        size_sqft=sqft,
        size_m2=m2,
        prediction=prediction,
    )
