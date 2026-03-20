"""Cash flow projection for property investment analysis.

Pure math — no LLM calls. Computes multi-year projections including
mortgage amortization, NOI, equity build-up, IRR, and cash-on-cash return.
"""

from pydantic import BaseModel
from fastapi import APIRouter


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class CashFlowInput(BaseModel):
    purchase_price: int
    rental_monthly: int
    vacancy_pct: float = 5.0
    management_pct: float = 10.0
    maintenance_pct: float = 5.0
    insurance_annual: int = 0
    tax_annual: int = 0
    mortgage_amount: int = 0
    mortgage_rate_pct: float = 4.0
    mortgage_years: int = 25
    appreciation_rate_pct: float = 3.0
    closing_costs_pct: float = 3.0


class CashFlowYear(BaseModel):
    year: int
    gross_rent: int
    vacancy_loss: int
    effective_rent: int
    management_cost: int
    maintenance_cost: int
    insurance: int
    tax: int
    total_expenses: int
    noi: int
    debt_service: int
    cash_flow: int
    cumulative_cash_flow: int
    property_value: int
    equity: int
    total_return: int


class CashFlowSummary(BaseModel):
    total_investment: int
    irr: float | None
    cash_on_cash_year1: float
    equity_multiple: float
    breakeven_month: int | None
    avg_annual_return_pct: float


class CashFlowProjection(BaseModel):
    years: list[CashFlowYear]
    summary: CashFlowSummary


# ---------------------------------------------------------------------------
# Mortgage math
# ---------------------------------------------------------------------------

def _monthly_payment(principal: int, annual_rate_pct: float, years: int) -> float:
    """Monthly mortgage payment using standard amortization formula.

    M = P * [r(1+r)^n] / [(1+r)^n - 1]
    """
    if principal <= 0 or years <= 0:
        return 0.0
    if annual_rate_pct <= 0:
        return principal / (years * 12)
    r = annual_rate_pct / 100 / 12
    n = years * 12
    factor = (1 + r) ** n
    return principal * (r * factor) / (factor - 1)


def _remaining_balance(principal: int, annual_rate_pct: float, years: int, months_paid: int) -> float:
    """Outstanding mortgage balance after *months_paid* payments."""
    if principal <= 0 or years <= 0:
        return 0.0
    if annual_rate_pct <= 0:
        monthly = principal / (years * 12)
        return max(0, principal - monthly * months_paid)
    r = annual_rate_pct / 100 / 12
    n = years * 12
    factor = (1 + r) ** n
    paid_factor = (1 + r) ** months_paid
    balance = principal * (factor - paid_factor) / (factor - 1)
    return max(0, balance)


# ---------------------------------------------------------------------------
# IRR via Newton's method
# ---------------------------------------------------------------------------

def _compute_irr(cash_flows: list[float], max_iter: int = 200, tol: float = 1e-8) -> float | None:
    """Compute IRR using Newton-Raphson. Returns annualized rate or None."""
    if not cash_flows or len(cash_flows) < 2:
        return None
    # Need at least one sign change
    positives = sum(1 for c in cash_flows if c > 0)
    negatives = sum(1 for c in cash_flows if c < 0)
    if positives == 0 or negatives == 0:
        return None

    rate = 0.10  # initial guess
    for _ in range(max_iter):
        npv = 0.0
        dnpv = 0.0
        for t, cf in enumerate(cash_flows):
            denom = (1 + rate) ** t
            if denom == 0:
                return None
            npv += cf / denom
            if t > 0:
                dnpv -= t * cf / ((1 + rate) ** (t + 1))
        if abs(npv) < tol:
            return round(rate * 100, 2)
        if abs(dnpv) < 1e-14:
            return None
        rate -= npv / dnpv
        if rate <= -1:
            return None
    return round(rate * 100, 2) if abs(npv) < 0.01 else None


# ---------------------------------------------------------------------------
# Core projection
# ---------------------------------------------------------------------------

def project_cash_flow(inp: CashFlowInput, years: int = 10) -> CashFlowProjection:
    closing_costs = int(inp.purchase_price * inp.closing_costs_pct / 100)
    total_investment = inp.purchase_price + closing_costs
    cash_invested = total_investment - inp.mortgage_amount

    monthly_pmt = _monthly_payment(inp.mortgage_amount, inp.mortgage_rate_pct, inp.mortgage_years)
    annual_debt_service = int(monthly_pmt * 12)

    rows: list[CashFlowYear] = []
    cumulative = 0
    # IRR cash flows: year 0 = -cash_invested, years 1..N = cash_flow, year N adds equity
    irr_flows: list[float] = [-float(cash_invested)]

    for yr in range(1, years + 1):
        gross_rent = int(inp.rental_monthly * 12)
        vacancy_loss = int(gross_rent * inp.vacancy_pct / 100)
        effective_rent = gross_rent - vacancy_loss

        mgmt = int(gross_rent * inp.management_pct / 100)
        maint = int(gross_rent * inp.maintenance_pct / 100)
        insurance = inp.insurance_annual
        tax = inp.tax_annual
        total_expenses = mgmt + maint + insurance + tax

        noi = effective_rent - total_expenses
        cash_flow = noi - annual_debt_service
        cumulative += cash_flow

        prop_value = int(inp.purchase_price * (1 + inp.appreciation_rate_pct / 100) ** yr)
        remaining_mortgage = _remaining_balance(
            inp.mortgage_amount, inp.mortgage_rate_pct, inp.mortgage_years, yr * 12,
        )
        equity = int(prop_value - remaining_mortgage)
        total_return = int(equity + cumulative - total_investment)

        rows.append(CashFlowYear(
            year=yr,
            gross_rent=gross_rent,
            vacancy_loss=vacancy_loss,
            effective_rent=effective_rent,
            management_cost=mgmt,
            maintenance_cost=maint,
            insurance=insurance,
            tax=tax,
            total_expenses=total_expenses,
            noi=noi,
            debt_service=annual_debt_service,
            cash_flow=cash_flow,
            cumulative_cash_flow=cumulative,
            property_value=prop_value,
            equity=equity,
            total_return=total_return,
        ))

        if yr < years:
            irr_flows.append(float(cash_flow))
        else:
            # Terminal year: cash flow + equity (sell)
            irr_flows.append(float(cash_flow + equity))

    # Summary metrics
    irr = _compute_irr(irr_flows)

    year1_cf = rows[0].cash_flow if rows else 0
    cash_on_cash = round(year1_cf / cash_invested * 100, 2) if cash_invested > 0 else 0.0

    last = rows[-1] if rows else None
    eq_multiple = round((last.total_return + total_investment) / total_investment, 2) if last and total_investment > 0 else 0.0

    # Breakeven month
    breakeven_month: int | None = None
    running = 0
    monthly_cf = rows[0].cash_flow / 12 if rows else 0
    if monthly_cf > 0:
        for m in range(1, years * 12 + 1):
            running += monthly_cf
            if running >= 0:
                breakeven_month = m
                break

    avg_annual = round(last.total_return / years / total_investment * 100, 2) if last and total_investment > 0 and years > 0 else 0.0

    summary = CashFlowSummary(
        total_investment=total_investment,
        irr=irr,
        cash_on_cash_year1=cash_on_cash,
        equity_multiple=eq_multiple,
        breakeven_month=breakeven_month,
        avg_annual_return_pct=avg_annual,
    )

    return CashFlowProjection(years=rows, summary=summary)


# ---------------------------------------------------------------------------
# FastAPI router
# ---------------------------------------------------------------------------

cashflow_router = APIRouter(tags=["cashflow"])


@cashflow_router.post("/cashflow", response_model=CashFlowProjection)
async def cashflow_endpoint(inp: CashFlowInput, years: int = 10):
    return project_cash_flow(inp, years)
