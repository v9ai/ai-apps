"use client";

import { useState, useMemo } from "react";
import {
  BOROUGHS,
  TIER_COLOR,
  TIER_LABEL,
  fmtGBP,
  computeStampDuty,
  computeStampDutyFTB,
  type Borough,
} from "@/lib/london-data";

// ── Types ───────────────────────────────────────────────────────────────────

type BuyerType = "ftb" | "moving";

type BoroughResult = {
  borough: Borough;
  affordable: boolean;
  difference: number; // positive = under budget, negative = over budget
  extraDepositNeeded: number;
  extraIncomeNeeded: number;
  sdlt: number;
};

// ── Constants ───────────────────────────────────────────────────────────────

const INCOME_MULTIPLIER = 4.5;
const TAKE_HOME_RATIO = 0.7;
const TERM_OPTIONS = [25, 30] as const;

// ── Helpers ─────────────────────────────────────────────────────────────────

function monthlyMortgagePayment(
  principal: number,
  annualRate: number,
  termYears: number,
): number {
  if (principal <= 0) return 0;
  const r = annualRate / 100 / 12;
  const n = termYears * 12;
  if (r === 0) return principal / n;
  return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

// ── Styles ──────────────────────────────────────────────────────────────────

const card: React.CSSProperties = {
  background: "rgba(255,255,255,0.02)",
  border: "1px solid rgba(255,255,255,0.06)",
  borderRadius: 10,
  padding: 20,
};

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  color: "var(--gray-9)",
  marginBottom: 6,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  fontWeight: 500,
};

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
  fontVariantNumeric: "tabular-nums",
};

const segmentBtn = (active: boolean): React.CSSProperties => ({
  flex: 1,
  padding: "10px 8px",
  border: active
    ? "1px solid rgba(99,102,241,0.5)"
    : "1px solid rgba(255,255,255,0.08)",
  borderRadius: 8,
  background: active ? "rgba(99,102,241,0.12)" : "transparent",
  color: active ? "#a5b4fc" : "var(--gray-9)",
  cursor: "pointer",
  textAlign: "center",
  transition: "all 0.15s ease",
  fontSize: 13,
  fontWeight: active ? 600 : 400,
  lineHeight: 1.3,
  fontFamily: "inherit",
});

const sectionDivider: React.CSSProperties = {
  borderTop: "1px solid #27272a",
  margin: "20px 0",
};

// ── Component ───────────────────────────────────────────────────────────────

export function AffordabilityCalculator() {
  const [salary, setSalary] = useState(60_000);
  const [partnerSalary, setPartnerSalary] = useState(0);
  const [deposit, setDeposit] = useState(50_000);
  const [rate, setRate] = useState(4.5);
  const [term, setTerm] = useState<25 | 30>(25);
  const [buyerType, setBuyerType] = useState<BuyerType>("ftb");

  // ── Core computed values ────────────────────────────────────────────────

  const totalIncome = salary + partnerSalary;
  const maxBorrowing = totalIncome * INCOME_MULTIPLIER;
  const maxPropertyPrice = maxBorrowing + deposit;
  const monthlyPayment = monthlyMortgagePayment(maxBorrowing, rate, term);
  const monthlyTakeHome = (totalIncome * TAKE_HOME_RATIO) / 12;
  const paymentPctOfTakeHome =
    monthlyTakeHome > 0 ? (monthlyPayment / monthlyTakeHome) * 100 : 0;

  // ── Borough results ─────────────────────────────────────────────────────

  const boroughResults = useMemo(() => {
    return BOROUGHS.map((borough): BoroughResult => {
      const sdlt =
        buyerType === "ftb"
          ? computeStampDutyFTB(borough.avgPrice)
          : computeStampDuty(borough.avgPrice);
      const affordable = borough.avgPrice <= maxPropertyPrice;
      const difference = maxPropertyPrice - borough.avgPrice;

      // How much more deposit or income would be needed
      let extraDepositNeeded = 0;
      let extraIncomeNeeded = 0;
      if (!affordable) {
        const shortfall = borough.avgPrice - maxPropertyPrice;
        extraDepositNeeded = shortfall;
        extraIncomeNeeded = Math.ceil(shortfall / INCOME_MULTIPLIER);
      }

      return {
        borough,
        affordable,
        difference,
        extraDepositNeeded,
        extraIncomeNeeded,
        sdlt,
      };
    }).sort((a, b) => {
      // Affordable first, then by how far under budget (descending)
      if (a.affordable && !b.affordable) return -1;
      if (!a.affordable && b.affordable) return 1;
      return b.difference - a.difference;
    });
  }, [maxPropertyPrice, buyerType]);

  const affordableCount = boroughResults.filter((r) => r.affordable).length;
  const cheapestAffordable = boroughResults.find((r) => r.affordable);
  const cheapestOverall = [...boroughResults].sort(
    (a, b) => a.borough.avgPrice - b.borough.avgPrice,
  )[0];

  // ── Bar chart scale ─────────────────────────────────────────────────────

  const maxAvgPrice = Math.max(...BOROUGHS.map((b) => b.avgPrice));
  const chartMax = Math.max(maxAvgPrice, maxPropertyPrice) * 1.05;

  // ── Input handlers ──────────────────────────────────────────────────────

  const handleNumericChange =
    (setter: (v: number) => void) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.replace(/[^0-9]/g, "");
      const num = parseInt(raw, 10);
      setter(isNaN(num) ? 0 : num);
    };

  const handleRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const num = parseFloat(e.target.value);
    setRate(isNaN(num) ? 0 : num);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* ── Inputs ─────────────────────────────────────────────────────── */}
      <div style={card}>
        <div style={labelStyle}>Your Financial Details</div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "16px 20px",
          }}
        >
          {/* Annual salary */}
          <div>
            <label
              style={{ fontSize: 13, color: "#a1a1aa", marginBottom: 4, display: "block" }}
            >
              Annual gross salary
            </label>
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
                  padding: "8px 10px",
                  fontSize: 14,
                  color: "#71717a",
                  background: "rgba(255,255,255,0.03)",
                  borderRight: "1px solid #3f3f46",
                }}
              >
                £
              </span>
              <input
                type="text"
                value={salary.toLocaleString("en-GB")}
                onChange={handleNumericChange(setSalary)}
                style={{
                  ...inputStyle,
                  border: "none",
                  borderRadius: 0,
                }}
              />
            </div>
          </div>

          {/* Partner salary */}
          <div>
            <label
              style={{ fontSize: 13, color: "#a1a1aa", marginBottom: 4, display: "block" }}
            >
              Partner salary (optional)
            </label>
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
                  padding: "8px 10px",
                  fontSize: 14,
                  color: "#71717a",
                  background: "rgba(255,255,255,0.03)",
                  borderRight: "1px solid #3f3f46",
                }}
              >
                £
              </span>
              <input
                type="text"
                value={partnerSalary.toLocaleString("en-GB")}
                onChange={handleNumericChange(setPartnerSalary)}
                style={{
                  ...inputStyle,
                  border: "none",
                  borderRadius: 0,
                }}
              />
            </div>
          </div>

          {/* Deposit */}
          <div>
            <label
              style={{ fontSize: 13, color: "#a1a1aa", marginBottom: 4, display: "block" }}
            >
              Deposit available
            </label>
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
                  padding: "8px 10px",
                  fontSize: 14,
                  color: "#71717a",
                  background: "rgba(255,255,255,0.03)",
                  borderRight: "1px solid #3f3f46",
                }}
              >
                £
              </span>
              <input
                type="text"
                value={deposit.toLocaleString("en-GB")}
                onChange={handleNumericChange(setDeposit)}
                style={{
                  ...inputStyle,
                  border: "none",
                  borderRadius: 0,
                }}
              />
            </div>
          </div>

          {/* Mortgage rate */}
          <div>
            <label
              style={{ fontSize: 13, color: "#a1a1aa", marginBottom: 4, display: "block" }}
            >
              Mortgage rate (%)
            </label>
            <input
              type="number"
              step={0.1}
              min={0}
              max={15}
              value={rate}
              onChange={handleRateChange}
              style={{ ...inputStyle, maxWidth: 140 }}
            />
          </div>
        </div>

        {/* Term + Buyer type row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 20,
            marginTop: 16,
          }}
        >
          {/* Term selector */}
          <div>
            <label
              style={{ fontSize: 13, color: "#a1a1aa", marginBottom: 4, display: "block" }}
            >
              Term
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              {TERM_OPTIONS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTerm(t)}
                  style={segmentBtn(term === t)}
                >
                  {t} years
                </button>
              ))}
            </div>
          </div>

          {/* Buyer type */}
          <div>
            <label
              style={{ fontSize: 13, color: "#a1a1aa", marginBottom: 4, display: "block" }}
            >
              Buyer type
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={() => setBuyerType("ftb")}
                style={segmentBtn(buyerType === "ftb")}
              >
                First-time buyer
              </button>
              <button
                type="button"
                onClick={() => setBuyerType("moving")}
                style={segmentBtn(buyerType === "moving")}
              >
                Moving home
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Computed outputs ────────────────────────────────────────────── */}
      <div style={card}>
        <div style={labelStyle}>Your Buying Power</div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 16,
          }}
        >
          <StatBox
            label="Household income"
            value={fmtGBP(totalIncome)}
          />
          <StatBox
            label="Max borrowing (4.5x)"
            value={fmtGBP(maxBorrowing)}
          />
          <StatBox
            label="Max property price"
            value={fmtGBP(maxPropertyPrice)}
            highlight
          />
          <StatBox
            label="Monthly mortgage"
            value={fmtGBP(Math.round(monthlyPayment))}
          />
          <StatBox
            label="% of take-home"
            value={`${paymentPctOfTakeHome.toFixed(1)}%`}
            warn={paymentPctOfTakeHome > 40}
          />
          <StatBox
            label="Est. monthly take-home"
            value={fmtGBP(Math.round(monthlyTakeHome))}
          />
        </div>

        {paymentPctOfTakeHome > 40 && (
          <div
            style={{
              marginTop: 12,
              padding: "8px 12px",
              borderRadius: 6,
              background: "rgba(245,158,11,0.08)",
              border: "1px solid rgba(245,158,11,0.2)",
              fontSize: 12,
              color: "#fbbf24",
            }}
          >
            Mortgage payments above 40% of take-home may be considered
            high-risk by lenders. Consider increasing your deposit or extending
            the term.
          </div>
        )}
      </div>

      {/* ── Summary insight ────────────────────────────────────────────── */}
      <div style={card}>
        <div style={labelStyle}>Summary</div>
        <div
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: affordableCount > 0 ? "#4ade80" : "#f87171",
            marginBottom: 8,
          }}
        >
          You can afford {affordableCount} of {BOROUGHS.length} London boroughs
        </div>

        {affordableCount > 0 && cheapestAffordable ? (
          <div style={{ fontSize: 13, color: "#a1a1aa", lineHeight: 1.6 }}>
            Your best value:{" "}
            <span style={{ color: "#e4e4e7", fontWeight: 500 }}>
              {cheapestAffordable.borough.name}
            </span>{" "}
            at {fmtGBP(cheapestAffordable.borough.avgPrice)}{" "}
            <span style={{ color: "#4ade80" }}>
              ({fmtGBP(cheapestAffordable.difference)} under budget)
            </span>
          </div>
        ) : (
          cheapestOverall && (
            <div style={{ fontSize: 13, color: "#a1a1aa", lineHeight: 1.6 }}>
              London&#39;s most affordable borough ({cheapestOverall.borough.name})
              is{" "}
              <span style={{ color: "#f87171", fontWeight: 500 }}>
                {fmtGBP(Math.abs(cheapestOverall.difference))} over your current
                budget
              </span>
              . Consider increasing your deposit by{" "}
              <span style={{ color: "#fbbf24" }}>
                {fmtGBP(cheapestOverall.extraDepositNeeded)}
              </span>{" "}
              or boosting household income by{" "}
              <span style={{ color: "#fbbf24" }}>
                {fmtGBP(cheapestOverall.extraIncomeNeeded)}
              </span>
              .
            </div>
          )
        )}
      </div>

      {/* ── Horizontal bar chart ───────────────────────────────────────── */}
      <div style={card}>
        <div style={labelStyle}>Borough Prices vs. Your Budget</div>
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            gap: 3,
            marginTop: 8,
          }}
        >
          {boroughResults.map((result) => {
            const barPct = (result.borough.avgPrice / chartMax) * 100;
            const budgetPct = (maxPropertyPrice / chartMax) * 100;

            return (
              <div
                key={result.borough.name}
                style={{
                  display: "grid",
                  gridTemplateColumns: "170px 1fr 80px",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 11,
                }}
              >
                {/* Borough name */}
                <span
                  style={{
                    color: result.affordable ? "#d4d4d8" : "#71717a",
                    fontWeight: result.affordable ? 500 : 400,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {result.borough.name}
                </span>

                {/* Bar + budget line */}
                <div
                  style={{
                    position: "relative",
                    height: 14,
                    background: "#1c1c1f",
                    borderRadius: 3,
                    overflow: "visible",
                  }}
                >
                  {/* Price bar */}
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      height: "100%",
                      width: `${barPct}%`,
                      borderRadius: 3,
                      background: result.affordable
                        ? "linear-gradient(90deg, #22c55e, #4ade80)"
                        : "linear-gradient(90deg, #3f3f46, #52525b)",
                      transition: "width 300ms ease",
                    }}
                  />

                  {/* Budget reference line */}
                  <div
                    style={{
                      position: "absolute",
                      top: -2,
                      bottom: -2,
                      left: `${budgetPct}%`,
                      width: 2,
                      background: "#a5b4fc",
                      borderRadius: 1,
                      zIndex: 2,
                    }}
                  />
                </div>

                {/* Price label */}
                <span
                  style={{
                    color: result.affordable ? "#4ade80" : "#71717a",
                    textAlign: "right",
                    fontVariantNumeric: "tabular-nums",
                    fontWeight: 500,
                  }}
                >
                  {fmtGBP(result.borough.avgPrice)}
                </span>
              </div>
            );
          })}

          {/* Chart legend */}
          <div
            style={{
              display: "flex",
              gap: 16,
              marginTop: 8,
              paddingTop: 8,
              borderTop: "1px solid #27272a",
              fontSize: 11,
              color: "#71717a",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span
                style={{
                  width: 12,
                  height: 3,
                  background: "#a5b4fc",
                  borderRadius: 1,
                  display: "inline-block",
                }}
              />
              Your budget ({fmtGBP(maxPropertyPrice)})
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span
                style={{
                  width: 12,
                  height: 8,
                  background: "#22c55e",
                  borderRadius: 2,
                  display: "inline-block",
                }}
              />
              Affordable
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span
                style={{
                  width: 12,
                  height: 8,
                  background: "#52525b",
                  borderRadius: 2,
                  display: "inline-block",
                }}
              />
              Over budget
            </span>
          </div>
        </div>
      </div>

      {/* ── Borough affordability grid ─────────────────────────────────── */}
      <div style={card}>
        <div style={labelStyle}>Borough Affordability Grid</div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 10,
            marginTop: 8,
          }}
        >
          {boroughResults.map((result) => (
            <BoroughCard key={result.borough.name} result={result} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── StatBox ─────────────────────────────────────────────────────────────────

function StatBox({
  label,
  value,
  highlight,
  warn,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  warn?: boolean;
}) {
  return (
    <div
      style={{
        padding: "12px 14px",
        borderRadius: 8,
        background: highlight
          ? "rgba(99,102,241,0.08)"
          : "rgba(255,255,255,0.02)",
        border: highlight
          ? "1px solid rgba(99,102,241,0.25)"
          : "1px solid rgba(255,255,255,0.04)",
      }}
    >
      <div style={{ fontSize: 11, color: "#71717a", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.04em" }}>
        {label}
      </div>
      <div
        style={{
          fontSize: highlight ? 20 : 16,
          fontWeight: 700,
          fontVariantNumeric: "tabular-nums",
          color: warn ? "#fbbf24" : highlight ? "#a5b4fc" : "#e4e4e7",
        }}
      >
        {value}
      </div>
    </div>
  );
}

// ── BoroughCard ─────────────────────────────────────────────────────────────

function BoroughCard({ result }: { result: BoroughResult }) {
  const { borough, affordable, difference, extraDepositNeeded, extraIncomeNeeded, sdlt } =
    result;

  const tierColor = TIER_COLOR[borough.tier] ?? "#71717a";

  return (
    <div
      style={{
        padding: "14px 16px",
        borderRadius: 8,
        background: affordable
          ? "rgba(34,197,94,0.04)"
          : "rgba(255,255,255,0.02)",
        border: affordable
          ? "1px solid rgba(34,197,94,0.15)"
          : "1px solid rgba(255,255,255,0.06)",
        transition: "border-color 0.15s ease",
      }}
    >
      {/* Header: name + affordable icon */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: affordable ? "#e4e4e7" : "#71717a",
            }}
          >
            {borough.name}
          </div>
          <div
            style={{
              fontSize: 11,
              color: tierColor,
              marginTop: 2,
            }}
          >
            {TIER_LABEL[borough.tier]} -- Zone {borough.zone}
          </div>
        </div>

        {/* Checkmark or X */}
        <span
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: affordable ? "#22c55e" : "#ef4444",
            lineHeight: 1,
          }}
        >
          {affordable ? "\u2713" : "\u2717"}
        </span>
      </div>

      {/* Average price */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 6,
        }}
      >
        <span style={{ fontSize: 12, color: "#71717a" }}>Avg. price</span>
        <span
          style={{
            fontSize: 15,
            fontWeight: 600,
            fontVariantNumeric: "tabular-nums",
            color: affordable ? "#e4e4e7" : "#a1a1aa",
          }}
        >
          {fmtGBP(borough.avgPrice)}
        </span>
      </div>

      {/* SDLT */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 8,
        }}
      >
        <span style={{ fontSize: 12, color: "#71717a" }}>SDLT</span>
        <span
          style={{
            fontSize: 12,
            fontVariantNumeric: "tabular-nums",
            color: "#a1a1aa",
          }}
        >
          {fmtGBP(sdlt)}
        </span>
      </div>

      {/* Badge */}
      {affordable ? (
        <div
          style={{
            display: "inline-block",
            padding: "4px 10px",
            borderRadius: 4,
            background: "rgba(34,197,94,0.12)",
            border: "1px solid rgba(34,197,94,0.25)",
            fontSize: 12,
            fontWeight: 600,
            color: "#4ade80",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {fmtGBP(difference)} under budget
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div
            style={{
              display: "inline-block",
              padding: "4px 10px",
              borderRadius: 4,
              background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.2)",
              fontSize: 12,
              fontWeight: 600,
              color: "#f87171",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {fmtGBP(Math.abs(difference))} over budget
          </div>
          <div style={{ fontSize: 11, color: "#71717a", marginTop: 2, lineHeight: 1.4 }}>
            Need +{fmtGBP(extraDepositNeeded)} deposit or +
            {fmtGBP(extraIncomeNeeded)}/yr income
          </div>
        </div>
      )}
    </div>
  );
}
