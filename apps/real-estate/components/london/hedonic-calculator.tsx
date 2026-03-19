"use client";

import { useState, useMemo } from "react";
import {
  BOROUGHS,
  HEDONIC_FACTORS,
  fmtGBP,
  computeStampDuty,
  computeStampDutyFTB,
} from "@/lib/london-data";

// ── Types & constants ──────────────────────────────────────────────────────

type Condition = "new_build" | "refurbished" | "good" | "needs_work";

const CONDITIONS: { key: Condition; label: string }[] = [
  { key: "new_build", label: "New build" },
  { key: "refurbished", label: "Refurbished" },
  { key: "good", label: "Good" },
  { key: "needs_work", label: "Needs work" },
];

const CONDITION_ADJ: Record<Condition, number> = {
  new_build: 20,    // midpoint of +15 to +25%
  refurbished: 7.5, // midpoint of +5 to +10%
  good: 0,
  needs_work: -20,  // midpoint of -15 to -25%
};

type FeatureToggle = {
  key: string;
  label: string;
  pct: number;
};

const FEATURE_TOGGLES: FeatureToggle[] = [
  { key: "high_floor", label: "High floor (10+)", pct: 7.5 },
  { key: "garden", label: "Garden", pct: 7.5 },
  { key: "balcony", label: "Balcony / terrace", pct: 3.5 },
  { key: "epc_ab", label: "EPC A-B rating", pct: 4 },
  { key: "period", label: "Period property", pct: 7.5 },
  { key: "tube_500m", label: "Tube within 500m", pct: 8 },
];

const LEGAL_FEES = 3_000;

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

// ── Component ──────────────────────────────────────────────────────────────

export function HedonicCalculator() {
  const [boroughName, setBoroughName] = useState("Tower Hamlets");
  const [sizeM2, setSizeM2] = useState(65);
  const [condition, setCondition] = useState<Condition>("good");
  const [features, setFeatures] = useState<Record<string, boolean>>({});

  const borough = useMemo(
    () => BOROUGHS.find((b) => b.name === boroughName) ?? BOROUGHS[0],
    [boroughName],
  );

  const toggleFeature = (key: string) =>
    setFeatures((prev) => ({ ...prev, [key]: !prev[key] }));

  // ── Computed values ────────────────────────────────────────────────────

  const calc = useMemo(() => {
    const basePrice = borough.avgPricePerM2 * sizeM2;

    const condPct = CONDITION_ADJ[condition];
    const condAmount = Math.round(basePrice * (condPct / 100));

    const featureRows: { label: string; pct: number; amount: number }[] = [];
    for (const f of FEATURE_TOGGLES) {
      if (features[f.key]) {
        const amount = Math.round(basePrice * (f.pct / 100));
        featureRows.push({ label: f.label, pct: f.pct, amount });
      }
    }

    const totalFeatureAmount = featureRows.reduce((s, r) => s + r.amount, 0);
    const adjustedPrice = basePrice + condAmount + totalFeatureAmount;
    const pricePerM2 = Math.round(adjustedPrice / sizeM2);

    const stampDuty = computeStampDuty(adjustedPrice);
    const stampDutyFTB = computeStampDutyFTB(adjustedPrice);
    const totalAcquisition = adjustedPrice + stampDuty + LEGAL_FEES;

    const yieldMid = (borough.yieldLow + borough.yieldHigh) / 2 / 100;
    const monthlyRent = Math.round((adjustedPrice * yieldMid) / 12);
    const grossYield = ((borough.yieldLow + borough.yieldHigh) / 2).toFixed(1);

    // Waterfall rows: base + condition + each feature + total
    const waterfall: {
      label: string;
      delta: number;
      running: number;
      isTotal?: boolean;
    }[] = [];

    waterfall.push({
      label: `Base (${borough.name}, ${sizeM2} m\u00B2)`,
      delta: basePrice,
      running: basePrice,
    });

    if (condPct !== 0) {
      waterfall.push({
        label: `Condition: ${CONDITIONS.find((c) => c.key === condition)?.label}`,
        delta: condAmount,
        running: basePrice + condAmount,
      });
    }

    let runningTotal = basePrice + condAmount;
    for (const row of featureRows) {
      runningTotal += row.amount;
      waterfall.push({
        label: row.label,
        delta: row.amount,
        running: runningTotal,
      });
    }

    waterfall.push({
      label: "Total adjusted price",
      delta: 0,
      running: adjustedPrice,
      isTotal: true,
    });

    return {
      basePrice,
      condPct,
      condAmount,
      featureRows,
      adjustedPrice,
      pricePerM2,
      stampDuty,
      stampDutyFTB,
      totalAcquisition,
      monthlyRent,
      grossYield,
      waterfall,
    };
  }, [borough, sizeM2, condition, features]);

  // ── Waterfall scale ────────────────────────────────────────────────────

  const maxRunning = Math.max(...calc.waterfall.map((r) => r.running));

  // ── Render ─────────────────────────────────────────────────────────────

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
        Hedonic Price Calculator
      </h3>

      {/* ── Borough selector ─────────────────────────────────────────── */}
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Borough</label>
        <select
          value={boroughName}
          onChange={(e) => setBoroughName(e.target.value)}
          style={{ ...inputStyle, cursor: "pointer", appearance: "auto" }}
        >
          {BOROUGHS.map((b) => (
            <option key={b.name} value={b.name}>
              {b.name} -- {fmtGBP(b.avgPricePerM2)}/m\u00B2
            </option>
          ))}
        </select>
      </div>

      {/* ── Size input ───────────────────────────────────────────────── */}
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Size (m\u00B2)</label>
        <input
          type="number"
          min={10}
          max={500}
          value={sizeM2}
          onChange={(e) => setSizeM2(Math.max(1, Number(e.target.value)))}
          style={{ ...inputStyle, maxWidth: 140 }}
        />
      </div>

      <div style={sectionDivider} />

      {/* ── Condition selector (segmented control) ───────────────────── */}
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Condition</label>
        <div style={{ display: "flex", gap: 0, borderRadius: 6, overflow: "hidden" }}>
          {CONDITIONS.map((c) => {
            const active = condition === c.key;
            return (
              <button
                key={c.key}
                onClick={() => setCondition(c.key)}
                style={{
                  flex: 1,
                  padding: "8px 4px",
                  fontSize: 13,
                  fontFamily: "inherit",
                  border: "1px solid #3f3f46",
                  borderRight: "none",
                  cursor: "pointer",
                  backgroundColor: active ? "#6366f1" : "#18181b",
                  color: active ? "#fff" : "#a1a1aa",
                  fontWeight: active ? 600 : 400,
                  transition: "background-color 150ms, color 150ms",
                }}
              >
                {c.label}
              </button>
            );
          })}
          {/* close the right border on last button */}
          <style>{`
            div > button:last-child { border-right: 1px solid #3f3f46 !important; }
          `}</style>
        </div>
        {calc.condPct !== 0 && (
          <span style={{ fontSize: 12, color: "#71717a", marginTop: 4, display: "block" }}>
            {calc.condPct > 0 ? "+" : ""}
            {calc.condPct}% adjustment
          </span>
        )}
      </div>

      <div style={sectionDivider} />

      {/* ── Feature toggles ──────────────────────────────────────────── */}
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Feature adjustments</label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px" }}>
          {FEATURE_TOGGLES.map((f) => (
            <label
              key={f.key}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                cursor: "pointer",
                fontSize: 13,
                color: features[f.key] ? "#e4e4e7" : "#71717a",
              }}
            >
              <input
                type="checkbox"
                checked={!!features[f.key]}
                onChange={() => toggleFeature(f.key)}
                style={{ accentColor: "#6366f1" }}
              />
              {f.label}
              <span style={{ color: "#6366f1", fontSize: 12, marginLeft: "auto" }}>
                +{f.pct}%
              </span>
            </label>
          ))}
        </div>
      </div>

      <div style={sectionDivider} />

      {/* ── Output panel ─────────────────────────────────────────────── */}
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
          Valuation Summary
        </h4>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 24px" }}>
          <Row label="Base price" value={fmtGBP(calc.basePrice)} />
          <Row
            label="Condition adj."
            value={`${calc.condPct >= 0 ? "+" : ""}${calc.condPct}% (${calc.condAmount >= 0 ? "+" : ""}${fmtGBP(Math.abs(calc.condAmount))})`}
            muted={calc.condPct === 0}
          />
          {calc.featureRows.map((r) => (
            <Row
              key={r.label}
              label={r.label}
              value={`+${r.pct}% (+${fmtGBP(r.amount)})`}
            />
          ))}
        </div>

        {/* Total price -- large, accent */}
        <div
          style={{
            marginTop: 20,
            paddingTop: 16,
            borderTop: "1px solid #3f3f46",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
          }}
        >
          <span style={{ fontSize: 14, color: "#a1a1aa" }}>Total adjusted price</span>
          <span
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: "#818cf8",
              letterSpacing: "-0.02em",
            }}
          >
            {fmtGBP(calc.adjustedPrice)}
          </span>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "10px 24px",
            marginTop: 16,
          }}
        >
          <Row label="Price per m\u00B2" value={fmtGBP(calc.pricePerM2)} />
          <Row label="Stamp duty (standard)" value={fmtGBP(calc.stampDuty)} />
          <Row label="Stamp duty (FTB)" value={fmtGBP(calc.stampDutyFTB)} />
          <Row
            label="Total acquisition cost"
            value={fmtGBP(calc.totalAcquisition)}
            highlight
          />
          <Row label="Est. monthly rent" value={fmtGBP(calc.monthlyRent)} />
          <Row label="Gross yield (mid)" value={`${calc.grossYield}%`} />
        </div>
      </div>

      <div style={sectionDivider} />

      {/* ── Waterfall breakdown ──────────────────────────────────────── */}
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
          Price Breakdown
        </h4>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {calc.waterfall.map((row, i) => {
            const barWidth = (row.running / maxRunning) * 100;
            const isNeg = row.delta < 0;
            const isBase = i === 0;

            return (
              <div
                key={row.label}
                style={{
                  display: "grid",
                  gridTemplateColumns: "180px 90px 1fr 90px",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 12,
                }}
              >
                {/* Label */}
                <span
                  style={{
                    color: row.isTotal ? "#818cf8" : "#d4d4d8",
                    fontWeight: row.isTotal ? 700 : 400,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {row.label}
                </span>

                {/* Delta */}
                <span
                  style={{
                    color: isBase
                      ? "#71717a"
                      : row.isTotal
                        ? "#818cf8"
                        : isNeg
                          ? "#f87171"
                          : "#4ade80",
                    textAlign: "right",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {row.isTotal
                    ? ""
                    : isBase
                      ? fmtGBP(row.delta)
                      : `${isNeg ? "-" : "+"}${fmtGBP(Math.abs(row.delta))}`}
                </span>

                {/* Bar */}
                <div
                  style={{
                    height: 16,
                    backgroundColor: "#1c1c1f",
                    borderRadius: 3,
                    overflow: "hidden",
                    position: "relative",
                  }}
                >
                  <div
                    style={{
                      width: `${barWidth}%`,
                      height: "100%",
                      borderRadius: 3,
                      background: row.isTotal
                        ? "linear-gradient(90deg, #6366f1, #818cf8)"
                        : isBase
                          ? "#3f3f46"
                          : isNeg
                            ? "#ef4444"
                            : "#22c55e",
                      transition: "width 300ms ease",
                    }}
                  />
                </div>

                {/* Running total */}
                <span
                  style={{
                    color: row.isTotal ? "#818cf8" : "#a1a1aa",
                    textAlign: "right",
                    fontWeight: row.isTotal ? 700 : 400,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {fmtGBP(row.running)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Helper row component ───────────────────────────────────────────────────

function Row({
  label,
  value,
  muted,
  highlight,
}: {
  label: string;
  value: string;
  muted?: boolean;
  highlight?: boolean;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
      <span style={{ fontSize: 13, color: muted ? "#52525b" : "#a1a1aa" }}>{label}</span>
      <span
        style={{
          fontSize: 14,
          fontWeight: highlight ? 600 : 400,
          color: highlight ? "#c7d2fe" : muted ? "#52525b" : "#e4e4e7",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </span>
    </div>
  );
}
