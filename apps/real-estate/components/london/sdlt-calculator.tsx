"use client";

import { useState, useMemo } from "react";
import {
  STAMP_DUTY_BANDS,
  computeStampDuty,
  computeStampDutyFTB,
  fmtGBP,
} from "@/lib/london-data";

// ─── Types ──────────────────────────────────────────────────────────────────

type BuyerType = "standard" | "ftb" | "additional";

type BandBreakdown = {
  label: string;
  from: number;
  to: number | null; // null = uncapped
  rate: number; // percentage
  taxable: number;
  tax: number;
  runningTotal: number;
  active: boolean;
};

// ─── Constants ──────────────────────────────────────────────────────────────

const SOLICITOR_SURVEY_FEES = 3_000;

const BUYER_OPTIONS: { value: BuyerType; label: string; sub: string }[] = [
  { value: "standard", label: "Standard", sub: "Moving home" },
  { value: "ftb", label: "First-Time Buyer", sub: "FTB relief" },
  { value: "additional", label: "Additional Property", sub: "+5% surcharge" },
];

// Standard SDLT thresholds
const STANDARD_BANDS = [
  { from: 0, to: 250_000, rate: 0 },
  { from: 250_000, to: 925_000, rate: 5 },
  { from: 925_000, to: 1_500_000, rate: 10 },
  { from: 1_500_000, to: null as number | null, rate: 12 },
];

// First-time buyer bands (up to 625K eligible)
const FTB_BANDS = [
  { from: 0, to: 425_000, rate: 0 },
  { from: 425_000, to: 625_000, rate: 5 },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatBandRange(from: number, to: number | null): string {
  if (from === 0 && to !== null) return `Up to ${fmtGBP(to)}`;
  if (to === null) return `Over ${fmtGBP(from)}`;
  return `${fmtGBP(from + 1)} - ${fmtGBP(to)}`;
}

function buildBreakdown(price: number, buyerType: BuyerType): BandBreakdown[] {
  const useFTB = buyerType === "ftb" && price <= 625_000;
  const bands = useFTB ? FTB_BANDS : STANDARD_BANDS;
  const rows: BandBreakdown[] = [];
  let running = 0;

  for (const band of bands) {
    const upper = band.to ?? Infinity;
    const active = price > band.from;
    const taxable = active ? Math.min(price, upper) - band.from : 0;
    const tax = Math.round(taxable * (band.rate / 100));
    running += tax;

    rows.push({
      label: formatBandRange(band.from, band.to),
      from: band.from,
      to: band.to,
      rate: band.rate,
      taxable,
      tax,
      runningTotal: running,
      active,
    });
  }

  // Additional property surcharge row
  if (buyerType === "additional") {
    const tax = Math.round(price * 0.05);
    running += tax;
    rows.push({
      label: "Additional property surcharge",
      from: 0,
      to: null,
      rate: 5,
      taxable: price,
      tax,
      runningTotal: running,
      active: true,
    });
  }

  return rows;
}

function computeTotal(
  price: number,
  buyerType: BuyerType,
  nonResident: boolean,
): number {
  let duty: number;
  if (buyerType === "ftb") {
    duty = computeStampDutyFTB(price);
  } else {
    duty = computeStampDuty(price, buyerType === "additional", false);
  }
  if (nonResident) duty += Math.round(price * 0.02);
  return duty;
}

// ─── Styles ─────────────────────────────────────────────────────────────────

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
});

// ─── Component ──────────────────────────────────────────────────────────────

export function SDLTCalculator() {
  const [price, setPrice] = useState(450_000);
  const [buyerType, setBuyerType] = useState<BuyerType>("standard");
  const [nonResident, setNonResident] = useState(false);

  const breakdown = useMemo(
    () => buildBreakdown(price, buyerType),
    [price, buyerType],
  );

  const totalSDLT = useMemo(
    () => computeTotal(price, buyerType, nonResident),
    [price, buyerType, nonResident],
  );

  const nonResidentSurcharge = useMemo(
    () => (nonResident ? Math.round(price * 0.02) : 0),
    [price, nonResident],
  );

  const effectiveRate = useMemo(
    () => (price > 0 ? (totalSDLT / price) * 100 : 0),
    [totalSDLT, price],
  );

  const totalAcquisition = price + totalSDLT + SOLICITOR_SURVEY_FEES;

  // Format input display value
  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, "");
    const num = parseInt(raw, 10);
    setPrice(isNaN(num) ? 0 : num);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* ─── Price input ───────────────────────────────────────────── */}
      <div style={card}>
        <div style={labelStyle}>Purchase Price</div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 0,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 8,
            overflow: "hidden",
          }}
        >
          <span
            style={{
              padding: "12px 14px",
              fontSize: 22,
              fontWeight: 700,
              color: "var(--gray-9)",
              background: "rgba(255,255,255,0.03)",
              borderRight: "1px solid rgba(255,255,255,0.06)",
              lineHeight: 1,
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
              padding: "12px 14px",
              fontSize: 22,
              fontWeight: 700,
              fontVariantNumeric: "tabular-nums",
              color: "var(--gray-12)",
              background: "transparent",
              border: "none",
              outline: "none",
              fontFamily: "inherit",
            }}
          />
        </div>
      </div>

      {/* ─── Buyer type toggle ─────────────────────────────────────── */}
      <div style={card}>
        <div style={labelStyle}>Buyer Type</div>
        <div style={{ display: "flex", gap: 8 }}>
          {BUYER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setBuyerType(opt.value)}
              style={segmentBtn(buyerType === opt.value)}
            >
              <div>{opt.label}</div>
              <div
                style={{
                  fontSize: 11,
                  opacity: 0.6,
                  marginTop: 2,
                  fontWeight: 400,
                }}
              >
                {opt.sub}
              </div>
            </button>
          ))}
        </div>

        {/* ─── Non-UK resident checkbox ──────────────────────────── */}
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginTop: 14,
            cursor: "pointer",
            fontSize: 13,
            color: "var(--gray-11)",
          }}
        >
          <input
            type="checkbox"
            checked={nonResident}
            onChange={(e) => setNonResident(e.target.checked)}
            style={{
              width: 16,
              height: 16,
              accentColor: "#6366f1",
              cursor: "pointer",
            }}
          />
          Non-UK resident (+2% surcharge)
        </label>
      </div>

      {/* ─── Breakdown table ───────────────────────────────────────── */}
      <div style={card}>
        <div style={labelStyle}>SDLT Breakdown</div>
        <div
          style={{
            borderRadius: 8,
            overflow: "hidden",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.6fr 0.6fr 0.8fr 0.8fr",
              gap: 0,
              padding: "8px 12px",
              background: "rgba(255,255,255,0.03)",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <span style={{ fontSize: 11, color: "var(--gray-9)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.04em" }}>Band</span>
            <span style={{ fontSize: 11, color: "var(--gray-9)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.04em", textAlign: "right" }}>Rate</span>
            <span style={{ fontSize: 11, color: "var(--gray-9)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.04em", textAlign: "right" }}>Tax</span>
            <span style={{ fontSize: 11, color: "var(--gray-9)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.04em", textAlign: "right" }}>Running Total</span>
          </div>

          {/* Band rows */}
          {breakdown.map((row, i) => (
            <div
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: "1.6fr 0.6fr 0.8fr 0.8fr",
                gap: 0,
                padding: "8px 12px",
                background: row.active
                  ? "rgba(99,102,241,0.06)"
                  : "transparent",
                borderBottom:
                  i < breakdown.length - 1
                    ? "1px solid rgba(255,255,255,0.04)"
                    : "none",
                borderLeft: row.active
                  ? "2px solid #6366f1"
                  : "2px solid transparent",
                transition: "background 0.15s ease",
              }}
            >
              <span
                style={{
                  fontSize: 13,
                  color: row.active ? "var(--gray-12)" : "var(--gray-8)",
                  fontWeight: row.active ? 500 : 400,
                }}
              >
                {row.label}
              </span>
              <span
                style={{
                  fontSize: 13,
                  fontVariantNumeric: "tabular-nums",
                  textAlign: "right",
                  color: row.active ? "var(--gray-12)" : "var(--gray-8)",
                  fontWeight: row.active ? 600 : 400,
                }}
              >
                {row.rate}%
              </span>
              <span
                style={{
                  fontSize: 13,
                  fontVariantNumeric: "tabular-nums",
                  textAlign: "right",
                  color: row.active
                    ? row.tax > 0
                      ? "#a5b4fc"
                      : "var(--gray-9)"
                    : "var(--gray-7)",
                  fontWeight: row.tax > 0 ? 600 : 400,
                }}
              >
                {fmtGBP(row.tax)}
              </span>
              <span
                style={{
                  fontSize: 13,
                  fontVariantNumeric: "tabular-nums",
                  textAlign: "right",
                  color: row.active ? "var(--gray-11)" : "var(--gray-7)",
                }}
              >
                {fmtGBP(row.runningTotal)}
              </span>
            </div>
          ))}

          {/* Non-resident surcharge row */}
          {nonResident && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.6fr 0.6fr 0.8fr 0.8fr",
                gap: 0,
                padding: "8px 12px",
                background: "rgba(245,158,11,0.06)",
                borderTop: "1px solid rgba(255,255,255,0.04)",
                borderLeft: "2px solid #f59e0b",
              }}
            >
              <span style={{ fontSize: 13, color: "var(--gray-12)", fontWeight: 500 }}>
                Non-UK resident surcharge
              </span>
              <span
                style={{
                  fontSize: 13,
                  fontVariantNumeric: "tabular-nums",
                  textAlign: "right",
                  color: "var(--gray-12)",
                  fontWeight: 600,
                }}
              >
                2%
              </span>
              <span
                style={{
                  fontSize: 13,
                  fontVariantNumeric: "tabular-nums",
                  textAlign: "right",
                  color: "#fbbf24",
                  fontWeight: 600,
                }}
              >
                {fmtGBP(nonResidentSurcharge)}
              </span>
              <span
                style={{
                  fontSize: 13,
                  fontVariantNumeric: "tabular-nums",
                  textAlign: "right",
                  color: "var(--gray-11)",
                }}
              >
                {fmtGBP(totalSDLT)}
              </span>
            </div>
          )}
        </div>

        {buyerType === "ftb" && price > 625_000 && (
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
            FTB relief not available above {fmtGBP(625_000)} — standard rates
            applied.
          </div>
        )}
      </div>

      {/* ─── Summary panel ─────────────────────────────────────────── */}
      <div style={card}>
        <div style={labelStyle}>Summary</div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 16,
          }}
        >
          {/* Total SDLT — large */}
          <div
            style={{
              gridColumn: "1 / -1",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              padding: "16px 0 12px",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <span
              style={{
                fontSize: 14,
                color: "var(--gray-9)",
                fontWeight: 500,
              }}
            >
              Total Stamp Duty
            </span>
            <span
              style={{
                fontSize: 28,
                fontWeight: 700,
                fontVariantNumeric: "tabular-nums",
                color: totalSDLT > 0 ? "#a5b4fc" : "var(--gray-12)",
              }}
            >
              {fmtGBP(totalSDLT)}
            </span>
          </div>

          {/* Effective rate */}
          <div style={{ padding: "8px 0" }}>
            <div style={{ fontSize: 12, color: "var(--gray-9)", marginBottom: 4 }}>
              Effective Rate
            </div>
            <div
              style={{
                fontSize: 20,
                fontWeight: 700,
                fontVariantNumeric: "tabular-nums",
                color: "var(--gray-12)",
              }}
            >
              {effectiveRate.toFixed(2)}%
            </div>
          </div>

          {/* Price + SDLT */}
          <div style={{ padding: "8px 0" }}>
            <div style={{ fontSize: 12, color: "var(--gray-9)", marginBottom: 4 }}>
              Price + SDLT
            </div>
            <div
              style={{
                fontSize: 20,
                fontWeight: 700,
                fontVariantNumeric: "tabular-nums",
                color: "var(--gray-12)",
              }}
            >
              {fmtGBP(price + totalSDLT)}
            </div>
          </div>

          {/* Additional costs */}
          <div style={{ padding: "8px 0" }}>
            <div style={{ fontSize: 12, color: "var(--gray-9)", marginBottom: 4 }}>
              Solicitor / Survey / Fees
            </div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 600,
                fontVariantNumeric: "tabular-nums",
                color: "var(--gray-11)",
              }}
            >
              ~{fmtGBP(SOLICITOR_SURVEY_FEES)}
            </div>
          </div>

          {/* Total acquisition */}
          <div style={{ padding: "8px 0" }}>
            <div style={{ fontSize: 12, color: "var(--gray-9)", marginBottom: 4 }}>
              Total Acquisition Cost
            </div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 600,
                fontVariantNumeric: "tabular-nums",
                color: "var(--gray-11)",
              }}
            >
              {fmtGBP(totalAcquisition)}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Visual comparison bar ─────────────────────────────────── */}
      <div style={card}>
        <div style={labelStyle}>SDLT as Proportion of Purchase Price</div>
        <div style={{ position: "relative", marginTop: 4 }}>
          {/* Background (full price) */}
          <div
            style={{
              height: 32,
              borderRadius: 6,
              background: "rgba(255,255,255,0.06)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* SDLT portion */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                height: "100%",
                width: `${Math.min(effectiveRate, 100)}%`,
                minWidth: effectiveRate > 0 ? 2 : 0,
                background: "linear-gradient(90deg, #6366f1, #818cf8)",
                borderRadius: "6px 0 0 6px",
                transition: "width 0.3s ease",
              }}
            />
            {/* Label on the bar */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0 12px",
                fontSize: 12,
                fontWeight: 600,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              <span style={{ color: "var(--gray-12)" }}>
                {effectiveRate > 0
                  ? `SDLT: ${effectiveRate.toFixed(2)}% of price`
                  : "No SDLT payable"}
              </span>
              <span style={{ color: "var(--gray-9)" }}>
                {fmtGBP(totalSDLT)} / {fmtGBP(price)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
