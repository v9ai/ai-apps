"use client";

import type React from "react";
import {
  Badge,
  Box,
  Flex,
  Separator,
  Text,
} from "@radix-ui/themes";

/* ================================================================
   TYPE DEFINITIONS
   ================================================================ */

export type Listing = {
  title: string;
  price_eur: number | null;
  size_m2: number | null;
  price_per_m2: number | null;
  rooms: number | null;
  floor: number | null;
  total_floors: number | null;
  zone: string | null;
  city: string;
  condition: string;
  features: string[];
  parking_included: boolean | null;
  parking_price_eur: number | null;
};

export interface ScoreBreakdown {
  price_score: number;
  location_score: number;
  condition_score: number;
  market_score: number;
}

export type Valuation = {
  verdict: "undervalued" | "fair" | "overvalued";
  confidence: number;
  fair_value_eur_per_m2: number | null;
  price_deviation_pct: number | null;
  reasoning: string;
  key_factors: string[];
  investment_score: number | null;
  risk_factors: string[];
  opportunity_factors: string[];
  recommendation: "strong_buy" | "buy" | "hold" | "avoid" | null;
  market_context: string | null;
  rental_estimate_eur: number | null;
  rental_yield_pct: number | null;
  negotiation_margin_pct: number | null;
  total_cost_eur: number | null;
  liquidity: "high" | "medium" | "low" | null;
  price_trend: "rising" | "stable" | "declining" | null;
  score_breakdown?: ScoreBreakdown;
  fair_price_eur?: number;
  breakeven_years?: number;
  net_yield_pct?: number;
  appreciation_pct_1y?: number;
  // Research-grounded additions
  fair_value_low_eur_per_m2?: number;
  fair_value_high_eur_per_m2?: number;
  price_to_rent_ratio?: number;
  time_on_market_weeks?: number;
  renovation_upside_pct?: number;
  neighborhood_stage?: "early_growth" | "maturing" | "established" | "declining";
};

export type ComparableListing = {
  title: string;
  price_eur: number | null;
  size_m2: number | null;
  price_per_m2: number | null;
  rooms: number | null;
  zone: string | null;
  url: string | null;
  source: string;
  deviation_pct: number | null;
};

export type ZoneStats = {
  zone: string | null;
  avg_price_per_m2: number | null;
  median_price_per_m2: number | null;
  min_price_per_m2: number | null;
  max_price_per_m2: number | null;
  count: number;
};

export type PriceSnapshot = {
  price_eur: number | null;
  price_per_m2: number | null;
  scraped_at: string;
};

export type EnvironmentalHazard = {
  name: string;
  hazard_type: string;
  distance_m: number;
  impact: string;
};

export type EnvironmentalContext = {
  hazards: EnvironmentalHazard[];
  noise_level: string;
  air_quality_risk: string;
  adjustment_pct: number;
  summary: string;
};

export type Result = {
  url: string;
  source: string;
  listing: Listing;
  valuation: Valuation;
  analyzed_at: string;
  comparables: ComparableListing[];
  zone_stats: ZoneStats | null;
  price_history?: PriceSnapshot[];
  environmental?: EnvironmentalContext | null;
};

/* ================================================================
   STYLE CONSTANTS
   ================================================================ */

export const VERDICT_COLOR: Record<string, "green" | "blue" | "red"> = {
  undervalued: "green",
  fair: "blue",
  overvalued: "red",
};

export const VERDICT_LABEL: Record<string, string> = {
  undervalued: "Undervalued",
  fair: "Fair Price",
  overvalued: "Overvalued",
};

export const VERDICT_BG: Record<string, string> = {
  undervalued: "linear-gradient(135deg, rgba(34,197,94,0.10), rgba(34,197,94,0.03))",
  fair: "linear-gradient(135deg, rgba(59,130,246,0.10), rgba(59,130,246,0.03))",
  overvalued: "linear-gradient(135deg, rgba(239,68,68,0.10), rgba(239,68,68,0.03))",
};

export const VERDICT_BORDER: Record<string, string> = {
  undervalued: "rgba(34,197,94,0.22)",
  fair: "rgba(59,130,246,0.22)",
  overvalued: "rgba(239,68,68,0.22)",
};

export const REC_COLOR: Record<string, "green" | "teal" | "orange" | "red"> = {
  strong_buy: "green",
  buy: "teal",
  hold: "orange",
  avoid: "red",
};

export const REC_LABEL: Record<string, string> = {
  strong_buy: "Strong Buy",
  buy: "Buy",
  hold: "Hold",
  avoid: "Avoid",
};

export const HAZARD_ICONS: Record<string, string> = {
  airport: "\u2708",
  railway: "\u{1F6E4}",
  highway: "\u{1F6E3}",
  industrial: "\u{1F3ED}",
  landfill: "\u{1F5D1}",
  wastewater: "\u{1F6B0}",
  power_plant: "\u26A1",
};

export const IMPACT_COLOR: Record<string, "red" | "orange" | "gray"> = {
  high: "red",
  moderate: "orange",
  low: "gray",
};

/* ================================================================
   INLINE STYLE CONSTANTS
   ================================================================ */

export const S = {
  inputSection: {
    position: "relative" as const,
    padding: "48px 0 36px",
  },
  inputGlow: {
    position: "absolute" as const,
    inset: 0,
    background: "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(124,58,237,0.08), transparent)",
    pointerEvents: "none" as const,
  },
  inputCard: {
    position: "relative" as const,
    background: "rgba(255,255,255,0.025)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 20,
    padding: "28px 28px 22px",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    boxShadow: "0 8px 40px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.04)",
  },
  inputRow: {
    display: "flex" as const,
    gap: 12,
    alignItems: "stretch" as const,
  },
  urlInput: {
    flex: 1,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 12,
    padding: "14px 18px",
    color: "var(--gray-12)",
    fontSize: 15,
    outline: "none",
    transition: "border-color 0.25s, box-shadow 0.25s",
    fontFamily: "inherit",
  } as React.CSSProperties,
  analyzeBtn: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: "0 28px",
    borderRadius: 12,
    background: "linear-gradient(135deg, var(--accent-9), #ec4899)",
    color: "#fff",
    fontSize: 14,
    fontWeight: 700,
    border: "none",
    cursor: "pointer",
    letterSpacing: "0.02em",
    transition: "transform 0.2s, box-shadow 0.2s, opacity 0.2s",
    boxShadow: "0 4px 20px rgba(124,58,237,0.25)",
    whiteSpace: "nowrap" as const,
    minHeight: 48,
  } as React.CSSProperties,
  analyzeBtnOff: { opacity: 0.6, cursor: "not-allowed" as const },
  sourceRow: { display: "flex" as const, alignItems: "center" as const, gap: 8, marginTop: 12 },
  sourceBadge: {
    fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 99,
    background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)",
    color: "var(--gray-9)", letterSpacing: "0.02em",
  } as React.CSSProperties,

  /* loading */
  skelWrap: { display: "flex", flexDirection: "column" as const, gap: 20, padding: "20px 0" },
  skelCard: {
    background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 16, padding: 28, overflow: "hidden", position: "relative" as const,
  },
  loadLabel: { display: "flex" as const, alignItems: "center" as const, gap: 10, justifyContent: "center" as const, padding: "8px 0 4px" },
  dot: {
    width: 8, height: 8, borderRadius: "50%", background: "var(--accent-9)",
    animation: "az-pulse 1.4s ease-in-out infinite", boxShadow: "0 0 12px var(--accent-7)",
  },

  /* verdict */
  vBadge: { display: "inline-block", fontSize: 32, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.1 } as React.CSSProperties,
  confMeter: { display: "flex" as const, alignItems: "center" as const, justifyContent: "center" as const, gap: 6, marginTop: 14 },
  confTrack: { width: 140, height: 6, borderRadius: 3, background: "rgba(255,255,255,0.08)", overflow: "hidden" },
  recPill: {
    display: "inline-flex", alignItems: "center", gap: 6, marginTop: 10, padding: "6px 20px",
    borderRadius: 99, fontSize: 13, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" as const,
  } as React.CSSProperties,

  /* metrics */
  mGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 12 },
  mLabel: { fontSize: 10, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "var(--gray-8)", marginBottom: 6 } as React.CSSProperties,
  mVal: { fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" as const, lineHeight: 1.1 } as React.CSSProperties,
  mSub: { fontSize: 11, color: "var(--gray-8)", marginTop: 4 },

  /* sections */
  glass: {
    background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 16, padding: "24px 28px", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
  },
  secLabel: { fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.1em", color: "var(--gray-8)", marginBottom: 16 } as React.CSSProperties,

  /* stats */
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 16, marginBottom: 20 },
  statBox: { textAlign: "center" as const, padding: "12px 8px", borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" },

  /* detail pills */
  pill: {
    display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 8,
    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)",
    fontSize: 12, color: "var(--gray-11)", fontWeight: 500,
  } as React.CSSProperties,
  pillLabel: { color: "var(--gray-8)", fontWeight: 600, fontSize: 10, textTransform: "uppercase" as const, letterSpacing: "0.04em" } as React.CSSProperties,

  /* footer row */
  fRow: {
    display: "flex" as const, justifyContent: "space-between" as const, alignItems: "center" as const,
    padding: "12px 0", borderTop: "1px solid rgba(255,255,255,0.06)", marginTop: 4,
  },
};

/* shimmer bar helper */
export function bar(w: string, h = 14): React.CSSProperties {
  return {
    width: w, height: h, borderRadius: 6,
    background: "linear-gradient(90deg, var(--gray-3) 25%, var(--gray-4) 50%, var(--gray-3) 75%)",
    backgroundSize: "200% 100%", animation: "az-shimmer 1.5s ease-in-out infinite", marginBottom: 10,
  };
}

/* ================================================================
   SUB-COMPONENTS
   ================================================================ */

export function ZonePriceBar({ min, max, avg, listing }: { min: number; max: number; avg: number | null; listing: number | null }) {
  const range = max - min || 1;
  const pct = (v: number) => Math.min(100, Math.max(0, ((v - min) / range) * 100));
  return (
    <div style={{ position: "relative", height: 12, background: "var(--gray-3)", borderRadius: 6 }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, background: "var(--gray-5)", borderRadius: 6 }} />
      {avg != null && (
        <div style={{ position: "absolute", left: `${pct(avg)}%`, top: -2, width: 3, height: 16, background: "var(--gray-9)", borderRadius: 2, transform: "translateX(-50%)" }}
          title={`Zone avg: \u20AC${avg}/m\u00B2`} />
      )}
      {listing != null && (
        <div style={{ position: "absolute", left: `${pct(listing)}%`, top: -3, width: 4, height: 18, background: "var(--iris-9)", borderRadius: 2, transform: "translateX(-50%)" }}
          title={`This listing: \u20AC${listing}/m\u00B2`} />
      )}
    </div>
  );
}

export function DeviationBadge({ pct }: { pct: number | null }) {
  if (pct == null) return null;
  const color: "green" | "red" | "gray" = pct < -10 ? "green" : pct > 10 ? "red" : "gray";
  return <Badge size="1" color={color} variant="soft">{pct > 0 ? "+" : ""}{pct.toFixed(1)}%</Badge>;
}

export function ScoreBar({ label, value }: { label: string; value: number }) {
  const color = value >= 7 ? "var(--green-9)" : value >= 5 ? "var(--amber-9)" : "var(--red-9)";
  return (
    <Flex direction="column" gap="1">
      <Flex justify="between">
        <Text size="1" color="gray">{label}</Text>
        <Text size="1" weight="bold">{value.toFixed(1)}</Text>
      </Flex>
      <Box role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={10} aria-label={`${label} score`} style={{ height: 4, background: "var(--gray-4)", borderRadius: 2 }}>
        <Box style={{ width: `${value * 10}%`, height: "100%", background: color, borderRadius: 2, transition: "width 0.6s ease" }} />
      </Box>
    </Flex>
  );
}

export function ComparableCard({ comp }: { comp: ComparableListing }) {
  const inner = (
    <Box p="3" style={{ border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, background: "rgba(255,255,255,0.025)", height: "100%", transition: "border-color 0.2s, box-shadow 0.2s, transform 0.2s" }}>
      <Text size="1" color="gray" as="p" mb="1" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{comp.title || "\u2014"}</Text>
      {comp.price_per_m2 != null && <Text size="4" weight="bold" as="p">{"\u20AC"}{comp.price_per_m2.toLocaleString()}/m{"\u00B2"}</Text>}
      <Flex gap="2" align="center" mt="1" wrap="wrap">
        {comp.size_m2 != null && <Text size="1" color="gray">{comp.size_m2} m{"\u00B2"}</Text>}
        <DeviationBadge pct={comp.deviation_pct} />
      </Flex>
    </Box>
  );
  return comp.url
    ? <a href={comp.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", color: "inherit" }}>{inner}</a>
    : inner;
}

export function EnvironmentalCard({ env }: { env: EnvironmentalContext }) {
  if (!env.hazards.length) return null;
  return (
    <div style={{ ...S.glass, borderLeft: "3px solid var(--amber-9)" }}>
      <div style={{ ...S.secLabel, color: "var(--amber-11)" }}>Environmental Context</div>
      <Flex gap="3" wrap="wrap" mb="3">
        <Flex align="center" gap="2">
          <Text size="1" color="gray" weight="bold" style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>Noise</Text>
          <Badge size="1" variant="soft" color={IMPACT_COLOR[env.noise_level] ?? "gray"}>{env.noise_level}</Badge>
        </Flex>
        <Flex align="center" gap="2">
          <Text size="1" color="gray" weight="bold" style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>Air Quality Risk</Text>
          <Badge size="1" variant="soft" color={IMPACT_COLOR[env.air_quality_risk] ?? "gray"}>{env.air_quality_risk}</Badge>
        </Flex>
        {env.adjustment_pct !== 0 && (
          <Flex align="center" gap="2">
            <Text size="1" color="gray" weight="bold" style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>Value Impact</Text>
            <Badge size="1" variant="soft" color="red">{(env.adjustment_pct * 100).toFixed(1)}%</Badge>
          </Flex>
        )}
      </Flex>
      <Flex direction="column" gap="2">
        {env.hazards.map((h, i) => (
          <Flex key={i} gap="2" align="center" style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>{HAZARD_ICONS[h.hazard_type] ?? "\u26A0"}</span>
            <Flex direction="column" style={{ flex: 1, minWidth: 0 }}>
              <Text size="2" weight="medium" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.name}</Text>
              <Text size="1" color="gray">{h.hazard_type} &middot; {h.distance_m < 1000 ? `${h.distance_m.toFixed(0)}m` : `${(h.distance_m / 1000).toFixed(1)}km`} away</Text>
            </Flex>
            <Badge size="1" variant="soft" color={IMPACT_COLOR[h.impact] ?? "gray"}>{h.impact}</Badge>
          </Flex>
        ))}
      </Flex>
    </div>
  );
}

export function PriceHistoryCard({ history }: { history: PriceSnapshot[] }) {
  if (history.length < 2) return null;
  const first = history[0];
  const last = history[history.length - 1];
  if (first.price_eur === last.price_eur) return null;
  const diff = (last.price_eur ?? 0) - (first.price_eur ?? 0);
  const pctChange = first.price_eur ? ((diff / first.price_eur) * 100) : 0;
  const color: "green" | "red" = diff < 0 ? "green" : "red";
  return (
    <div style={S.glass}>
      <div style={S.secLabel}>Price History</div>
      <Flex direction="column" gap="2">
        {history.map((snap, i) => {
          const prev = i > 0 ? history[i - 1] : null;
          const snapDiff = prev?.price_eur && snap.price_eur ? snap.price_eur - prev.price_eur : null;
          return (
            <Flex key={i} justify="between" align="center">
              <Text size="2" color="gray">{new Date(snap.scraped_at).toLocaleDateString()}</Text>
              <Flex gap="2" align="center">
                <Text size="2" weight="bold">{snap.price_eur != null ? `\u20AC${snap.price_eur.toLocaleString()}` : "\u2014"}</Text>
                {snapDiff != null && snapDiff !== 0 && (
                  <Badge size="1" color={snapDiff < 0 ? "green" : "red"} variant="soft">
                    {snapDiff > 0 ? "+" : ""}{"\u20AC"}{snapDiff.toLocaleString()}
                  </Badge>
                )}
              </Flex>
            </Flex>
          );
        })}
      </Flex>
      <Separator my="3" size="4" />
      <Flex justify="between" align="center">
        <Text size="1" color="gray">Total change</Text>
        <Badge size="2" color={color} variant="soft">
          {diff > 0 ? "+" : ""}{"\u20AC"}{diff.toLocaleString()} ({pctChange > 0 ? "+" : ""}{pctChange.toFixed(1)}%)
        </Badge>
      </Flex>
    </div>
  );
}

export function LoadingSkeleton() {
  return (
    <div style={S.skelWrap} role="status" aria-live="polite">
      <div style={S.loadLabel}>
        <div style={S.dot} />
        <Text size="3" weight="bold">Analyzing listing...</Text>
      </div>
      <Text size="1" color="gray" style={{ textAlign: "center" }}>
        Scraping, extracting data, finding comparables, and running AI valuation. This usually takes 10{"\u2013"}15 seconds.
      </Text>
      <div style={{ ...S.skelCard, padding: "36px 28px", textAlign: "center" as const }}>
        <div style={{ ...bar("40%", 32), margin: "0 auto 12px" }} />
        <div style={{ ...bar("25%", 10), margin: "0 auto 0" }} />
      </div>
      <div className="az-skel-metrics">
        {[1, 2, 3, 4].map((i) => <div key={i} style={S.skelCard}><div style={bar("60%", 8)} /><div style={bar("80%", 20)} /></div>)}
      </div>
      <div style={S.skelCard}>
        <div style={bar("30%", 10)} />
        <div className="az-skel-detail">
          {[1, 2, 3, 4, 5, 6].map((i) => <div key={i}><div style={bar("50%", 8)} /><div style={bar("70%", 18)} /></div>)}
        </div>
      </div>
      <div style={S.skelCard}>
        <div style={bar("35%", 10)} />
        <div className="az-skel-detail">
          {[1, 2, 3].map((i) => <div key={i}><div style={bar("90%", 8)} /><div style={bar("60%", 16)} /><div style={bar("40%", 8)} /></div>)}
        </div>
      </div>
    </div>
  );
}

export function MetricTile({ label, value, sub, accent = "var(--accent-9)", valueColor }: {
  label: string; value: string; sub?: string; accent?: string; valueColor?: string;
}) {
  return (
    <div style={{ padding: "18px 16px 14px", borderRadius: 14, background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", position: "relative" as const, overflow: "hidden", borderLeft: `3px solid ${accent}` }}>
      <div style={S.mLabel}>{label}</div>
      <div style={{ ...S.mVal, color: valueColor ?? "var(--gray-12)" }}>{value}</div>
      {sub && <div style={S.mSub}>{sub}</div>}
    </div>
  );
}
