"use client";

import { useState, useMemo } from "react";
import { fmtGBP } from "@/lib/london-data";

// ── Types & constants ──────────────────────────────────────────────────────

type MortgageType = "repayment" | "interest_only";

const TERM_OPTIONS = [15, 20, 25, 30, 35];

const AVG_RENT_1BR = 1_800;
const AVG_RENT_2BR = 2_500;

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
  fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace',
  fontVariantNumeric: "tabular-nums",
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

const segmentBtn = (active: boolean): React.CSSProperties => ({
  flex: 1,
  padding: "10px 8px",
  border: active
    ? "1px solid rgba(99,102,241,0.5)"
    : "1px solid #3f3f46",
  borderRadius: 8,
  background: active ? "rgba(99,102,241,0.12)" : "transparent",
  color: active ? "#a5b4fc" : "#a1a1aa",
  cursor: "pointer",
  textAlign: "center",
  transition: "all 0.15s ease",
  fontSize: 13,
  fontWeight: active ? 600 : 400,
  lineHeight: 1.3,
  fontFamily: "inherit",
});

// ── Helpers ────────────────────────────────────────────────────────────────

function calcMonthlyRepayment(
  principal: number,
  annualRate: number,
  termYears: number,
): number {
  if (annualRate === 0) return principal / (termYears * 12);
  const r = annualRate / 100 / 12;
  const n = termYears * 12;
  return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

function calcEquityAtYear(
  principal: number,
  annualRate: number,
  termYears: number,
  year: number,
  propertyPrice: number,
  deposit: number,
  mortgageType: MortgageType,
): { paid: number; remaining: number; equity: number } {
  if (mortgageType === "interest_only") {
    const interestPaid = principal * (annualRate / 100) * year;
    return {
      paid: interestPaid,
      remaining: principal,
      equity: deposit,
    };
  }

  const r = annualRate / 100 / 12;
  const n = termYears * 12;
  const months = Math.min(year * 12, n);

  if (annualRate === 0) {
    const monthlyPayment = principal / n;
    const totalPaid = monthlyPayment * months;
    const remaining = principal - totalPaid;
    return {
      paid: totalPaid,
      remaining: Math.max(0, remaining),
      equity: deposit + totalPaid,
    };
  }

  const monthlyPayment =
    (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  const remaining =
    principal * Math.pow(1 + r, months) -
    monthlyPayment * ((Math.pow(1 + r, months) - 1) / r);

  const totalPaid = monthlyPayment * months;
  const principalPaid = principal - Math.max(0, remaining);

  return {
    paid: totalPaid,
    remaining: Math.max(0, remaining),
    equity: deposit + principalPaid,
  };
}

function affordabilityColor(pct: number): string {
  if (pct < 30) return "#4ade80"; // green
  if (pct <= 40) return "#fbbf24"; // amber
  return "#f87171"; // red
}

function affordabilityLabel(pct: number): string {
  if (pct < 30) return "Comfortable";
  if (pct <= 40) return "Stretched";
  return "Unaffordable";
}

// ── Component ──────────────────────────────────────────────────────────────

export function MortgageCalculator() {
  const [price, setPrice] = useState(450_000);
  const [depositPct, setDepositPct] = useState(10);
  const [termYears, setTermYears] = useState(25);
  const [rate, setRate] = useState(4.5);
  const [mortgageType, setMortgageType] = useState<MortgageType>("repayment");

  // ── Computed values ────────────────────────────────────────────────────

  const calc = useMemo(() => {
    const deposit = Math.round(price * (depositPct / 100));
    const loanAmount = price - deposit;
    const ltv = ((loanAmount / price) * 100).toFixed(1);

    const monthlyPayment =
      mortgageType === "repayment"
        ? calcMonthlyRepayment(loanAmount, rate, termYears)
        : (loanAmount * (rate / 100)) / 12;

    const totalCost = monthlyPayment * termYears * 12;
    const totalInterest =
      mortgageType === "repayment"
        ? totalCost - loanAmount
        : monthlyPayment * termYears * 12;

    // Affordability
    const requiredSalary = (monthlyPayment * 12) / 4.5;
    // Estimate take-home: rough UK tax calc
    const estimatedTakeHome = estimateMonthlyTakeHome(requiredSalary);
    const paymentAsIncomePct =
      estimatedTakeHome > 0 ? (monthlyPayment / estimatedTakeHome) * 100 : 0;

    // Amortization milestones
    const milestoneYears = [1, 5, 10, termYears].filter(
      (y, i, arr) => y <= termYears && arr.indexOf(y) === i,
    );
    const milestones = milestoneYears.map((year) => ({
      year,
      ...calcEquityAtYear(
        loanAmount,
        rate,
        termYears,
        year,
        price,
        deposit,
        mortgageType,
      ),
    }));

    return {
      deposit,
      loanAmount,
      ltv,
      monthlyPayment: Math.round(monthlyPayment),
      totalCost: Math.round(totalCost),
      totalInterest: Math.round(totalInterest),
      requiredSalary: Math.round(requiredSalary),
      estimatedTakeHome: Math.round(estimatedTakeHome),
      paymentAsIncomePct,
      milestones,
    };
  }, [price, depositPct, termYears, rate, mortgageType]);

  // ── Donut chart geometry ─────────────────────────────────────────────

  const donut = useMemo(() => {
    const total = calc.totalCost;
    if (total === 0) return { principalAngle: 0, interestAngle: 0 };
    const principalRatio = calc.loanAmount / total;
    const principalAngle = principalRatio * 360;
    const interestAngle = 360 - principalAngle;
    return { principalAngle, interestAngle };
  }, [calc.totalCost, calc.loanAmount]);

  // ── Handlers ─────────────────────────────────────────────────────────

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, "");
    const num = parseInt(raw, 10);
    setPrice(isNaN(num) ? 0 : num);
  };

  // ── Render ───────────────────────────────────────────────────────────

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
        UK Mortgage Calculator
      </h3>

      {/* ── Property price ─────────────────────────────────────────────── */}
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Property Price</label>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            background: "#18181b",
            border: "1px solid #3f3f46",
            borderRadius: 6,
            overflow: "hidden",
          }}
        >
          <span
            style={{
              padding: "8px 12px",
              fontSize: 16,
              fontWeight: 700,
              color: "#a1a1aa",
              background: "rgba(255,255,255,0.03)",
              borderRight: "1px solid #3f3f46",
            }}
          >
            £
          </span>
          <input
            type="text"
            value={price.toLocaleString("en-GB")}
            onChange={handlePriceChange}
            style={{
              flex: 1,
              padding: "8px 12px",
              fontSize: 16,
              fontWeight: 700,
              fontVariantNumeric: "tabular-nums",
              color: "#fff",
              background: "transparent",
              border: "none",
              outline: "none",
              fontFamily: "inherit",
            }}
          />
        </div>
      </div>

      {/* ── Deposit slider ─────────────────────────────────────────────── */}
      <div style={{ marginBottom: 16 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: 4,
          }}
        >
          <label style={{ ...labelStyle, marginBottom: 0 }}>
            Deposit: {depositPct}%
          </label>
          <span
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "#818cf8",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {fmtGBP(calc.deposit)}
          </span>
        </div>
        <input
          type="range"
          min={5}
          max={50}
          step={1}
          value={depositPct}
          onChange={(e) => setDepositPct(Number(e.target.value))}
          style={{
            width: "100%",
            accentColor: "#6366f1",
            cursor: "pointer",
          }}
        />
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 11,
            color: "#52525b",
            marginTop: 2,
          }}
        >
          <span>5%</span>
          <span>50%</span>
        </div>
      </div>

      {/* ── Term + Rate row ────────────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
          marginBottom: 16,
        }}
      >
        <div>
          <label style={labelStyle}>Mortgage Term</label>
          <select
            value={termYears}
            onChange={(e) => setTermYears(Number(e.target.value))}
            style={{ ...inputStyle, cursor: "pointer", appearance: "auto" }}
          >
            {TERM_OPTIONS.map((y) => (
              <option key={y} value={y}>
                {y} years
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Interest Rate (%)</label>
          <input
            type="number"
            min={0}
            max={15}
            step={0.1}
            value={rate}
            onChange={(e) => setRate(Math.max(0, Number(e.target.value)))}
            style={inputStyle}
          />
        </div>
      </div>

      {/* ── Mortgage type toggle ───────────────────────────────────────── */}
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Mortgage Type</label>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={() => setMortgageType("repayment")}
            style={segmentBtn(mortgageType === "repayment")}
          >
            Repayment
          </button>
          <button
            type="button"
            onClick={() => setMortgageType("interest_only")}
            style={segmentBtn(mortgageType === "interest_only")}
          >
            Interest Only
          </button>
        </div>
      </div>

      <div style={sectionDivider} />

      {/* ── Output panel ───────────────────────────────────────────────── */}
      <div
        style={{
          backgroundColor: "rgba(99,102,241,0.06)",
          border: "1px solid #27272a",
          borderRadius: 8,
          padding: 20,
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
          Monthly Payment
        </h4>

        {/* Large monthly payment */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: 20,
            paddingBottom: 16,
            borderBottom: "1px solid #3f3f46",
          }}
        >
          <span style={{ fontSize: 14, color: "#a1a1aa" }}>
            Monthly payment
          </span>
          <span
            style={{
              fontSize: 32,
              fontWeight: 700,
              color: "#818cf8",
              letterSpacing: "-0.02em",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {fmtGBP(calc.monthlyPayment)}
          </span>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "12px 24px",
          }}
        >
          <Row label="Loan amount" value={fmtGBP(calc.loanAmount)} />
          <Row label="Loan-to-value (LTV)" value={`${calc.ltv}%`} />
          <Row
            label="Total cost over term"
            value={fmtGBP(calc.totalCost)}
            highlight
          />
          <Row
            label="Total interest paid"
            value={fmtGBP(calc.totalInterest)}
            color="#f87171"
          />
        </div>
      </div>

      <div style={sectionDivider} />

      {/* ── Affordability indicators ───────────────────────────────────── */}
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
          Affordability
        </h4>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 12,
          }}
        >
          {/* Required salary */}
          <div
            style={{
              backgroundColor: "#18181b",
              border: "1px solid #3f3f46",
              borderRadius: 8,
              padding: 14,
            }}
          >
            <div style={{ fontSize: 11, color: "#71717a", marginBottom: 4 }}>
              Required Salary
            </div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: "#e4e4e7",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {fmtGBP(calc.requiredSalary)}
            </div>
            <div style={{ fontSize: 11, color: "#52525b", marginTop: 2 }}>
              based on 4.5x multiplier
            </div>
          </div>

          {/* Monthly take-home */}
          <div
            style={{
              backgroundColor: "#18181b",
              border: "1px solid #3f3f46",
              borderRadius: 8,
              padding: 14,
            }}
          >
            <div style={{ fontSize: 11, color: "#71717a", marginBottom: 4 }}>
              Est. Monthly Take-Home
            </div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: "#e4e4e7",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {fmtGBP(calc.estimatedTakeHome)}
            </div>
            <div style={{ fontSize: 11, color: "#52525b", marginTop: 2 }}>
              after tax + NI
            </div>
          </div>

          {/* Payment as % of income */}
          <div
            style={{
              backgroundColor: "#18181b",
              border: `1px solid ${affordabilityColor(calc.paymentAsIncomePct)}33`,
              borderRadius: 8,
              padding: 14,
            }}
          >
            <div style={{ fontSize: 11, color: "#71717a", marginBottom: 4 }}>
              Payment / Income
            </div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: affordabilityColor(calc.paymentAsIncomePct),
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {calc.paymentAsIncomePct.toFixed(1)}%
            </div>
            <div
              style={{
                fontSize: 11,
                color: affordabilityColor(calc.paymentAsIncomePct),
                marginTop: 2,
                fontWeight: 600,
              }}
            >
              {affordabilityLabel(calc.paymentAsIncomePct)}
            </div>
          </div>
        </div>
      </div>

      <div style={sectionDivider} />

      {/* ── Donut chart: principal vs interest ──────────────────────────── */}
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
          Repayment Breakdown
        </h4>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 32,
          }}
        >
          <svg width={180} height={180} viewBox="0 0 180 180">
            <DonutSegment
              cx={90}
              cy={90}
              r={65}
              strokeWidth={24}
              startAngle={-90}
              sweepAngle={donut.principalAngle}
              color="#6366f1"
            />
            <DonutSegment
              cx={90}
              cy={90}
              r={65}
              strokeWidth={24}
              startAngle={-90 + donut.principalAngle}
              sweepAngle={donut.interestAngle}
              color="#f87171"
            />
            {/* Center text */}
            <text
              x={90}
              y={82}
              textAnchor="middle"
              fontSize={10}
              fill="#71717a"
              fontFamily='ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace'
            >
              Total Cost
            </text>
            <text
              x={90}
              y={100}
              textAnchor="middle"
              fontSize={15}
              fontWeight={700}
              fill="#e4e4e7"
              fontFamily='ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace'
            >
              {fmtGBP(calc.totalCost)}
            </text>
          </svg>

          {/* Legend */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 3,
                  backgroundColor: "#6366f1",
                }}
              />
              <div>
                <div style={{ fontSize: 12, color: "#a1a1aa" }}>Principal</div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: "#e4e4e7",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {fmtGBP(calc.loanAmount)}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 3,
                  backgroundColor: "#f87171",
                }}
              />
              <div>
                <div style={{ fontSize: 12, color: "#a1a1aa" }}>Interest</div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: "#e4e4e7",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {fmtGBP(calc.totalInterest)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={sectionDivider} />

      {/* ── Monthly payment vs London rents bar ────────────────────────── */}
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
          Payment vs London Rents
        </h4>

        <PaymentComparisonBar
          payment={calc.monthlyPayment}
          rent1br={AVG_RENT_1BR}
          rent2br={AVG_RENT_2BR}
        />
      </div>

      <div style={sectionDivider} />

      {/* ── Amortization summary ───────────────────────────────────────── */}
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
          Equity Position Over Time
        </h4>

        <div
          style={{
            borderRadius: 8,
            overflow: "hidden",
            border: "1px solid #3f3f46",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "0.7fr 1fr 1fr 1fr",
              padding: "8px 12px",
              background: "rgba(255,255,255,0.03)",
              borderBottom: "1px solid #3f3f46",
            }}
          >
            {["Year", "Total Paid", "Remaining", "Equity"].map((h) => (
              <span
                key={h}
                style={{
                  fontSize: 11,
                  color: "#71717a",
                  fontWeight: 500,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  textAlign: h === "Year" ? "left" : "right",
                }}
              >
                {h}
              </span>
            ))}
          </div>

          {/* Rows */}
          {calc.milestones.map((m, i) => (
            <div
              key={m.year}
              style={{
                display: "grid",
                gridTemplateColumns: "0.7fr 1fr 1fr 1fr",
                padding: "8px 12px",
                borderBottom:
                  i < calc.milestones.length - 1
                    ? "1px solid rgba(255,255,255,0.04)"
                    : "none",
                background:
                  m.year === termYears
                    ? "rgba(99,102,241,0.06)"
                    : "transparent",
                borderLeft:
                  m.year === termYears
                    ? "2px solid #6366f1"
                    : "2px solid transparent",
              }}
            >
              <span
                style={{
                  fontSize: 13,
                  color:
                    m.year === termYears ? "#818cf8" : "#e4e4e7",
                  fontWeight: m.year === termYears ? 600 : 400,
                }}
              >
                Year {m.year}
              </span>
              <span
                style={{
                  fontSize: 13,
                  color: "#a1a1aa",
                  textAlign: "right",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {fmtGBP(Math.round(m.paid))}
              </span>
              <span
                style={{
                  fontSize: 13,
                  color:
                    Math.round(m.remaining) === 0 ? "#4ade80" : "#f87171",
                  textAlign: "right",
                  fontVariantNumeric: "tabular-nums",
                  fontWeight: Math.round(m.remaining) === 0 ? 600 : 400,
                }}
              >
                {fmtGBP(Math.round(m.remaining))}
              </span>
              <span
                style={{
                  fontSize: 13,
                  color:
                    m.year === termYears ? "#818cf8" : "#4ade80",
                  textAlign: "right",
                  fontVariantNumeric: "tabular-nums",
                  fontWeight: m.year === termYears ? 700 : 400,
                }}
              >
                {fmtGBP(Math.round(m.equity))}
              </span>
            </div>
          ))}
        </div>

        {mortgageType === "interest_only" && (
          <div
            style={{
              marginTop: 10,
              padding: "8px 12px",
              borderRadius: 6,
              background: "rgba(245,158,11,0.08)",
              border: "1px solid rgba(245,158,11,0.2)",
              fontSize: 12,
              color: "#fbbf24",
            }}
          >
            Interest-only: the full loan balance of{" "}
            {fmtGBP(calc.loanAmount)} remains at end of term. You must
            repay or refinance.
          </div>
        )}
      </div>
    </div>
  );
}

// ── SVG donut segment ──────────────────────────────────────────────────────

function DonutSegment({
  cx,
  cy,
  r,
  strokeWidth,
  startAngle,
  sweepAngle,
  color,
}: {
  cx: number;
  cy: number;
  r: number;
  strokeWidth: number;
  startAngle: number;
  sweepAngle: number;
  color: string;
}) {
  if (sweepAngle <= 0) return null;

  const circumference = 2 * Math.PI * r;
  const arcLength = (sweepAngle / 360) * circumference;
  const dashArray = `${arcLength} ${circumference - arcLength}`;
  const dashOffset = (startAngle / 360) * circumference * -1;

  return (
    <circle
      cx={cx}
      cy={cy}
      r={r}
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeDasharray={dashArray}
      strokeDashoffset={dashOffset}
      strokeLinecap="butt"
      transform={`rotate(-90 ${cx} ${cy})`}
      style={{ transition: "stroke-dasharray 0.3s ease" }}
    />
  );
}

// ── Payment vs rent comparison bar ─────────────────────────────────────────

function PaymentComparisonBar({
  payment,
  rent1br,
  rent2br,
}: {
  payment: number;
  rent1br: number;
  rent2br: number;
}) {
  const maxVal = Math.max(payment, rent2br) * 1.15;

  const paymentPct = (payment / maxVal) * 100;
  const rent1brPct = (rent1br / maxVal) * 100;
  const rent2brPct = (rent2br / maxVal) * 100;

  return (
    <div style={{ position: "relative" }}>
      {/* Payment bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 8,
        }}
      >
        <span
          style={{
            fontSize: 12,
            color: "#a1a1aa",
            width: 110,
            flexShrink: 0,
          }}
        >
          Your payment
        </span>
        <div
          style={{
            flex: 1,
            height: 28,
            backgroundColor: "#1c1c1f",
            borderRadius: 4,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${paymentPct}%`,
              height: "100%",
              background: "linear-gradient(90deg, #6366f1, #818cf8)",
              borderRadius: 4,
              transition: "width 0.3s ease",
            }}
          />
          <span
            style={{
              position: "absolute",
              top: "50%",
              left: 10,
              transform: "translateY(-50%)",
              fontSize: 12,
              fontWeight: 600,
              color: "#fff",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {fmtGBP(payment)}/mo
          </span>
        </div>
      </div>

      {/* 1br rent marker */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 8,
        }}
      >
        <span
          style={{
            fontSize: 12,
            color: "#71717a",
            width: 110,
            flexShrink: 0,
          }}
        >
          Avg 1-bed rent
        </span>
        <div
          style={{
            flex: 1,
            height: 20,
            backgroundColor: "#1c1c1f",
            borderRadius: 4,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${rent1brPct}%`,
              height: "100%",
              backgroundColor: "#3f3f46",
              borderRadius: 4,
            }}
          />
          <span
            style={{
              position: "absolute",
              top: "50%",
              left: 10,
              transform: "translateY(-50%)",
              fontSize: 11,
              color: "#a1a1aa",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {fmtGBP(rent1br)}/mo
          </span>
        </div>
      </div>

      {/* 2br rent marker */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <span
          style={{
            fontSize: 12,
            color: "#71717a",
            width: 110,
            flexShrink: 0,
          }}
        >
          Avg 2-bed rent
        </span>
        <div
          style={{
            flex: 1,
            height: 20,
            backgroundColor: "#1c1c1f",
            borderRadius: 4,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${rent2brPct}%`,
              height: "100%",
              backgroundColor: "#3f3f46",
              borderRadius: 4,
            }}
          />
          <span
            style={{
              position: "absolute",
              top: "50%",
              left: 10,
              transform: "translateY(-50%)",
              fontSize: 11,
              color: "#a1a1aa",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {fmtGBP(rent2br)}/mo
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Row helper ─────────────────────────────────────────────────────────────

function Row({
  label,
  value,
  muted,
  highlight,
  color,
}: {
  label: string;
  value: string;
  muted?: boolean;
  highlight?: boolean;
  color?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
      }}
    >
      <span style={{ fontSize: 13, color: muted ? "#52525b" : "#a1a1aa" }}>
        {label}
      </span>
      <span
        style={{
          fontSize: 14,
          fontWeight: highlight ? 600 : 400,
          color: color
            ? color
            : highlight
              ? "#c7d2fe"
              : muted
                ? "#52525b"
                : "#e4e4e7",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </span>
    </div>
  );
}

// ── UK take-home pay estimate ──────────────────────────────────────────────
// Simplified 2025/26 UK tax + NI calculation for affordability display.

function estimateMonthlyTakeHome(annualGross: number): number {
  const personalAllowance = 12_570;
  const basicRateLimit = 50_270;
  const higherRateLimit = 125_140;

  let tax = 0;

  // Income tax
  if (annualGross > personalAllowance) {
    const basicTaxable = Math.min(
      annualGross,
      basicRateLimit,
    ) - personalAllowance;
    tax += Math.max(0, basicTaxable) * 0.2;
  }
  if (annualGross > basicRateLimit) {
    const higherTaxable =
      Math.min(annualGross, higherRateLimit) - basicRateLimit;
    tax += Math.max(0, higherTaxable) * 0.4;
  }
  if (annualGross > higherRateLimit) {
    tax += (annualGross - higherRateLimit) * 0.45;
  }

  // Taper personal allowance above 100K
  if (annualGross > 100_000) {
    const taperReduction = Math.min(personalAllowance, (annualGross - 100_000) / 2);
    tax += taperReduction * 0.4;
  }

  // National Insurance (Class 1, employee)
  const niThreshold = 12_570;
  const niUpperLimit = 50_270;
  let ni = 0;
  if (annualGross > niThreshold) {
    ni += Math.min(annualGross, niUpperLimit) - niThreshold;
    ni = ni * 0.08;
  }
  if (annualGross > niUpperLimit) {
    ni += (annualGross - niUpperLimit) * 0.02;
  }

  const annualNet = annualGross - tax - ni;
  return annualNet / 12;
}
