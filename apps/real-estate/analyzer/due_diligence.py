from pydantic import BaseModel
from fastapi import APIRouter


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class ChecklistItem(BaseModel):
    category: str  # legal, financial, physical, regulatory
    item: str
    description: str
    priority: str  # critical, important, recommended
    market_specific: bool = False
    estimated_cost_eur: int | None = None
    typical_time_days: int | None = None


class DueDiligenceChecklist(BaseModel):
    market: str
    items: list[ChecklistItem]
    risk_level: str  # low, medium, high
    estimated_total_days: int
    estimated_total_cost_eur: int


# ---------------------------------------------------------------------------
# Checklists per market
# ---------------------------------------------------------------------------

CHECKLISTS: dict[str, list[ChecklistItem]] = {
    "moldova": [
        # Legal
        ChecklistItem(
            category="legal", item="Cadastral Extract",
            description="Obtain fresh cadastral extract from ASP (Agency for Public Services) confirming ownership, boundaries, and encumbrances",
            priority="critical", market_specific=True, estimated_cost_eur=20, typical_time_days=3,
        ),
        ChecklistItem(
            category="legal", item="BTI Technical Plan",
            description="Request BTI (Bureau of Technical Inventory) floor plan to verify layout matches reality and no unauthorized modifications",
            priority="critical", market_specific=True, estimated_cost_eur=50, typical_time_days=5,
        ),
        ChecklistItem(
            category="legal", item="Encumbrance Certificate",
            description="Check for mortgages, liens, arrests, or other encumbrances on the property",
            priority="critical", market_specific=True, estimated_cost_eur=15, typical_time_days=2,
        ),
        ChecklistItem(
            category="legal", item="Owner Identity Verification",
            description="Verify seller identity matches cadastral records. Check for co-owners, spousal consent if married",
            priority="critical", estimated_cost_eur=0, typical_time_days=1,
        ),
        ChecklistItem(
            category="legal", item="Building Permit History",
            description="Review building permits and occupancy certificate (proces-verbal de dare in exploatare)",
            priority="important", market_specific=True, estimated_cost_eur=0, typical_time_days=3,
        ),
        ChecklistItem(
            category="legal", item="HOA/Condominium Status",
            description="Check association dues, pending assessments, and building maintenance fund status",
            priority="important", estimated_cost_eur=0, typical_time_days=2,
        ),
        # Financial
        ChecklistItem(
            category="financial", item="Tax Clearance Certificate",
            description="Confirm no outstanding property taxes or utility debts",
            priority="critical", estimated_cost_eur=10, typical_time_days=3,
        ),
        ChecklistItem(
            category="financial", item="Utility Debt Check",
            description="Verify no outstanding gas, electric, water, or heating bills tied to the property",
            priority="important", estimated_cost_eur=0, typical_time_days=2,
        ),
        ChecklistItem(
            category="financial", item="Notary Fee Estimation",
            description="Budget ~1-2% for notary fees plus state registration duty",
            priority="recommended", estimated_cost_eur=0, typical_time_days=1,
        ),
        # Physical
        ChecklistItem(
            category="physical", item="In-Person Inspection",
            description="Visit property at different times of day. Check walls for cracks, moisture, mold. Test plumbing pressure. Check electrical outlets",
            priority="critical", estimated_cost_eur=0, typical_time_days=1,
        ),
        ChecklistItem(
            category="physical", item="Building Structural Assessment",
            description="For older buildings (pre-1990), assess structural integrity, seismic safety, roof/facade condition",
            priority="important", estimated_cost_eur=100, typical_time_days=5,
        ),
        ChecklistItem(
            category="physical", item="Neighbor Interview",
            description="Talk to neighbors about building management, noise, planned construction, flooding history",
            priority="recommended", estimated_cost_eur=0, typical_time_days=1,
        ),
        # Regulatory
        ChecklistItem(
            category="regulatory", item="Energy Performance Certificate",
            description="Check or obtain energy certificate (certificat energetic). Mandatory for sale in EU-aligned markets",
            priority="important", market_specific=True, estimated_cost_eur=80, typical_time_days=7,
        ),
        ChecklistItem(
            category="regulatory", item="Urban Planning Check",
            description="Verify zoning permits future use (residential/commercial). Check for planned infrastructure projects that could affect value",
            priority="recommended", estimated_cost_eur=0, typical_time_days=5,
        ),
    ],
    "romania": [
        # Legal
        ChecklistItem(
            category="legal", item="Land Registry Extract (CF)",
            description="Obtain Extras de Carte Funciara from OCPI. Verifies ownership, encumbrances, and legal status",
            priority="critical", market_specific=True, estimated_cost_eur=20, typical_time_days=2,
        ),
        ChecklistItem(
            category="legal", item="Certificat de Urbanism",
            description="Urban planning certificate confirming zoning, building parameters, and permitted uses",
            priority="critical", market_specific=True, estimated_cost_eur=50, typical_time_days=15,
        ),
        ChecklistItem(
            category="legal", item="Fiscal Certificate",
            description="Certificat fiscal from local tax authority confirming no outstanding property taxes",
            priority="critical", market_specific=True, estimated_cost_eur=10, typical_time_days=3,
        ),
        ChecklistItem(
            category="legal", item="Owner Verification",
            description="Verify seller identity against CF records. Check for co-owners and spousal consent (art. 345 Civil Code)",
            priority="critical", estimated_cost_eur=0, typical_time_days=1,
        ),
        ChecklistItem(
            category="legal", item="HOA Minutes Review",
            description="Review last 12 months of HOA meeting minutes for planned repairs, assessments, or disputes",
            priority="important", estimated_cost_eur=0, typical_time_days=3,
        ),
        ChecklistItem(
            category="legal", item="Anti-Money Laundering Check",
            description="ONPCSB declaration required for transactions over \u20AC15,000",
            priority="important", market_specific=True, estimated_cost_eur=0, typical_time_days=1,
        ),
        # Financial
        ChecklistItem(
            category="financial", item="Utility Transfer Costs",
            description="Budget for utility contract transfers (gas, electric, water, internet)",
            priority="recommended", estimated_cost_eur=100, typical_time_days=5,
        ),
        ChecklistItem(
            category="financial", item="VAT Assessment",
            description="New builds may have 5% or 19% TVA included/excluded. Verify with developer",
            priority="important", market_specific=True, estimated_cost_eur=0, typical_time_days=1,
        ),
        ChecklistItem(
            category="financial", item="Notary and Registration",
            description="Budget 1-2% for notary fees + 0.5% land registration + stamp duty",
            priority="recommended", estimated_cost_eur=0, typical_time_days=1,
        ),
        # Physical
        ChecklistItem(
            category="physical", item="Technical Survey",
            description="Hire engineer for structural inspection. Essential for pre-1977 earthquake buildings in Bucharest",
            priority="critical", estimated_cost_eur=300, typical_time_days=7,
        ),
        ChecklistItem(
            category="physical", item="Seismic Risk Classification",
            description="Check building's seismic risk class (RS1/RS2/RS3). RS1 = highest risk, may affect insurance and resale",
            priority="critical", market_specific=True, estimated_cost_eur=0, typical_time_days=1,
        ),
        ChecklistItem(
            category="physical", item="EPC (Energy Performance)",
            description="Certificat de performanta energetica. Mandatory for sale. Classes A-G",
            priority="important", market_specific=True, estimated_cost_eur=150, typical_time_days=7,
        ),
        # Regulatory
        ChecklistItem(
            category="regulatory", item="Autorizatie de Construire Check",
            description="For new builds: verify developer has valid building permit and all approvals",
            priority="critical", market_specific=True, estimated_cost_eur=0, typical_time_days=3,
        ),
        ChecklistItem(
            category="regulatory", item="Proces-Verbal de Receptie",
            description="Completion certificate confirming building meets approved plans and standards",
            priority="important", market_specific=True, estimated_cost_eur=0, typical_time_days=2,
        ),
    ],
    "uk": [
        # Legal
        ChecklistItem(
            category="legal", item="Title Deeds Review",
            description="Solicitor reviews title register and title plan from HM Land Registry",
            priority="critical", market_specific=True, estimated_cost_eur=350, typical_time_days=5,
        ),
        ChecklistItem(
            category="legal", item="Local Authority Searches",
            description="Planning history, building control, environmental, highways \u2014 via solicitor",
            priority="critical", market_specific=True, estimated_cost_eur=300, typical_time_days=21,
        ),
        ChecklistItem(
            category="legal", item="Environmental Search",
            description="Flood risk, contaminated land, radon, subsidence \u2014 specialist environmental report",
            priority="critical", market_specific=True, estimated_cost_eur=200, typical_time_days=10,
        ),
        ChecklistItem(
            category="legal", item="Leasehold Terms Review",
            description="If leasehold: review lease length (min 80 years recommended), ground rent, service charges, restrictions",
            priority="critical", market_specific=True, estimated_cost_eur=0, typical_time_days=5,
        ),
        ChecklistItem(
            category="legal", item="Chancel Repair Search",
            description="Historic liability for church repairs in some areas",
            priority="recommended", market_specific=True, estimated_cost_eur=30, typical_time_days=3,
        ),
        # Financial
        ChecklistItem(
            category="financial", item="Stamp Duty Calculation",
            description="Calculate SDLT (0-12% depending on price and investor status). Additional 3% surcharge for buy-to-let",
            priority="critical", market_specific=True, estimated_cost_eur=0, typical_time_days=1,
        ),
        ChecklistItem(
            category="financial", item="Mortgage Valuation",
            description="Lender's valuation survey (if mortgaging)",
            priority="important", estimated_cost_eur=400, typical_time_days=10,
        ),
        ChecklistItem(
            category="financial", item="Service Charge Review",
            description="Review last 3 years of service charges and any planned major works",
            priority="important", estimated_cost_eur=0, typical_time_days=3,
        ),
        # Physical
        ChecklistItem(
            category="physical", item="RICS Building Survey",
            description="Full structural survey by chartered surveyor (Level 3 for older properties)",
            priority="critical", market_specific=True, estimated_cost_eur=800, typical_time_days=14,
        ),
        ChecklistItem(
            category="physical", item="EPC Rating",
            description="Energy Performance Certificate (A-G). Required by law. EPC E minimum for rental from 2025",
            priority="important", market_specific=True, estimated_cost_eur=120, typical_time_days=5,
        ),
        ChecklistItem(
            category="physical", item="Gas Safety Certificate",
            description="Required for rental. CP12 certificate must be renewed annually",
            priority="important", estimated_cost_eur=80, typical_time_days=3,
        ),
        ChecklistItem(
            category="physical", item="Electrical Safety Certificate",
            description="EICR required for rental properties since 2020",
            priority="important", estimated_cost_eur=200, typical_time_days=5,
        ),
        # Regulatory
        ChecklistItem(
            category="regulatory", item="Planning Permission Review",
            description="Check for any planning applications pending or recent approvals nearby",
            priority="recommended", estimated_cost_eur=0, typical_time_days=3,
        ),
        ChecklistItem(
            category="regulatory", item="HMO Licensing Check",
            description="If planning multi-let: check if HMO license required in the borough",
            priority="recommended", market_specific=True, estimated_cost_eur=0, typical_time_days=2,
        ),
    ],
}


# ---------------------------------------------------------------------------
# Core logic
# ---------------------------------------------------------------------------

def get_due_diligence_checklist(market: str) -> DueDiligenceChecklist:
    """Return the full checklist for a market."""
    market_key = _normalize_market(market)
    items = CHECKLISTS.get(market_key, CHECKLISTS["moldova"])

    total_cost = sum(i.estimated_cost_eur or 0 for i in items)
    critical_days = [
        i.typical_time_days or 0
        for i in items
        if i.priority == "critical"
    ]
    total_days = max(critical_days) if critical_days else 0

    risk = "high" if market_key == "moldova" else "medium" if market_key == "romania" else "low"

    return DueDiligenceChecklist(
        market=market_key,
        items=items,
        risk_level=risk,
        estimated_total_days=total_days,
        estimated_total_cost_eur=total_cost,
    )


def _normalize_market(market: str) -> str:
    """Map market/city names to checklist keys."""
    m = market.lower().strip()
    if m in ("moldova", "chisinau", "chișinău", "kishinev"):
        return "moldova"
    if m in ("romania", "bucharest", "bucurești", "bucuresti"):
        return "romania"
    if m in ("uk", "london", "england", "united kingdom"):
        return "uk"
    return "moldova"


# ---------------------------------------------------------------------------
# FastAPI router
# ---------------------------------------------------------------------------

due_diligence_router = APIRouter(tags=["due-diligence"])


@due_diligence_router.get("/due-diligence/{market}", response_model=DueDiligenceChecklist)
async def get_checklist(market: str):
    return get_due_diligence_checklist(market)
