"use client";

import { useState, useMemo } from "react";
import {
  BOROUGHS,
  fmtGBP,
  fmt,
  computeStampDuty,
  type Borough,
} from "@/lib/london-data";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  ComposedChart,
  Bar,
  Line,
} from "recharts";

// ── Styles ─────────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  backgroundColor: "#18181b",
  border: "1px solid #3f3f46",
  color: "#fff",
  borderRadius: 6,
  padding: "8px 12px",
  fontSize: 14,
  width: "100%",
  outline: "none",
  fontFamily: "inherit",
};

const labelStyle: React.CSSProperties = {
  fontSize: 13,
  color: "#a1a1aa",
  marginBottom: 4,
  display: "block",
};

const sectionDivider: React.CSSProperties = {
  borderTop: "1px solid #27272a",
  margin: "20px 0",
};

const smallInputStyle: React.CSSProperties = {
  ...inputStyle,
  maxWidth: 120,
  textAlign: "right" as const,
};

// ── Helpers ────────────────────────────────────────────────────────────────

function monthlyMortgagePayment(
  principal: number,
  annualRate: number,
  years: number,
): number {
  if (annualRate === 0) return principal / (years * 12);
  const r = annualRate / 100 / 12;
  const n = years * 12;
  return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

function remainingMortgageBalance(
  principal: number,
  annualRate: number,
  totalYears: number,
  yearsPaid: number,
): number {
  if (annualRate === 0) {
    return principal - (principal / totalYears) * yearsPaid;
  }
  const r = annualRate / 100 / 12;
  const n = totalYears * 12;
  const p = yearsPaid * 12;
  return (
    principal *
    ((Math.pow(1 + r, n) - Math.pow(1 + r, p)) /
      (Math.pow(1 + r, n) - 1))
  );
}

// ── Component ──────────────────────────────────────────────────────────────

export function ROICalculator() {
  // Inputs
  const [boroughName, setBoroughName] = useState("Tower Hamlets");
  const [customPrice, setCustomPrice] = useState<number | null>(null);
  const [depositPct, setDepositPct] = useState(25);
  const [mortgageRate, setMortgageRate] = useState(4.5);
  const [holdingPeriod, setHoldingPeriod] = useState(5);
  const [annualRentGrowth, setAnnualRentGrowth] = useState(3);
  const [managementPct, setManagementPct] = useState(12);
  const [voidWeeks, setVoidWeeks] = useState(2);

  const borough = useMemo(
    () => BOROUGHS.find((b) => b.name === boroughName) ?? BOROUGHS[0],
    [boroughName],
  );

  const purchasePrice = customPrice ?? borough.avgPrice;

  // When borough changes, reset custom price
  const handleBoroughChange = (name: string) => {
    setBoroughName(name);
    setCustomPrice(null);
  };

  // ── Computed values ────────────────────────────────────────────────────

  const analysis = useMemo(() => {
    const MORTGAGE_TERM = 25; // standard UK mortgage term
    const LEGAL_FEES = 3_000;
    const INSURANCE_MONTHLY = 50;

    // Initial investment
    const deposit = Math.round(purchasePrice * (depositPct / 100));
    const stampDuty = computeStampDuty(purchasePrice, true); // additional property
    const initialInvestment = deposit + stampDuty + LEGAL_FEES;

    // Mortgage
    const loanAmount = purchasePrice - deposit;
    const monthlyMortgage = monthlyMortgagePayment(
      loanAmount,
      mortgageRate,
      MORTGAGE_TERM,
    );

    // Rental income (using midpoint of yield range)
    const yieldMid = (borough.yieldLow + borough.yieldHigh) / 2 / 100;
    const monthlyGrossRent = Math.round((purchasePrice * yieldMid) / 12);

    // Monthly costs
    const managementCost = Math.round(monthlyGrossRent * (managementPct / 100));
    const voidCost = Math.round((monthlyGrossRent * voidWeeks) / 52);
    const monthlyNetRent =
      monthlyGrossRent - managementCost - voidCost - INSURANCE_MONTHLY;
    const monthlyCashFlow = monthlyNetRent - monthlyMortgage;
    const annualCashFlow = monthlyCashFlow * 12;

    // Capital appreciation (using borough growth1y as annual rate)
    const annualGrowthRate = borough.growth1y / 100;
    const endValue = purchasePrice * Math.pow(1 + annualGrowthRate, holdingPeriod);

    // Equity from repayment
    const remainingBalance = remainingMortgageBalance(
      loanAmount,
      mortgageRate,
      MORTGAGE_TERM,
      holdingPeriod,
    );
    const equityFromRepayment = loanAmount - remainingBalance;
    const totalEquityAtExit = endValue - remainingBalance;

    // Total rental income over holding period (with rent growth)
    let totalRentalIncome = 0;
    let currentAnnualRent = monthlyNetRent * 12;
    for (let y = 0; y < holdingPeriod; y++) {
      totalRentalIncome += currentAnnualRent;
      currentAnnualRent *= 1 + annualRentGrowth / 100;
    }

    // Total return
    const capitalGain = endValue - purchasePrice;
    const totalReturn = totalRentalIncome + capitalGain - initialInvestment;
    const roiPct = (totalReturn / initialInvestment) * 100;

    // Annualized ROI (CAGR)
    const totalReturnMultiple = (totalReturn + initialInvestment) / initialInvestment;
    const annualizedROI =
      totalReturnMultiple > 0
        ? (Math.pow(totalReturnMultiple, 1 / holdingPeriod) - 1) * 100
        : 0;

    // Cash-on-cash return year 1
    const cashOnCash = (annualCashFlow / initialInvestment) * 100;

    // Chart data: cumulative breakdown per year
    const chartData: {
      year: number;
      rentalIncome: number;
      equityRepayment: number;
      capitalAppreciation: number;
      total: number;
    }[] = [];

    let cumulativeRental = 0;
    let yearlyRent = monthlyNetRent * 12;

    for (let y = 1; y <= holdingPeriod; y++) {
      cumulativeRental += yearlyRent;
      yearlyRent *= 1 + annualRentGrowth / 100;

      const equityRepaid =
        loanAmount -
        remainingMortgageBalance(loanAmount, mortgageRate, MORTGAGE_TERM, y);

      const capAppreciation =
        purchasePrice * Math.pow(1 + annualGrowthRate, y) - purchasePrice;

      chartData.push({
        year: y,
        rentalIncome: Math.round(cumulativeRental),
        equityRepayment: Math.round(equityRepaid),
        capitalAppreciation: Math.round(capAppreciation),
        total: Math.round(cumulativeRental + equityRepaid + capAppreciation),
      });
    }

    return {
      initialInvestment,
      deposit,
      stampDuty,
      loanAmount,
      monthlyMortgage,
      monthlyGrossRent,
      managementCost,
      voidCost,
      insuranceMonthly: INSURANCE_MONTHLY,
      monthlyNetRent,
      monthlyCashFlow,
      annualCashFlow,
      endValue,
      equityFromRepayment,
      totalEquityAtExit,
      remainingBalance,
      totalRentalIncome,
      capitalGain,
      totalReturn,
      roiPct,
      annualizedROI,
      cashOnCash,
      chartData,
    };
  }, [
    purchasePrice,
    depositPct,
    mortgageRate,
    holdingPeriod,
    annualRentGrowth,
    managementPct,
    voidWeeks,
    borough,
  ]);

  // ── Custom tooltip ───────────────────────────────────────────────────

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div
        style={{
          background: "#18181b",
          border: "1px solid #3f3f46",
          borderRadius: 8,
          padding: "12px 16px",
          fontSize: 13,
        }}
      >
        <div style={{ fontWeight: 600, color: "#e4e4e7", marginBottom: 8 }}>
          Year {label}
        </div>
        {payload.map((entry: any) => (
          <div
            key={entry.dataKey}
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 24,
              marginBottom: 4,
            }}
          >
            <span style={{ color: entry.color }}>{entry.name}</span>
            <span
              style={{
                color: "#e4e4e7",
                fontVariantNumeric: "tabular-nums",
                fontWeight: 500,
              }}
            >
              {fmtGBP(entry.value)}
            </span>
          </div>
        ))}
        <div
          style={{
            borderTop: "1px solid #3f3f46",
            marginTop: 6,
            paddingTop: 6,
            display: "flex",
            justifyContent: "space-between",
            gap: 24,
          }}
        >
          <span style={{ color: "#a1a1aa" }}>Total</span>
          <span
            style={{
              color: "#818cf8",
              fontWeight: 700,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {fmtGBP(
              payload.reduce((s: number, p: any) => s + (p.value ?? 0), 0),
            )}
          </span>
        </div>
      </div>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        backgroundColor: "#09090b",
        border: "1px solid #27272a",
        borderRadius: 12,
        padding: 24,
        maxWidth: 720,
        fontFamily:
          'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace',
      }}
    >
      <h3
        style={{
          margin: "0 0 20px",
          fontSize: 18,
          fontWeight: 600,
          color: "#e4e4e7",
          letterSpacing: "-0.01em",
        }}
      >
        Investment ROI Calculator
      </h3>

      {/* ── Borough selector ─────────────────────────────────────────── */}
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Borough</label>
        <select
          value={boroughName}
          onChange={(e) => handleBoroughChange(e.target.value)}
          style={{ ...inputStyle, cursor: "pointer", appearance: "auto" }}
        >
          {BOROUGHS.map((b) => (
            <option key={b.name} value={b.name}>
              {b.name} -- avg {fmtGBP(b.avgPrice)}
            </option>
          ))}
        </select>
      </div>

      {/* ── Purchase price ───────────────────────────────────────────── */}
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Purchase Price</label>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 0,
            background: "#18181b",
            border: "1px solid #3f3f46",
            borderRadius: 6,
            overflow: "hidden",
            maxWidth: 280,
          }}
        >
          <span
            style={{
              padding: "8px 12px",
              fontSize: 14,
              fontWeight: 700,
              color: "#71717a",
              background: "rgba(255,255,255,0.03)",
              borderRight: "1px solid #3f3f46",
              lineHeight: 1,
            }}
          >
            \u00A3
          </span>
          <input
            type="text"
            value={purchasePrice.toLocaleString("en-GB")}
            onChange={(e) => {
              const raw = e.target.value.replace(/[^0-9]/g, "");
              const num = parseInt(raw, 10);
              setCustomPrice(isNaN(num) ? 0 : num);
            }}
            style={{
              flex: 1,
              padding: "8px 12px",
              fontSize: 14,
              fontWeight: 600,
              fontVariantNumeric: "tabular-nums",
              color: "#e4e4e7",
              background: "transparent",
              border: "none",
              outline: "none",
              fontFamily: "inherit",
            }}
          />
        </div>
      </div>

      <div style={sectionDivider} />

      {/* ── Input grid ───────────────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "16px 24px",
        }}
      >
        {/* Deposit % */}
        <div>
          <label style={labelStyle}>
            Deposit: {depositPct}%{" "}
            <span style={{ color: "#52525b" }}>
              ({fmtGBP(Math.round(purchasePrice * (depositPct / 100)))})
            </span>
          </label>
          <input
            type="range"
            min={10}
            max={50}
            step={1}
            value={depositPct}
            onChange={(e) => setDepositPct(Number(e.target.value))}
            style={{ width: "100%", accentColor: "#6366f1" }}
          />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 11,
              color: "#52525b",
            }}
          >
            <span>10%</span>
            <span>50%</span>
          </div>
        </div>

        {/* Mortgage rate */}
        <div>
          <label style={labelStyle}>Mortgage Rate (%)</label>
          <input
            type="number"
            min={0}
            max={15}
            step={0.1}
            value={mortgageRate}
            onChange={(e) => setMortgageRate(Number(e.target.value))}
            style={smallInputStyle}
          />
        </div>

        {/* Holding period */}
        <div>
          <label style={labelStyle}>
            Holding Period: {holdingPeriod} year{holdingPeriod !== 1 ? "s" : ""}
          </label>
          <input
            type="range"
            min={1}
            max={15}
            step={1}
            value={holdingPeriod}
            onChange={(e) => setHoldingPeriod(Number(e.target.value))}
            style={{ width: "100%", accentColor: "#6366f1" }}
          />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 11,
              color: "#52525b",
            }}
          >
            <span>1 yr</span>
            <span>15 yrs</span>
          </div>
        </div>

        {/* Annual rent growth */}
        <div>
          <label style={labelStyle}>Annual Rent Growth (%)</label>
          <input
            type="number"
            min={0}
            max={15}
            step={0.5}
            value={annualRentGrowth}
            onChange={(e) => setAnnualRentGrowth(Number(e.target.value))}
            style={smallInputStyle}
          />
        </div>

        {/* Management costs */}
        <div>
          <label style={labelStyle}>Management Costs (%)</label>
          <input
            type="number"
            min={0}
            max={30}
            step={1}
            value={managementPct}
            onChange={(e) => setManagementPct(Number(e.target.value))}
            style={smallInputStyle}
          />
        </div>

        {/* Void periods */}
        <div>
          <label style={labelStyle}>Void Periods (weeks/year)</label>
          <input
            type="number"
            min={0}
            max={12}
            step={1}
            value={voidWeeks}
            onChange={(e) => setVoidWeeks(Number(e.target.value))}
            style={smallInputStyle}
          />
        </div>
      </div>

      <div style={sectionDivider} />

      {/* ── Summary cards ────────────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr 1fr",
          gap: 12,
          marginBottom: 24,
        }}
      >
        <SummaryCard
          label="Initial Investment"
          value={fmtGBP(analysis.initialInvestment)}
          sub={`Dep ${fmtGBP(analysis.deposit)} + SDLT ${fmtGBP(analysis.stampDuty)}`}
        />
        <SummaryCard
          label="Total Return"
          value={fmtGBP(Math.round(analysis.totalReturn))}
          positive={analysis.totalReturn > 0}
          negative={analysis.totalReturn < 0}
        />
        <SummaryCard
          label="ROI %"
          value={`${analysis.roiPct.toFixed(1)}%`}
          sub={`${analysis.annualizedROI.toFixed(1)}% CAGR`}
          positive={analysis.roiPct > 0}
          negative={analysis.roiPct < 0}
        />
        <SummaryCard
          label="Cash-on-Cash Yr 1"
          value={`${analysis.cashOnCash.toFixed(1)}%`}
          sub={`${fmtGBP(Math.round(analysis.annualCashFlow))}/yr`}
          positive={analysis.cashOnCash > 0}
          negative={analysis.cashOnCash < 0}
        />
      </div>

      {/* ── Stacked area chart ───────────────────────────────────────── */}
      <div
        style={{
          backgroundColor: "rgba(99,102,241,0.04)",
          border: "1px solid #27272a",
          borderRadius: 8,
          padding: "20px 16px 12px",
          marginBottom: 24,
        }}
      >
        <h4
          style={{
            margin: "0 0 16px",
            fontSize: 14,
            fontWeight: 600,
            color: "#a1a1aa",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          Cumulative Returns by Year
        </h4>
        <ResponsiveContainer width="100%" height={350}>
          <AreaChart data={analysis.chartData}>
            <defs>
              <linearGradient id="gradRental" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="gradEquity" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="gradCapital" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#a78bfa" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis
              dataKey="year"
              tick={{ fill: "#71717a", fontSize: 12 }}
              tickLine={{ stroke: "#3f3f46" }}
              axisLine={{ stroke: "#3f3f46" }}
              label={{
                value: "Year",
                position: "insideBottomRight",
                offset: -4,
                fill: "#52525b",
                fontSize: 11,
              }}
            />
            <YAxis
              tick={{ fill: "#71717a", fontSize: 12 }}
              tickLine={{ stroke: "#3f3f46" }}
              axisLine={{ stroke: "#3f3f46" }}
              tickFormatter={(v: number) =>
                v >= 1_000_000
                  ? `\u00A3${(v / 1_000_000).toFixed(1)}M`
                  : `\u00A3${Math.round(v / 1000)}K`
              }
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: 12, color: "#a1a1aa" }}
              iconType="circle"
            />
            <Area
              type="monotone"
              dataKey="rentalIncome"
              name="Rental Income"
              stackId="1"
              stroke="#22c55e"
              fill="url(#gradRental)"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="equityRepayment"
              name="Equity Repayment"
              stackId="1"
              stroke="#3b82f6"
              fill="url(#gradEquity)"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="capitalAppreciation"
              name="Capital Appreciation"
              stackId="1"
              stroke="#a78bfa"
              fill="url(#gradCapital)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* ── Monthly P&L table ────────────────────────────────────────── */}
      <div>
        <h4
          style={{
            margin: "0 0 12px",
            fontSize: 14,
            fontWeight: 600,
            color: "#a1a1aa",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          Monthly P&L
        </h4>
        <div
          style={{
            borderRadius: 8,
            overflow: "hidden",
            border: "1px solid #27272a",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(6, 1fr)",
              gap: 0,
              padding: "8px 12px",
              background: "rgba(255,255,255,0.03)",
              borderBottom: "1px solid #27272a",
            }}
          >
            {[
              "Gross Rent",
              "Management",
              "Voids",
              "Insurance",
              "Mortgage",
              "Net Cash Flow",
            ].map((h) => (
              <span
                key={h}
                style={{
                  fontSize: 11,
                  color: "#71717a",
                  fontWeight: 500,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  textAlign: "right",
                }}
              >
                {h}
              </span>
            ))}
          </div>

          {/* Data row */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(6, 1fr)",
              gap: 0,
              padding: "10px 12px",
              background: "rgba(99,102,241,0.04)",
            }}
          >
            <PLCell value={analysis.monthlyGrossRent} positive />
            <PLCell value={-analysis.managementCost} />
            <PLCell value={-analysis.voidCost} />
            <PLCell value={-analysis.insuranceMonthly} />
            <PLCell value={-Math.round(analysis.monthlyMortgage)} />
            <PLCell
              value={Math.round(analysis.monthlyCashFlow)}
              highlight
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Summary card ───────────────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  sub,
  positive,
  negative,
}: {
  label: string;
  value: string;
  sub?: string;
  positive?: boolean;
  negative?: boolean;
}) {
  const color = positive
    ? "#4ade80"
    : negative
      ? "#f87171"
      : "#e4e4e7";

  return (
    <div
      style={{
        backgroundColor: "rgba(99,102,241,0.06)",
        border: "1px solid #27272a",
        borderRadius: 8,
        padding: "14px 12px",
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: "#71717a",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          marginBottom: 6,
          fontWeight: 500,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 20,
          fontWeight: 700,
          color,
          fontVariantNumeric: "tabular-nums",
          letterSpacing: "-0.02em",
          lineHeight: 1.2,
        }}
      >
        {value}
      </div>
      {sub && (
        <div
          style={{
            fontSize: 11,
            color: "#52525b",
            marginTop: 4,
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}

// ── P&L cell ───────────────────────────────────────────────────────────────

function PLCell({
  value,
  positive,
  highlight,
}: {
  value: number;
  positive?: boolean;
  highlight?: boolean;
}) {
  const isPos = value >= 0;
  const color = highlight
    ? isPos
      ? "#4ade80"
      : "#f87171"
    : positive
      ? "#4ade80"
      : "#f87171";

  return (
    <span
      style={{
        fontSize: 14,
        fontWeight: highlight ? 700 : 500,
        fontVariantNumeric: "tabular-nums",
        textAlign: "right",
        color,
      }}
    >
      {isPos ? "" : "-"}{fmtGBP(Math.abs(value))}
    </span>
  );
}
