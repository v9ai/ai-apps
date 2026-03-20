"use client";

import { useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { Box, Flex, Text } from "@radix-ui/themes";
import { Topbar } from "@/components/topbar";
import { Footer } from "@/components/footer";
import { CashFlowChart } from "@/components/cashflow-chart";

const ANALYZER_URL =
  process.env.NEXT_PUBLIC_ANALYZER_URL ?? "http://localhost:8005";

type CashFlowProjection = {
  years: Array<{
    year: number;
    gross_rent: number;
    vacancy_loss: number;
    effective_rent: number;
    management_cost: number;
    maintenance_cost: number;
    insurance: number;
    tax: number;
    total_expenses: number;
    noi: number;
    debt_service: number;
    cash_flow: number;
    cumulative_cash_flow: number;
    property_value: number;
    equity: number;
    total_return: number;
  }>;
  summary: {
    total_investment: number;
    irr: number | null;
    cash_on_cash_year1: number;
    equity_multiple: number;
    breakeven_month: number | null;
    avg_annual_return_pct: number;
  };
};

/* ------------------------------------------------------------------ */
/*  Inline styles                                                      */
/* ------------------------------------------------------------------ */

const S = {
  page: {
    minHeight: "100vh",
    display: "flex" as const,
    flexDirection: "column" as const,
  },
  hero: {
    position: "relative" as const,
    padding: "48px 0 36px",
  },
  heroGlow: {
    position: "absolute" as const,
    inset: 0,
    background:
      "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(34,197,94,0.08), transparent)",
    pointerEvents: "none" as const,
  },
  card: {
    position: "relative" as const,
    background: "rgba(255,255,255,0.025)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 20,
    padding: "28px 28px 22px",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    boxShadow:
      "0 8px 40px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.04)",
  },
  label: {
    fontSize: 11,
    fontWeight: 600,
    textTransform: "uppercase" as const,
    letterSpacing: "0.06em",
    color: "var(--gray-8)",
    marginBottom: 4,
    display: "block" as const,
  } as React.CSSProperties,
  input: {
    width: "100%",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 10,
    padding: "10px 14px",
    color: "var(--gray-12)",
    fontSize: 14,
    outline: "none",
    fontFamily: "inherit",
    fontVariantNumeric: "tabular-nums" as const,
  } as React.CSSProperties,
  slider: {
    width: "100%",
    accentColor: "var(--iris-9)",
    cursor: "pointer",
  } as React.CSSProperties,
  btn: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: "0 32px",
    height: 48,
    borderRadius: 12,
    background: "linear-gradient(135deg, var(--accent-9), #22c55e)",
    color: "#fff",
    fontSize: 14,
    fontWeight: 700,
    border: "none",
    cursor: "pointer",
    letterSpacing: "0.02em",
    transition: "transform 0.2s, box-shadow 0.2s, opacity 0.2s",
    boxShadow: "0 4px 20px rgba(34,197,94,0.25)",
    whiteSpace: "nowrap" as const,
  } as React.CSSProperties,
  btnOff: { opacity: 0.6, cursor: "not-allowed" as const },
  error: {
    padding: "14px 18px",
    borderRadius: 12,
    background: "rgba(239,68,68,0.08)",
    border: "1px solid rgba(239,68,68,0.2)",
    color: "var(--red-11)",
    fontSize: 13,
  },
};

export function CashFlowContent() {
  const params = useSearchParams();

  const [purchasePrice, setPurchasePrice] = useState(
    Number(params.get("purchase_price")) || 75000
  );
  const [rentalMonthly, setRentalMonthly] = useState(
    Number(params.get("rental_monthly")) || 500
  );
  const [vacancyPct, setVacancyPct] = useState(5);
  const [managementPct, setManagementPct] = useState(10);
  const [maintenancePct, setMaintenancePct] = useState(5);
  const [insuranceAnnual, setInsuranceAnnual] = useState(0);
  const [taxAnnual, setTaxAnnual] = useState(0);
  const [mortgageAmount, setMortgageAmount] = useState(0);
  const [mortgageRate, setMortgageRate] = useState(4.0);
  const [mortgageYears, setMortgageYears] = useState(25);
  const [appreciationRate, setAppreciationRate] = useState(3.0);
  const [closingCostsPct, setClosingCostsPct] = useState(3.0);
  const [projectionYears, setProjectionYears] = useState(10);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CashFlowProjection | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch(
        `${ANALYZER_URL}/cashflow?years=${projectionYears}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            purchase_price: purchasePrice,
            rental_monthly: rentalMonthly,
            vacancy_pct: vacancyPct,
            management_pct: managementPct,
            maintenance_pct: maintenancePct,
            insurance_annual: insuranceAnnual,
            tax_annual: taxAnnual,
            mortgage_amount: mortgageAmount,
            mortgage_rate_pct: mortgageRate,
            mortgage_years: mortgageYears,
            appreciation_rate_pct: appreciationRate,
            closing_costs_pct: closingCostsPct,
          }),
        }
      );
      if (!resp.ok) {
        const body = await resp.text();
        throw new Error(body || `HTTP ${resp.status}`);
      }
      const data: CashFlowProjection = await resp.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={S.page}>
      <Topbar />
      <Box
        px={{ initial: "4", sm: "6" }}
        style={{ maxWidth: 960, margin: "0 auto", width: "100%", flex: 1 }}
      >
        <div style={S.hero}>
          <div style={S.heroGlow} />
          <Box style={{ position: "relative" }}>
            <Text
              size="6"
              weight="bold"
              as="p"
              mb="2"
              style={{ letterSpacing: "-0.02em" }}
            >
              Cash Flow Projection
            </Text>
            <Text size="2" color="gray" as="p" mb="5">
              Simulate multi-year investment returns with mortgage, expenses, and
              appreciation.
            </Text>
          </Box>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={S.card}>
            {/* Core inputs */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                gap: 16,
                marginBottom: 20,
              }}
            >
              <Field label="Purchase Price (EUR)">
                <input
                  type="number"
                  style={S.input}
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(Number(e.target.value))}
                  min={1000}
                />
              </Field>
              <Field label="Monthly Rent (EUR)">
                <input
                  type="number"
                  style={S.input}
                  value={rentalMonthly}
                  onChange={(e) => setRentalMonthly(Number(e.target.value))}
                  min={0}
                />
              </Field>
              <Field label="Projection Years">
                <input
                  type="number"
                  style={S.input}
                  value={projectionYears}
                  onChange={(e) => setProjectionYears(Number(e.target.value))}
                  min={1}
                  max={30}
                />
              </Field>
            </div>

            {/* Mortgage section */}
            <Text
              size="2"
              weight="bold"
              as="p"
              mb="3"
              style={{ color: "var(--gray-9)" }}
            >
              Mortgage
            </Text>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                gap: 16,
                marginBottom: 20,
              }}
            >
              <Field label="Mortgage Amount (EUR)">
                <input
                  type="number"
                  style={S.input}
                  value={mortgageAmount}
                  onChange={(e) => setMortgageAmount(Number(e.target.value))}
                  min={0}
                />
              </Field>
              <Field label={`Interest Rate: ${mortgageRate.toFixed(1)}%`}>
                <input
                  type="range"
                  style={S.slider}
                  value={mortgageRate}
                  onChange={(e) => setMortgageRate(Number(e.target.value))}
                  min={0}
                  max={15}
                  step={0.1}
                />
              </Field>
              <Field label={`Term: ${mortgageYears} years`}>
                <input
                  type="range"
                  style={S.slider}
                  value={mortgageYears}
                  onChange={(e) => setMortgageYears(Number(e.target.value))}
                  min={5}
                  max={35}
                  step={1}
                />
              </Field>
            </div>

            {/* Expense sliders */}
            <Text
              size="2"
              weight="bold"
              as="p"
              mb="3"
              style={{ color: "var(--gray-9)" }}
            >
              Expenses & Assumptions
            </Text>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                gap: 16,
                marginBottom: 20,
              }}
            >
              <Field label={`Vacancy: ${vacancyPct}%`}>
                <input
                  type="range"
                  style={S.slider}
                  value={vacancyPct}
                  onChange={(e) => setVacancyPct(Number(e.target.value))}
                  min={0}
                  max={20}
                  step={1}
                />
              </Field>
              <Field label={`Management: ${managementPct}%`}>
                <input
                  type="range"
                  style={S.slider}
                  value={managementPct}
                  onChange={(e) => setManagementPct(Number(e.target.value))}
                  min={0}
                  max={20}
                  step={1}
                />
              </Field>
              <Field label={`Maintenance: ${maintenancePct}%`}>
                <input
                  type="range"
                  style={S.slider}
                  value={maintenancePct}
                  onChange={(e) => setMaintenancePct(Number(e.target.value))}
                  min={0}
                  max={15}
                  step={1}
                />
              </Field>
              <Field label={`Appreciation: ${appreciationRate.toFixed(1)}%`}>
                <input
                  type="range"
                  style={S.slider}
                  value={appreciationRate}
                  onChange={(e) => setAppreciationRate(Number(e.target.value))}
                  min={0}
                  max={10}
                  step={0.5}
                />
              </Field>
              <Field label={`Closing Costs: ${closingCostsPct.toFixed(1)}%`}>
                <input
                  type="range"
                  style={S.slider}
                  value={closingCostsPct}
                  onChange={(e) => setClosingCostsPct(Number(e.target.value))}
                  min={0}
                  max={10}
                  step={0.5}
                />
              </Field>
              <Field label="Insurance (EUR/year)">
                <input
                  type="number"
                  style={S.input}
                  value={insuranceAnnual}
                  onChange={(e) => setInsuranceAnnual(Number(e.target.value))}
                  min={0}
                />
              </Field>
              <Field label="Property Tax (EUR/year)">
                <input
                  type="number"
                  style={S.input}
                  value={taxAnnual}
                  onChange={(e) => setTaxAnnual(Number(e.target.value))}
                  min={0}
                />
              </Field>
            </div>

            <Flex justify="center">
              <button
                type="submit"
                disabled={loading}
                style={{
                  ...S.btn,
                  ...(loading ? S.btnOff : {}),
                }}
              >
                {loading ? "Calculating..." : "Calculate Cash Flow"}
              </button>
            </Flex>
          </div>
        </form>

        {error && (
          <Box mt="4">
            <div style={S.error}>{error}</div>
          </Box>
        )}

        {result && (
          <Box mt="5" mb="6">
            <CashFlowChart data={result} />
          </Box>
        )}
      </Box>
      <Footer />
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label style={S.label}>{label}</label>
      {children}
    </div>
  );
}
