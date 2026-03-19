"use client";

import { useState, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  Polyline,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import {
  BOROUGHS,
  ELIZABETH_LINE,
  TIER_COLOR,
  TIER_LABEL,
  fmt,
  fmtK,
  type Borough,
} from "@/lib/london-data";

// ─── Approximate centre coords for every London borough ──────────────────────
const BOROUGH_COORDS: Record<string, [number, number]> = {
  "Kensington & Chelsea": [51.502, -0.191],
  Westminster: [51.497, -0.137],
  Camden: [51.546, -0.163],
  "City of London": [51.515, -0.092],
  "Hammersmith & Fulham": [51.492, -0.223],
  Islington: [51.544, -0.103],
  Wandsworth: [51.455, -0.191],
  Haringey: [51.590, -0.110],
  Southwark: [51.473, -0.073],
  Hackney: [51.545, -0.055],
  Lambeth: [51.457, -0.116],
  "Richmond upon Thames": [51.441, -0.302],
  Brent: [51.558, -0.264],
  "Tower Hamlets": [51.515, -0.037],
  Barnet: [51.613, -0.207],
  Ealing: [51.514, -0.313],
  Merton: [51.410, -0.200],
  Hounslow: [51.469, -0.361],
  Lewisham: [51.452, -0.020],
  Harrow: [51.589, -0.337],
  Greenwich: [51.477, 0.013],
  "Kingston upon Thames": [51.394, -0.300],
  "Waltham Forest": [51.588, -0.020],
  Enfield: [51.651, -0.080],
  Hillingdon: [51.536, -0.440],
  Bromley: [51.377, 0.045],
  Redbridge: [51.576, 0.075],
  Croydon: [51.372, -0.098],
  Newham: [51.525, 0.035],
  Sutton: [51.360, -0.170],
  Bexley: [51.441, 0.132],
  Havering: [51.570, 0.212],
  "Barking & Dagenham": [51.538, 0.130],
};

// ─── Elizabeth Line station coords ───────────────────────────────────────────
const EL_STATION_COORDS: Record<string, [number, number]> = {
  "Ealing Broadway": [51.515, -0.302],
  Woolwich: [51.492, 0.072],
  "Abbey Wood": [51.491, 0.120],
  "Custom House": [51.509, 0.026],
  Stratford: [51.542, -0.003],
  "Forest Gate": [51.549, 0.024],
  Whitechapel: [51.519, -0.060],
  "Tottenham Court Road": [51.516, -0.131],
};

// ─── Elizabeth Line polyline path (west-to-east through central) ─────────────
const EL_LINE_PATH: [number, number][] = [
  EL_STATION_COORDS["Ealing Broadway"],
  EL_STATION_COORDS["Tottenham Court Road"],
  EL_STATION_COORDS["Whitechapel"],
  EL_STATION_COORDS["Stratford"],
  EL_STATION_COORDS["Forest Gate"],
  EL_STATION_COORDS["Custom House"],
  EL_STATION_COORDS["Woolwich"],
  EL_STATION_COORDS["Abbey Wood"],
];

// ─── Color mode types ────────────────────────────────────────────────────────
type ColorMode = "price" | "growth" | "yield";

function trendBadge(trend: Borough["trend"]) {
  const colors: Record<string, { bg: string; label: string }> = {
    rising: { bg: "#22c55e", label: "Rising" },
    stable: { bg: "#3b82f6", label: "Stable" },
    declining: { bg: "#ef4444", label: "Declining" },
  };
  return colors[trend] ?? colors.stable;
}

/** Linearly interpolate a value between two colors (hex). */
function lerpColor(a: string, b: string, t: number): string {
  const parse = (hex: string) => {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff] as const;
  };
  const [r1, g1, b1] = parse(a);
  const [r2, g2, b2] = parse(b);
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const r = clamp(r1 + (r2 - r1) * t);
  const g = clamp(g1 + (g2 - g1) * t);
  const bl = clamp(b1 + (b2 - b1) * t);
  return `#${((r << 16) | (g << 8) | bl).toString(16).padStart(6, "0")}`;
}

function getGrowthColor(growth: number): string {
  // -2 to +7 range mapped from red -> yellow -> green
  const t = Math.max(0, Math.min(1, (growth + 2) / 9));
  if (t < 0.5) return lerpColor("#ef4444", "#eab308", t * 2);
  return lerpColor("#eab308", "#22c55e", (t - 0.5) * 2);
}

function getYieldColor(yieldAvg: number): string {
  // 4.0 to 6.5 range mapped from cool blue -> warm amber
  const t = Math.max(0, Math.min(1, (yieldAvg - 4.0) / 2.5));
  if (t < 0.5) return lerpColor("#3b82f6", "#14b8a6", t * 2);
  return lerpColor("#14b8a6", "#f59e0b", (t - 0.5) * 2);
}

// ─── Glass panel styling ─────────────────────────────────────────────────────
const glassPanel: React.CSSProperties = {
  background: "rgba(15, 15, 20, 0.75)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 10,
  color: "#e4e4e7",
};

// ─── Component ───────────────────────────────────────────────────────────────
export function BoroughMapInner() {
  const [mode, setMode] = useState<ColorMode>("price");

  const prices = useMemo(() => BOROUGHS.map((b) => b.avgPrice), []);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);

  function getRadius(borough: Borough): number {
    const t = (borough.avgPrice - minPrice) / (maxPrice - minPrice);
    return 8 + t * 17; // 8..25
  }

  function getColor(borough: Borough): string {
    if (mode === "price") return TIER_COLOR[borough.tier];
    if (mode === "growth") return getGrowthColor(borough.growth1y);
    // yield
    const avg = (borough.yieldLow + borough.yieldHigh) / 2;
    return getYieldColor(avg);
  }

  const modeButtons: { key: ColorMode; label: string }[] = [
    { key: "price", label: "Price" },
    { key: "growth", label: "Growth" },
    { key: "yield", label: "Yield" },
  ];

  return (
    <div style={{ position: "relative", width: "100%", height: 600, borderRadius: 12, overflow: "hidden" }}>
      <MapContainer
        center={[51.509, -0.118]}
        zoom={10}
        style={{ width: "100%", height: "100%" }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        {/* Elizabeth Line polyline */}
        <Polyline
          positions={EL_LINE_PATH}
          pathOptions={{ color: "#8b5cf6", weight: 3, opacity: 0.6, dashArray: "8 6" }}
        />

        {/* Elizabeth Line stations */}
        {ELIZABETH_LINE.map((station) => {
          const coords = EL_STATION_COORDS[station.name];
          if (!coords) return null;
          return (
            <CircleMarker
              key={`el-${station.name}`}
              center={coords}
              radius={6}
              pathOptions={{
                color: "#8b5cf6",
                fillColor: "#8b5cf6",
                fillOpacity: 0.9,
                weight: 2,
              }}
            >
              <Popup>
                <div style={{ fontFamily: "system-ui", fontSize: 13, lineHeight: 1.5 }}>
                  <strong style={{ fontSize: 14 }}>{station.name}</strong>
                  <br />
                  <span style={{ color: "#8b5cf6" }}>Elizabeth Line</span>
                  <br />
                  Borough: {station.borough}
                  <br />
                  Growth YoY: +{station.growthYoY.toFixed(1)}%
                  <br />
                  Rental uplift: {station.rentalUplift}
                </div>
              </Popup>
            </CircleMarker>
          );
        })}

        {/* Borough markers */}
        {BOROUGHS.map((borough) => {
          const coords = BOROUGH_COORDS[borough.name];
          if (!coords) return null;
          const badge = trendBadge(borough.trend);
          return (
            <CircleMarker
              key={borough.name}
              center={coords}
              radius={getRadius(borough)}
              pathOptions={{
                color: getColor(borough),
                fillColor: getColor(borough),
                fillOpacity: 0.7,
                weight: 1.5,
              }}
            >
              <Popup>
                <div style={{ fontFamily: "system-ui", fontSize: 13, lineHeight: 1.6, minWidth: 180 }}>
                  <strong style={{ fontSize: 14 }}>{borough.name}</strong>
                  <br />
                  <span
                    style={{
                      display: "inline-block",
                      fontSize: 11,
                      fontWeight: 600,
                      background: TIER_COLOR[borough.tier],
                      color: "#fff",
                      padding: "1px 8px",
                      borderRadius: 9999,
                      marginTop: 2,
                      marginBottom: 4,
                    }}
                  >
                    {TIER_LABEL[borough.tier]}
                  </span>
                  <br />
                  Avg price/m2: {"\u00A3"}{fmt(borough.avgPricePerM2)}
                  <br />
                  Avg price: {fmtK(borough.avgPrice)}
                  <br />
                  Yield: {borough.yieldLow.toFixed(1)}&ndash;{borough.yieldHigh.toFixed(1)}%
                  <br />
                  Growth 1Y: {borough.growth1y > 0 ? "+" : ""}{borough.growth1y.toFixed(1)}%
                  <br />
                  <span
                    style={{
                      display: "inline-block",
                      fontSize: 11,
                      fontWeight: 600,
                      background: badge.bg,
                      color: "#fff",
                      padding: "1px 8px",
                      borderRadius: 9999,
                      marginTop: 4,
                    }}
                  >
                    {badge.label}
                  </span>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>

      {/* ── Color mode selector (top-left) ── */}
      <div
        style={{
          ...glassPanel,
          position: "absolute",
          top: 12,
          left: 12,
          zIndex: 1000,
          display: "flex",
          gap: 0,
          padding: 3,
        }}
      >
        {modeButtons.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setMode(key)}
            style={{
              padding: "5px 14px",
              fontSize: 12,
              fontWeight: 600,
              border: "none",
              borderRadius: 7,
              cursor: "pointer",
              transition: "all 0.15s ease",
              background: mode === key ? "rgba(255,255,255,0.14)" : "transparent",
              color: mode === key ? "#fff" : "#a1a1aa",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Legend (bottom-right) ── */}
      <div
        style={{
          ...glassPanel,
          position: "absolute",
          bottom: 16,
          right: 16,
          zIndex: 1000,
          padding: "10px 14px",
          fontSize: 12,
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
        <span style={{ fontWeight: 600, fontSize: 11, color: "#71717a", textTransform: "uppercase", letterSpacing: 0.5 }}>
          {mode === "price" ? "Tier" : mode === "growth" ? "Growth 1Y" : "Avg Yield"}
        </span>

        {mode === "price" && (
          <>
            {(["prime", "inner_premium", "inner", "outer", "outer_affordable"] as const).map((tier) => (
              <div key={tier} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: TIER_COLOR[tier],
                    flexShrink: 0,
                  }}
                />
                <span>{TIER_LABEL[tier]}</span>
              </div>
            ))}
            {/* Elizabeth Line entry */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 6 }}>
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: "#8b5cf6",
                  flexShrink: 0,
                }}
              />
              <span>Elizabeth Line</span>
            </div>
          </>
        )}

        {mode === "growth" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 40, height: 8, borderRadius: 4, background: "linear-gradient(90deg, #ef4444, #eab308, #22c55e)" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#a1a1aa" }}>
              <span>-2%</span>
              <span>+3%</span>
              <span>+7%</span>
            </div>
          </div>
        )}

        {mode === "yield" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 40, height: 8, borderRadius: 4, background: "linear-gradient(90deg, #3b82f6, #14b8a6, #f59e0b)" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#a1a1aa" }}>
              <span>4.0%</span>
              <span>5.2%</span>
              <span>6.5%</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
