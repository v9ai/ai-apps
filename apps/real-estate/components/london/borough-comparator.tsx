"use client";

import { useState, useMemo } from "react";
import {
  BOROUGHS,
  TIER_LABEL,
  TIER_COLOR,
  RENTAL_DATA,
  fmt,
  fmtGBP,
  fmtK,
  computeStampDuty,
  type Borough,
} from "@/lib/london-data";

// ─── Global normalization bounds ──────────────────────────────────────────
const maxPricePerM2 = Math.max(...BOROUGHS.map((b) => b.avgPricePerM2));
const minPricePerM2 = Math.min(...BOROUGHS.map((b) => b.avgPricePerM2));
const maxGrowth = Math.max(...BOROUGHS.map((b) => b.growth1y));
const minGrowth = Math.min(...BOROUGHS.map((b) => b.growth1y));
const maxYieldMid = Math.max(
  ...BOROUGHS.map((b) => (b.yieldLow + b.yieldHigh) / 2),
);
const minYieldMid = Math.min(
  ...BOROUGHS.map((b) => (b.yieldLow + b.yieldHigh) / 2),
);
const maxAvgPrice = Math.max(...BOROUGHS.map((b) => b.avgPrice));
const minAvgPrice = Math.min(...BOROUGHS.map((b) => b.avgPrice));

// ─── Helpers ──────────────────────────────────────────────────────────────

function normalize(value: number, min: number, max: number): number {
  if (max === min) return 0.5;
  return (value - min) / (max - min);
}

function trendColor(trend: Borough["trend"]) {
  if (trend === "rising") return "#22c55e";
  if (trend === "stable") return "#3b82f6";
  return "#ef4444";
}

function trendLabel(trend: Borough["trend"]) {
  if (trend === "rising") return "Rising";
  if (trend === "stable") return "Stable";
  return "Declining";
}

function findRentalData(boroughName: string) {
  return RENTAL_DATA.find((r) => {
    const areaLower = r.area.toLowerCase();
    const nameLower = boroughName.toLowerCase();
    return (
      areaLower.includes(nameLower) ||
      nameLower.includes(areaLower.split(" / ")[0]) ||
      nameLower.includes(areaLower.split(" / ")[1] ?? "")
    );
  });
}

function estimateMonthlyRent1br(b: Borough): number {
  const rental = findRentalData(b.name);
  if (rental) return (rental.r1Low + rental.r1High) / 2;
  // Estimate from mid-yield
  const midYield = (b.yieldLow + b.yieldHigh) / 2 / 100;
  return Math.round((b.avgPrice * midYield) / 12);
}

function computeInvestmentScore(b: Borough): number {
  const midYield = (b.yieldLow + b.yieldHigh) / 2;
  const growthNorm = normalize(b.growth1y, minGrowth, maxGrowth);
  const yieldNorm = normalize(midYield, minYieldMid, maxYieldMid);
  // Affordability: lower price = higher score
  const affordNorm = 1 - normalize(b.avgPricePerM2, minPricePerM2, maxPricePerM2);
  return Math.round((growthNorm * 0.35 + yieldNorm * 0.35 + affordNorm * 0.3) * 100) / 10;
}

function priceToRentRatio(b: Borough): number {
  const monthlyRent = estimateMonthlyRent1br(b);
  const annualRent = monthlyRent * 12;
  if (annualRent === 0) return 0;
  return Math.round((b.avgPrice / annualRent) * 10) / 10;
}

// ─── Types ────────────────────────────────────────────────────────────────

type WinnerMode = "lower" | "higher" | "none";

type MetricRow = {
  label: string;
  valueA: string;
  valueB: string;
  rawA: number;
  rawB: number;
  winner: WinnerMode; // "lower" = lower is better, "higher" = higher is better, "none" = informational
};

// ─── Styles ───────────────────────────────────────────────────────────────

const card: React.CSSProperties = {
  background: "rgba(255,255,255,0.02)",
  border: "1px solid rgba(255,255,255,0.06)",
  borderRadius: 16,
  padding: 24,
  maxWidth: 880,
  margin: "0 auto",
};

const selectStyle: React.CSSProperties = {
  flex: 1,
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.1)",
  background: "rgba(255,255,255,0.04)",
  color: "var(--gray-12)",
  fontSize: 14,
  fontWeight: 500,
  outline: "none",
  cursor: "pointer",
  appearance: "none",
  backgroundImage:
    'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23a1a1aa\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'%3E%3C/polyline%3E%3C/svg%3E")',
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 12px center",
  paddingRight: 36,
};

const swapBtn: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: 40,
  height: 40,
  borderRadius: "50%",
  border: "1px solid rgba(255,255,255,0.1)",
  background: "rgba(99,102,241,0.1)",
  color: "#a5b4fc",
  cursor: "pointer",
  fontSize: 18,
  fontWeight: 700,
  transition: "all 0.2s ease",
  flexShrink: 0,
};

// ─── Component ────────────────────────────────────────────────────────────

export function BoroughComparator() {
  const [nameA, setNameA] = useState("Hackney");
  const [nameB, setNameB] = useState("Greenwich");

  const boroughA = useMemo(
    () => BOROUGHS.find((b) => b.name === nameA)!,
    [nameA],
  );
  const boroughB = useMemo(
    () => BOROUGHS.find((b) => b.name === nameB)!,
    [nameB],
  );

  const swap = () => {
    setNameA(nameB);
    setNameB(nameA);
  };

  // ── Compute all metrics ─────────────────────────────────────────────

  const metrics: MetricRow[] = useMemo(() => {
    const rentA = estimateMonthlyRent1br(boroughA);
    const rentB = estimateMonthlyRent1br(boroughB);
    const stampA = computeStampDuty(boroughA.avgPrice);
    const stampB = computeStampDuty(boroughB.avgPrice);
    const p2rA = priceToRentRatio(boroughA);
    const p2rB = priceToRentRatio(boroughB);
    const scoreA = computeInvestmentScore(boroughA);
    const scoreB = computeInvestmentScore(boroughB);
    const yieldMidA = (boroughA.yieldLow + boroughA.yieldHigh) / 2;
    const yieldMidB = (boroughB.yieldLow + boroughB.yieldHigh) / 2;

    return [
      {
        label: "Avg Price/m\u00B2",
        valueA: `\u00A3${fmt(boroughA.avgPricePerM2)}`,
        valueB: `\u00A3${fmt(boroughB.avgPricePerM2)}`,
        rawA: boroughA.avgPricePerM2,
        rawB: boroughB.avgPricePerM2,
        winner: "lower",
      },
      {
        label: "Avg Total Price",
        valueA: fmtK(boroughA.avgPrice),
        valueB: fmtK(boroughB.avgPrice),
        rawA: boroughA.avgPrice,
        rawB: boroughB.avgPrice,
        winner: "none",
      },
      {
        label: "Yield Range",
        valueA: `${boroughA.yieldLow.toFixed(1)}\u2013${boroughA.yieldHigh.toFixed(1)}%`,
        valueB: `${boroughB.yieldLow.toFixed(1)}\u2013${boroughB.yieldHigh.toFixed(1)}%`,
        rawA: yieldMidA,
        rawB: yieldMidB,
        winner: "higher",
      },
      {
        label: "Growth 1Y",
        valueA: `${boroughA.growth1y >= 0 ? "+" : ""}${boroughA.growth1y.toFixed(1)}%`,
        valueB: `${boroughB.growth1y >= 0 ? "+" : ""}${boroughB.growth1y.toFixed(1)}%`,
        rawA: boroughA.growth1y,
        rawB: boroughB.growth1y,
        winner: "higher",
      },
      {
        label: "Estimated Rent (1br)",
        valueA: `\u00A3${fmt(rentA)}/mo`,
        valueB: `\u00A3${fmt(rentB)}/mo`,
        rawA: rentA,
        rawB: rentB,
        winner: "higher",
      },
      {
        label: "Stamp Duty (avg price)",
        valueA: fmtGBP(stampA),
        valueB: fmtGBP(stampB),
        rawA: stampA,
        rawB: stampB,
        winner: "lower",
      },
      {
        label: "Price-to-Rent Ratio",
        valueA: `${p2rA}x`,
        valueB: `${p2rB}x`,
        rawA: p2rA,
        rawB: p2rB,
        winner: "lower",
      },
      {
        label: "Investment Score",
        valueA: `${scoreA.toFixed(1)} / 10`,
        valueB: `${scoreB.toFixed(1)} / 10`,
        rawA: scoreA,
        rawB: scoreB,
        winner: "higher",
      },
    ];
  }, [boroughA, boroughB]);

  const scoreA = computeInvestmentScore(boroughA);
  const scoreB = computeInvestmentScore(boroughB);

  // ── Winner logic for a metric ───────────────────────────────────────

  function isWinnerA(row: MetricRow): boolean {
    if (row.winner === "none") return false;
    if (row.winner === "lower") return row.rawA < row.rawB;
    return row.rawA > row.rawB;
  }

  function isWinnerB(row: MetricRow): boolean {
    if (row.winner === "none") return false;
    if (row.winner === "lower") return row.rawB < row.rawA;
    return row.rawB > row.rawA;
  }

  // ── Render ──────────────────────────────────────────────────────────

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* ── Controls ────────────────────────────────────────────────── */}
      <div style={card}>
        <h3
          style={{
            margin: 0,
            marginBottom: 4,
            fontSize: 18,
            fontWeight: 700,
            color: "var(--gray-12)",
          }}
        >
          Borough Head-to-Head
        </h3>
        <p
          style={{
            margin: 0,
            marginBottom: 20,
            fontSize: 13,
            color: "var(--gray-9)",
          }}
        >
          Select two boroughs to compare across all investment metrics.
        </p>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          {/* Borough A */}
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: "#8b5cf6",
                marginBottom: 6,
              }}
            >
              Borough A
            </div>
            <select
              value={nameA}
              onChange={(e) => setNameA(e.target.value)}
              style={selectStyle}
            >
              {BOROUGHS.map((b) => (
                <option key={b.name} value={b.name}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Swap button */}
          <button
            type="button"
            onClick={swap}
            style={swapBtn}
            title="Swap boroughs"
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(99,102,241,0.25)";
              e.currentTarget.style.borderColor = "rgba(99,102,241,0.4)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(99,102,241,0.1)";
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
            }}
          >
            &#8596;
          </button>

          {/* Borough B */}
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: "#22c55e",
                marginBottom: 6,
              }}
            >
              Borough B
            </div>
            <select
              value={nameB}
              onChange={(e) => setNameB(e.target.value)}
              style={selectStyle}
            >
              {BOROUGHS.map((b) => (
                <option key={b.name} value={b.name}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── Tier + Zone + Trend badges ──────────────────────────────── */}
      <div style={card}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto 1fr",
            gap: 16,
            alignItems: "center",
          }}
        >
          {/* Borough A badges */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: "var(--gray-12)",
              }}
            >
              {boroughA.name}
            </span>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
              <Badge color={TIER_COLOR[boroughA.tier]}>
                {TIER_LABEL[boroughA.tier]}
              </Badge>
              <Badge color="#71717a">Zone {boroughA.zone}</Badge>
              <Badge color={trendColor(boroughA.trend)}>
                {trendLabel(boroughA.trend)}
              </Badge>
            </div>
          </div>

          {/* VS divider */}
          <div
            style={{
              fontSize: 13,
              fontWeight: 800,
              color: "var(--gray-7)",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            vs
          </div>

          {/* Borough B badges */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: "var(--gray-12)",
              }}
            >
              {boroughB.name}
            </span>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
              <Badge color={TIER_COLOR[boroughB.tier]}>
                {TIER_LABEL[boroughB.tier]}
              </Badge>
              <Badge color="#71717a">Zone {boroughB.zone}</Badge>
              <Badge color={trendColor(boroughB.trend)}>
                {trendLabel(boroughB.trend)}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* ── Metric comparison rows ──────────────────────────────────── */}
      <div style={card}>
        <div
          style={{
            borderRadius: 12,
            overflow: "hidden",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          {metrics.map((row, i) => {
            const winA = isWinnerA(row);
            const winB = isWinnerB(row);
            const maxRaw = Math.max(row.rawA, row.rawB);
            const barWidthA = maxRaw > 0 ? (row.rawA / maxRaw) * 100 : 0;
            const barWidthB = maxRaw > 0 ? (row.rawB / maxRaw) * 100 : 0;

            return (
              <div
                key={row.label}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 160px 1fr",
                  gap: 0,
                  padding: "14px 16px",
                  background:
                    i % 2 === 0
                      ? "rgba(255,255,255,0.02)"
                      : "transparent",
                  borderBottom:
                    i < metrics.length - 1
                      ? "1px solid rgba(255,255,255,0.04)"
                      : "none",
                  alignItems: "center",
                }}
              >
                {/* Borough A value + bar */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-end",
                    gap: 6,
                  }}
                >
                  <span
                    style={{
                      fontSize: 15,
                      fontWeight: 700,
                      fontVariantNumeric: "tabular-nums",
                      color: winA ? "#22c55e" : "var(--gray-12)",
                      textAlign: "right",
                    }}
                  >
                    {row.valueA}
                    {winA && (
                      <span
                        style={{
                          marginLeft: 6,
                          fontSize: 10,
                          fontWeight: 800,
                          color: "#22c55e",
                          verticalAlign: "middle",
                        }}
                      >
                        &#10003;
                      </span>
                    )}
                  </span>
                  {/* Bar (right-aligned, grows leftward) */}
                  <div
                    style={{
                      width: "100%",
                      height: 6,
                      borderRadius: 3,
                      background: "rgba(255,255,255,0.06)",
                      overflow: "hidden",
                      display: "flex",
                      justifyContent: "flex-end",
                    }}
                  >
                    <div
                      style={{
                        width: `${barWidthA}%`,
                        height: "100%",
                        borderRadius: 3,
                        background: winA
                          ? "linear-gradient(90deg, rgba(34,197,94,0.3), #22c55e)"
                          : "linear-gradient(90deg, rgba(139,92,246,0.3), #8b5cf6)",
                        transition: "width 0.4s ease",
                      }}
                    />
                  </div>
                </div>

                {/* Metric label (center) */}
                <div
                  style={{
                    textAlign: "center",
                    fontSize: 11,
                    fontWeight: 600,
                    color: "var(--gray-9)",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    lineHeight: 1.3,
                    padding: "0 8px",
                  }}
                >
                  {row.label}
                  {row.winner !== "none" && (
                    <div
                      style={{
                        fontSize: 9,
                        fontWeight: 400,
                        color: "var(--gray-7)",
                        marginTop: 2,
                        textTransform: "none",
                        letterSpacing: 0,
                      }}
                    >
                      {row.winner === "lower" ? "lower is better" : "higher is better"}
                    </div>
                  )}
                </div>

                {/* Borough B value + bar */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    gap: 6,
                  }}
                >
                  <span
                    style={{
                      fontSize: 15,
                      fontWeight: 700,
                      fontVariantNumeric: "tabular-nums",
                      color: winB ? "#22c55e" : "var(--gray-12)",
                      textAlign: "left",
                    }}
                  >
                    {winB && (
                      <span
                        style={{
                          marginRight: 6,
                          fontSize: 10,
                          fontWeight: 800,
                          color: "#22c55e",
                          verticalAlign: "middle",
                        }}
                      >
                        &#10003;
                      </span>
                    )}
                    {row.valueB}
                  </span>
                  {/* Bar (left-aligned, grows rightward) */}
                  <div
                    style={{
                      width: "100%",
                      height: 6,
                      borderRadius: 3,
                      background: "rgba(255,255,255,0.06)",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${barWidthB}%`,
                        height: "100%",
                        borderRadius: 3,
                        background: winB
                          ? "linear-gradient(270deg, rgba(34,197,94,0.3), #22c55e)"
                          : "linear-gradient(270deg, rgba(34,197,94,0.15), #22c55e40)",
                        transition: "width 0.4s ease",
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Verdict ─────────────────────────────────────────────────── */}
      <div style={card}>
        <div
          style={{
            textAlign: "center",
            padding: "8px 0",
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: "var(--gray-8)",
              marginBottom: 12,
            }}
          >
            Better for Investment
          </div>

          {scoreA === scoreB ? (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                padding: "12px 24px",
                borderRadius: 12,
                background: "rgba(59,130,246,0.1)",
                border: "1px solid rgba(59,130,246,0.25)",
              }}
            >
              <span
                style={{
                  fontSize: 20,
                  fontWeight: 800,
                  color: "#3b82f6",
                }}
              >
                &#8596;
              </span>
              <span
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: "#93c5fd",
                }}
              >
                It&apos;s a tie!
              </span>
            </div>
          ) : (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 28px",
                borderRadius: 12,
                background: "rgba(34,197,94,0.08)",
                border: "1px solid rgba(34,197,94,0.2)",
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: "rgba(34,197,94,0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 18,
                  color: "#22c55e",
                  fontWeight: 800,
                }}
              >
                &#10003;
              </div>
              <div style={{ textAlign: "left" }}>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 800,
                    color: "#22c55e",
                    lineHeight: 1.2,
                  }}
                >
                  {scoreA > scoreB ? boroughA.name : boroughB.name}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--gray-9)",
                    marginTop: 2,
                  }}
                >
                  Investment score{" "}
                  <span
                    style={{
                      fontWeight: 700,
                      color: "#4ade80",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {Math.max(scoreA, scoreB).toFixed(1)}
                  </span>
                  {" vs "}
                  <span
                    style={{
                      fontWeight: 700,
                      color: "var(--gray-10)",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {Math.min(scoreA, scoreB).toFixed(1)}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div
            style={{
              marginTop: 16,
              fontSize: 11,
              color: "var(--gray-7)",
              lineHeight: 1.6,
            }}
          >
            Score = (growth &times; 0.35) + (yield &times; 0.35) +
            (affordability &times; 0.30), normalized 0-10.
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Badge sub-component ──────────────────────────────────────────────────

function Badge({
  color,
  children,
}: {
  color: string;
  children: React.ReactNode;
}) {
  return (
    <span
      style={{
        display: "inline-block",
        fontSize: 11,
        fontWeight: 700,
        padding: "2px 10px",
        borderRadius: 9999,
        background: `${color}1a`,
        color,
        border: `1px solid ${color}33`,
        letterSpacing: "0.02em",
        lineHeight: "18px",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}
