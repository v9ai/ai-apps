"use client";

import { useState, useEffect, useCallback, useRef, type FormEvent } from "react";
import {
  Badge,
  Box,
  Flex,
  Separator,
  Text,
} from "@radix-ui/themes";
import { Topbar } from "@/components/topbar";
import { Footer } from "@/components/footer";


type Listing = {
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

interface ScoreBreakdown {
  price_score: number;
  location_score: number;
  condition_score: number;
  market_score: number;
}

type Valuation = {
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

type ComparableListing = {
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

type ZoneStats = {
  zone: string | null;
  avg_price_per_m2: number | null;
  median_price_per_m2: number | null;
  min_price_per_m2: number | null;
  max_price_per_m2: number | null;
  count: number;
};

type PriceSnapshot = {
  price_eur: number | null;
  price_per_m2: number | null;
  scraped_at: string;
};

type EnvironmentalHazard = {
  name: string;
  hazard_type: string;
  distance_m: number;
  impact: string;
};

type EnvironmentalContext = {
  hazards: EnvironmentalHazard[];
  noise_level: string;
  air_quality_risk: string;
  adjustment_pct: number;
  summary: string;
};

type RentalComparableData = {
  title: string;
  monthly_rent_eur: number;
  size_m2: number | null;
  rent_per_m2: number | null;
  rooms: number | null;
  zone: string | null;
  url: string | null;
};

type RentalMarketData = {
  avg_rent: number;
  median_rent: number;
  min_rent: number;
  max_rent: number;
  sample_count: number;
  rent_per_m2_avg: number | null;
  comparables: RentalComparableData[];
};

type ValidatedYieldData = {
  gross_yield_pct: number;
  net_yield_pct: number;
  market_rent: number;
  llm_estimate: number | null;
  rent_confidence: string;
};

type RenovationItemData = {
  category: string;
  description: string;
  cost_eur: number;
  priority: string;
};

type RenovationEstimateData = {
  scope: string;
  items: RenovationItemData[];
  total_cost_eur: number;
  cost_per_m2: number;
  duration_weeks: number;
  roi_pct: number | null;
  post_renovation_value: number | null;
};

type Result = {
  url: string;
  source: string;
  listing: Listing;
  valuation: Valuation;
  analyzed_at: string;
  comparables: ComparableListing[];
  zone_stats: ZoneStats | null;
  price_history?: PriceSnapshot[];
  environmental?: EnvironmentalContext | null;
  rental_market?: RentalMarketData | null;
  validated_yield?: ValidatedYieldData | null;
  renovation?: RenovationEstimateData | null;
};

const VERDICT_COLOR: Record<string, "green" | "blue" | "red"> = {
  undervalued: "green",
  fair: "blue",
  overvalued: "red",
};

const VERDICT_LABEL: Record<string, string> = {
  undervalued: "Undervalued",
  fair: "Fair Price",
  overvalued: "Overvalued",
};

const VERDICT_BG: Record<string, string> = {
  undervalued: "linear-gradient(135deg, rgba(34,197,94,0.10), rgba(34,197,94,0.03))",
  fair: "linear-gradient(135deg, rgba(59,130,246,0.10), rgba(59,130,246,0.03))",
  overvalued: "linear-gradient(135deg, rgba(239,68,68,0.10), rgba(239,68,68,0.03))",
};

const VERDICT_BORDER: Record<string, string> = {
  undervalued: "rgba(34,197,94,0.22)",
  fair: "rgba(59,130,246,0.22)",
  overvalued: "rgba(239,68,68,0.22)",
};

const REC_COLOR: Record<string, "green" | "teal" | "orange" | "red"> = {
  strong_buy: "green",
  buy: "teal",
  hold: "orange",
  avoid: "red",
};

const REC_LABEL: Record<string, string> = {
  strong_buy: "Strong Buy",
  buy: "Buy",
  hold: "Hold",
  avoid: "Avoid",
};

/* ================================================================
   INLINE STYLE CONSTANTS
   ================================================================ */

const S = {
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
function bar(w: string, h = 14): React.CSSProperties {
  return {
    width: w, height: h, borderRadius: 6,
    background: "linear-gradient(90deg, var(--gray-3) 25%, var(--gray-4) 50%, var(--gray-3) 75%)",
    backgroundSize: "200% 100%", animation: "az-shimmer 1.5s ease-in-out infinite", marginBottom: 10,
  };
}

/* ================================================================
   SUB-COMPONENTS
   ================================================================ */

function ZonePriceBar({ min, max, avg, listing }: { min: number; max: number; avg: number | null; listing: number | null }) {
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

function DeviationBadge({ pct }: { pct: number | null }) {
  if (pct == null) return null;
  const color: "green" | "red" | "gray" = pct < -10 ? "green" : pct > 10 ? "red" : "gray";
  return <Badge size="1" color={color} variant="soft">{pct > 0 ? "+" : ""}{pct.toFixed(1)}%</Badge>;
}

function ScoreBar({ label, value }: { label: string; value: number }) {
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

function ComparableCard({ comp }: { comp: ComparableListing }) {
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

const HAZARD_ICONS: Record<string, string> = {
  airport: "\u2708",
  railway: "\u{1F6E4}",
  highway: "\u{1F6E3}",
  industrial: "\u{1F3ED}",
  landfill: "\u{1F5D1}",
  wastewater: "\u{1F6B0}",
  power_plant: "\u26A1",
};

const IMPACT_COLOR: Record<string, "red" | "orange" | "gray"> = {
  high: "red",
  moderate: "orange",
  low: "gray",
};

function EnvironmentalCard({ env }: { env: EnvironmentalContext }) {
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

function PriceHistoryCard({ history }: { history: PriceSnapshot[] }) {
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

const STAGE_META: Record<string, { color: "green" | "teal" | "blue" | "red"; label: string; description: string; borderColor: string; bgColor: string; textColor: string }> = {
  early_growth: {
    color: "green",
    label: "\u2191 Early Growth",
    description: "Emerging area with rising prices and new infrastructure. Higher risk but potential for above-market returns.",
    borderColor: "rgba(34,197,94,0.22)",
    bgColor: "rgba(34,197,94,0.05)",
    textColor: "var(--green-11)",
  },
  maturing: {
    color: "teal",
    label: "\u2197 Maturing",
    description: "Growth stabilizing with established amenities. Balanced risk/reward profile.",
    borderColor: "rgba(45,212,191,0.22)",
    bgColor: "rgba(45,212,191,0.05)",
    textColor: "var(--teal-11)",
  },
  established: {
    color: "blue",
    label: "\u2192 Established",
    description: "Blue-chip zone with stable demand and premium pricing. Lower risk, steady appreciation.",
    borderColor: "rgba(59,130,246,0.22)",
    bgColor: "rgba(59,130,246,0.05)",
    textColor: "var(--blue-11)",
  },
  declining: {
    color: "red",
    label: "\u2193 Declining",
    description: "Aging stock with reduced demand. Consider renovation potential or avoid for buy-to-let.",
    borderColor: "rgba(239,68,68,0.22)",
    bgColor: "rgba(239,68,68,0.05)",
    textColor: "var(--red-11)",
  },
};

function NeighborhoodStageCard({
  zone,
  stage,
  zoneStats,
  listingPricePerM2,
}: {
  zone: string | null;
  stage: Valuation["neighborhood_stage"] | undefined;
  zoneStats: ZoneStats | null;
  listingPricePerM2: number | null;
}) {
  if (!zone && !stage && !zoneStats) return null;

  const meta = stage ? STAGE_META[stage] : null;

  const hasRange =
    zoneStats?.min_price_per_m2 != null && zoneStats?.max_price_per_m2 != null;

  return (
    <div
      style={{
        ...S.glass,
        borderLeft: meta ? `3px solid ${meta.borderColor}` : "3px solid rgba(255,255,255,0.1)",
      }}
    >
      <div style={S.secLabel}>Neighborhood Profile</div>

      {/* Zone name + stage badge */}
      <Flex align="center" gap="3" mb="3" wrap="wrap">
        {zone && (
          <Text size="5" weight="bold" style={{ letterSpacing: "-0.01em", color: "var(--gray-12)" }}>
            {zone}
          </Text>
        )}
        {meta && (
          <Badge size="2" variant="soft" color={meta.color}>
            {meta.label}
          </Badge>
        )}
      </Flex>

      {/* Stage description */}
      {meta && (
        <Text
          size="2"
          as="p"
          mb="3"
          style={{
            lineHeight: 1.6,
            padding: "8px 12px",
            borderRadius: 8,
            background: meta.bgColor,
            border: `1px solid ${meta.borderColor}`,
            color: meta.textColor,
          }}
        >
          {meta.description}
        </Text>
      )}

      {/* Zone stats row */}
      {zoneStats && (
        <Flex gap="3" wrap="wrap" mb="3" align="center">
          {zoneStats.avg_price_per_m2 != null && (
            <Flex align="center" gap="1">
              <Text size="1" color="gray" weight="bold" style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Avg
              </Text>
              <Text size="2" weight="bold">
                {"\u20AC"}{zoneStats.avg_price_per_m2.toLocaleString()}/m{"\u00B2"}
              </Text>
            </Flex>
          )}
          {zoneStats.count > 0 && (
            <>
              <Text size="1" color="gray">&middot;</Text>
              <Text size="1" color="gray">{zoneStats.count} listing{zoneStats.count !== 1 ? "s" : ""}</Text>
            </>
          )}
          {zoneStats.median_price_per_m2 != null && (
            <>
              <Text size="1" color="gray">&middot;</Text>
              <Flex align="center" gap="1">
                <Text size="1" color="gray" weight="bold" style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Median
                </Text>
                <Text size="1" color="gray">{"\u20AC"}{zoneStats.median_price_per_m2.toLocaleString()}/m{"\u00B2"}</Text>
              </Flex>
            </>
          )}
        </Flex>
      )}

      {/* Price-in-range bar */}
      {hasRange && (
        <Box>
          <ZonePriceBar
            min={zoneStats!.min_price_per_m2!}
            max={zoneStats!.max_price_per_m2!}
            avg={zoneStats!.avg_price_per_m2}
            listing={listingPricePerM2}
          />
          <Flex justify="between" mt="1">
            <Text size="1" color="gray">{"\u20AC"}{zoneStats!.min_price_per_m2!.toLocaleString()}</Text>
            <Text size="1" color="gray" style={{ fontSize: 10, opacity: 0.7 }}>
              {listingPricePerM2 != null ? `your listing \u20AC${listingPricePerM2.toLocaleString()}/m\u00B2` : "zone range"}
            </Text>
            <Text size="1" color="gray">{"\u20AC"}{zoneStats!.max_price_per_m2!.toLocaleString()}</Text>
          </Flex>
        </Box>
      )}
    </div>
  );
}

const LOADING_STAGES = [
  "Scraping listing...",
  "Extracting data...",
  "Finding comparables...",
  "Running AI valuation...",
] as const;

function LoadingSkeleton() {
  const [stageIdx, setStageIdx] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(Date.now());

  useEffect(() => {
    const stageTimer = setInterval(() => {
      setStageIdx((prev) => (prev + 1) % LOADING_STAGES.length);
    }, 3000);
    const tickTimer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    }, 1000);
    return () => { clearInterval(stageTimer); clearInterval(tickTimer); };
  }, []);

  const stage = LOADING_STAGES[stageIdx];

  const stageDotStyle = (idx: number): React.CSSProperties => ({
    width: 6, height: 6, borderRadius: "50%",
    background: idx <= stageIdx ? "var(--accent-9)" : "rgba(255,255,255,0.12)",
    transition: "background 0.4s ease, box-shadow 0.4s ease",
    boxShadow: idx === stageIdx ? "0 0 10px var(--accent-7)" : "none",
  });

  return (
    <div style={S.skelWrap} role="status" aria-live="polite">
      {/* Progress stage indicator */}
      <div style={{ textAlign: "center" as const, padding: "4px 0 0" }}>
        <div style={S.loadLabel}>
          <div style={S.dot} />
          <Text size="3" weight="bold" style={{ transition: "opacity 0.3s ease" }} key={stage}>
            {stage}
          </Text>
        </div>

        {/* Stage dots */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 10 }}>
          {LOADING_STAGES.map((s, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={stageDotStyle(i)} title={s} />
              {i < LOADING_STAGES.length - 1 && (
                <div style={{
                  width: 24, height: 1,
                  background: i < stageIdx ? "var(--accent-9)" : "rgba(255,255,255,0.08)",
                  transition: "background 0.4s ease",
                }} />
              )}
            </div>
          ))}
        </div>

        {/* Timing info */}
        <div style={{ marginTop: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
          <Text size="1" color="gray">Usually takes 10{"\u2013"}15s</Text>
          <span style={{
            fontSize: 11, fontWeight: 600, color: "var(--gray-8)",
            fontVariantNumeric: "tabular-nums" as const,
            padding: "2px 8px", borderRadius: 6,
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)",
          }}>
            {elapsed}s
          </span>
        </div>
      </div>

      {/* Skeleton: Verdict hero */}
      <div style={{
        ...S.skelCard, padding: "36px 28px", textAlign: "center" as const,
        borderRadius: 20,
        background: "linear-gradient(135deg, rgba(59,130,246,0.06), rgba(59,130,246,0.02))",
        border: "1px solid rgba(59,130,246,0.12)",
      }}>
        <div style={{ ...bar("35%", 32), margin: "0 auto 14px", borderRadius: 8 }} />
        <div style={{ ...bar("22%", 14), margin: "0 auto 16px" }} />
        {/* Confidence meter skeleton */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <div style={bar("60px", 8)} />
          <div style={{ ...bar("140px", 6), borderRadius: 3 }} />
          <div style={bar("28px", 8)} />
        </div>
        {/* Recommendation pill skeleton */}
        <div style={{ ...bar("90px", 28), margin: "14px auto 0", borderRadius: 99 }} />
      </div>

      {/* Skeleton: Listing details + key prices */}
      <div style={S.skelCard}>
        <div style={bar("20%", 8)} />
        <div style={{ ...bar("65%", 18), marginBottom: 16 }} />
        {/* Stats grid (4 stat boxes) */}
        <div className="az-skel-metrics" style={{ marginBottom: 16 }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} style={{ ...S.statBox, padding: "12px 8px" }}>
              <div style={{ ...bar("60%", 8), margin: "0 auto 8px" }} />
              <div style={{ ...bar("70%", 20), margin: "0 auto 0" }} />
            </div>
          ))}
        </div>
        {/* Detail pills row */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const }}>
          {[80, 90, 65, 55, 60, 75].map((w, i) => (
            <div key={i} style={{ ...bar(`${w}px`, 26), borderRadius: 8, marginBottom: 0 }} />
          ))}
        </div>
      </div>

      {/* Skeleton: Investment metrics grid */}
      <div style={S.skelCard}>
        <div style={{ ...bar("25%", 10), marginBottom: 16 }} />
        <div className="az-m-grid">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} style={{
              padding: "18px 16px 14px", borderRadius: 14,
              background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)",
              borderLeft: "3px solid rgba(255,255,255,0.08)",
            }}>
              <div style={bar("55%", 8)} />
              <div style={{ ...bar("70%", 20), marginBottom: 0 }} />
            </div>
          ))}
        </div>
      </div>

      {/* Skeleton: AI Reasoning */}
      <div style={S.skelCard}>
        <div style={{ ...bar("30%", 10), marginBottom: 16 }} />
        <div style={bar("100%", 12)} />
        <div style={bar("95%", 12)} />
        <div style={bar("88%", 12)} />
        <div style={bar("72%", 12)} />
        {/* Key factor badges */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const, marginTop: 6 }}>
          {[64, 80, 56, 72].map((w, i) => (
            <div key={i} style={{ ...bar(`${w}px`, 22), borderRadius: 99, marginBottom: 0 }} />
          ))}
        </div>
      </div>

      {/* Skeleton: Comparables */}
      <div style={S.skelCard}>
        <div style={{ ...bar("35%", 10), marginBottom: 16 }} />
        <div className="az-comp-grid">
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ padding: 12, borderRadius: 12, background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={bar("80%", 8)} />
              <div style={{ ...bar("50%", 18), marginBottom: 6 }} />
              <div style={{ ...bar("35%", 8), marginBottom: 0 }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MetricTile({ label, value, sub, accent = "var(--accent-9)", valueColor }: {
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

/* ================================================================
   MAIN
   ================================================================ */

function isValidListingUrl(url: string): boolean {
  if (!/^https?:\/\//i.test(url)) return false;
  try {
    const hostname = new URL(url).hostname;
    return hostname === "999.md" || hostname.endsWith(".999.md")
      || hostname === "imobiliare.ro" || hostname.endsWith(".imobiliare.ro");
  } catch {
    return false;
  }
}

const ANALYZER_URL = process.env.NEXT_PUBLIC_ANALYZER_URL ?? "http://localhost:8005";

export function AnalyzerContent({ initialUrl }: { initialUrl?: string }) {
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [inputUrl, setInputUrl] = useState("");
  const [copied, setCopied] = useState(false);

  const handleCopySummary = useCallback(() => {
    if (!result || !result.valuation || !result.listing) return;
    const vl = result.valuation;
    const ll = result.listing;
    const lines = [
      ll.title,
      `Verdict: ${VERDICT_LABEL[vl.verdict] ?? vl.verdict} (${vl.price_deviation_pct != null ? `${vl.price_deviation_pct > 0 ? "+" : ""}${vl.price_deviation_pct.toFixed(1)}` : "N/A"}% vs fair value)`,
      `Asking: \u20AC${ll.price_eur != null ? ll.price_eur.toLocaleString() : "N/A"} | Fair: \u20AC${vl.fair_value_eur_per_m2 != null ? vl.fair_value_eur_per_m2.toLocaleString() : "N/A"}/m\u00B2`,
      `Investment Score: ${vl.investment_score != null ? vl.investment_score.toFixed(1) : "N/A"}/10 | Recommendation: ${vl.recommendation ? REC_LABEL[vl.recommendation] : "N/A"}`,
      `Rent: \u20AC${vl.rental_estimate_eur != null ? vl.rental_estimate_eur.toLocaleString() : "N/A"}/mo | Gross Yield: ${vl.rental_yield_pct != null ? vl.rental_yield_pct.toFixed(1) : "N/A"}% | Breakeven: ${vl.breakeven_years != null ? vl.breakeven_years.toFixed(1) : "N/A"}yr`,
      `Liquidity: ${vl.liquidity ?? "N/A"} | Trend: ${vl.price_trend ?? "N/A"}`,
      `URL: ${result.url}`,
    ];
    navigator.clipboard.writeText(lines.join("\n")).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [result]);

  const analyzeUrl = useCallback(async (url: string) => {
    if (!isValidListingUrl(url)) {
      setError("Please enter a valid URL from 999.md or imobiliare.ro");
      return;
    }
    setError(null);
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`${ANALYZER_URL}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      if (!res.ok) throw new Error(`Backend returned ${res.status}`);
      const data: Result = await res.json();
      await fetch("/api/save-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      setResult(data);
    } catch (err) {
      setError(`Analysis failed: ${err instanceof Error ? err.message : String(err)}. Make sure the backend is running (${ANALYZER_URL}).`);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = inputUrl.trim();
    if (!trimmed) return;
    if (!isValidListingUrl(trimmed)) {
      setError("Please enter a valid URL from 999.md or imobiliare.ro");
      return;
    }
    analyzeUrl(trimmed);
  };

  useEffect(() => {
    if (!initialUrl) {
      fetch("/api/save-analysis?limit=1")
        .then((r) => {
          if (!r.ok) throw new Error(`GET /api/save-analysis returned ${r.status}`);
          return r.json();
        })
        .then((res) => {
          const items: Result[] = res.data?.items ?? res ?? [];
          if (items.length > 0) setResult(items[0]);
        })
        .catch(() => setError("Failed to load analyses."));
      return;
    }
    setError(null);
    setLoading(true);
    fetch(`/api/save-analysis?url=${encodeURIComponent(initialUrl)}`)
      .then((r) => {
        if (!r.ok) throw new Error(`GET /api/save-analysis returned ${r.status}`);
        return r.json();
      })
      .then(async (res) => {
        const items: Result[] = res.data?.items ?? res ?? [];
        
        if (items.length > 0) { setResult(items[0]); setLoading(false); return; }
        await analyzeUrl(initialUrl);
      })
      .catch(() => { setError("Failed to load saved analyses."); setLoading(false); });
  }, [initialUrl, analyzeUrl]);

  const v = result?.valuation;
  const l = result?.listing;

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-background)" }}>
      <Topbar />

      <style>{`
        @keyframes az-spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes az-shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes az-pulse { 0%,100%{opacity:1;transform:scale(1);box-shadow:0 0 8px var(--accent-7)} 50%{opacity:.5;transform:scale(.85);box-shadow:0 0 16px var(--accent-9)} }
        @keyframes az-fadeup { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }

        .az-input-row { display:flex; gap:12px; align-items:stretch }
        .az-skel-metrics { display:grid; grid-template-columns:repeat(4,1fr); gap:12px }
        .az-skel-detail { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; margin-top:8px }
        .az-opps-risks { display:grid; grid-template-columns:1fr 1fr; gap:16px }
        .az-stats-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(140px,1fr)); gap:16px; margin-bottom:20px }
        .az-m-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(170px,1fr)); gap:12px }
        .az-score-grid { display:grid; grid-template-columns:1fr 1fr; gap:0.75rem }
        .az-comp-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:12px }

        @media (max-width: 640px) {
          .az-input-row { flex-direction:column }
          .az-skel-metrics { grid-template-columns:repeat(2,1fr) }
          .az-skel-detail { grid-template-columns:1fr }
          .az-opps-risks { grid-template-columns:1fr }
          .az-stats-grid { grid-template-columns:repeat(2,1fr) }
          .az-m-grid { grid-template-columns:1fr }
          .az-score-grid { grid-template-columns:1fr }
          .az-comp-grid { grid-template-columns:1fr }
        }
      `}</style>

      <Box px="5" style={{ maxWidth: 1280, margin: "0 auto" }}>

        {/* ======== 1. URL INPUT ======== */}
        <div style={S.inputSection}>
          <div style={S.inputGlow} />
          <div style={{ position: "relative" }}>
            <Text size="1" weight="bold" as="p" mb="2"
              style={{ textTransform: "uppercase", letterSpacing: "0.15em", color: "var(--accent-11)" }}>
              AI-Powered Valuation
            </Text>
            <h1 style={{
              fontSize: "2.25rem", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.15,
              margin: "0 0 8px",
              background: "linear-gradient(135deg, #fff 0%, var(--accent-9) 100%)",
              WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>
              Apartment Analyzer
            </h1>
            <Text color="gray" size="2" mb="5" as="p" style={{ maxWidth: 520, lineHeight: 1.6 }}>
              Paste any listing URL to get an instant valuation report with comparables,
              investment metrics, and a buy/hold/avoid recommendation.
            </Text>

            <form onSubmit={handleSubmit} aria-busy={loading}>
              <div style={S.inputCard}>
                <div className="az-input-row">
                  <input
                    type="url"
                    value={inputUrl}
                    onChange={(e) => setInputUrl(e.target.value)}
                    placeholder="Paste a listing URL from 999.md or imobiliare.ro"
                    aria-label="Listing URL"
                    style={S.urlInput}
                    onFocus={(e) => { e.currentTarget.style.borderColor = "var(--accent-7)"; e.currentTarget.style.boxShadow = "0 0 0 3px var(--accent-3), 0 0 20px var(--accent-4)"; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.boxShadow = "none"; }}
                  />
                  <button
                    type="submit"
                    disabled={loading || !inputUrl.trim()}
                    aria-disabled={loading || !inputUrl.trim()}
                    style={{ ...S.analyzeBtn, ...(loading || !inputUrl.trim() ? S.analyzeBtnOff : {}) }}
                    onMouseEnter={(e) => { if (!loading && inputUrl.trim()) { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 6px 28px rgba(124,58,237,0.35)"; } }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(124,58,237,0.25)"; }}
                  >
                    {loading ? (
                      <>
                        <span style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "az-spin 0.6s linear infinite", display: "inline-block" }} />
                        Analyzing...
                      </>
                    ) : "Analyze"}
                  </button>
                </div>
                <div style={S.sourceRow}>
                  <Text size="1" color="gray">Supported:</Text>
                  <span style={S.sourceBadge}>999.md</span>
                  <span style={S.sourceBadge}>imobiliare.ro</span>
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* ======== 2. LOADING ======== */}
        {loading && <LoadingSkeleton />}

        {error && !loading && (
          <div role="alert" style={{ padding: "16px 20px", borderRadius: 12, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", marginBottom: 24 }}>
            <Text color="red" size="2">{error}</Text>
          </div>
        )}

        {/* ======== 3. RESULT ======== */}
        {result && v && l && !loading && (
          <Flex direction="column" gap="5" pb="8" style={{ animation: "az-fadeup 0.4s ease both" }}>

            {/* 3a. VERDICT HERO */}
            <div aria-label={`Verdict: ${VERDICT_LABEL[v.verdict]}${v.price_deviation_pct != null ? `, ${v.price_deviation_pct > 0 ? "+" : ""}${v.price_deviation_pct.toFixed(1)}% vs fair value` : ""}`} style={{
              textAlign: "center", padding: "36px 24px 28px", borderRadius: 20,
              background: VERDICT_BG[v.verdict] ?? VERDICT_BG.fair,
              border: `1px solid ${VERDICT_BORDER[v.verdict] ?? VERDICT_BORDER.fair}`,
              position: "relative", overflow: "hidden",
            }}>
              <div style={{ ...S.vBadge, color: v.verdict === "undervalued" ? "var(--green-11)" : v.verdict === "overvalued" ? "var(--red-11)" : "var(--blue-11)" }}>
                {VERDICT_LABEL[v.verdict]}
              </div>

              {v.price_deviation_pct != null && (
                <Text size="4" weight="bold" as="p" mt="1" style={{
                  color: v.price_deviation_pct < 0 ? "var(--green-11)" : v.price_deviation_pct > 0 ? "var(--red-11)" : "var(--gray-11)",
                }}>
                  {v.price_deviation_pct > 0 ? "+" : ""}{v.price_deviation_pct.toFixed(1)}% vs. fair value
                </Text>
              )}

              <div style={S.confMeter}>
                <Text size="1" color="gray" weight="bold" style={{ textTransform: "uppercase", letterSpacing: "0.08em" }}>Confidence</Text>
                <div style={S.confTrack} role="progressbar" aria-valuenow={Math.round(v.confidence * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Confidence">
                  <div style={{
                    width: `${v.confidence * 100}%`, height: "100%", borderRadius: 3, transition: "width 0.8s ease",
                    background: v.confidence >= 0.75 ? "var(--green-9)" : v.confidence >= 0.5 ? "var(--amber-9)" : "var(--red-9)",
                  }} />
                </div>
                <Text size="1" weight="bold">{(v.confidence * 100).toFixed(0)}%</Text>
              </div>

              {v.recommendation && (
                <div>
                  <Badge size="3" variant="solid" color={REC_COLOR[v.recommendation]} style={S.recPill}>
                    {REC_LABEL[v.recommendation]}
                  </Badge>
                </div>
              )}
            </div>

            {/* 3b. LISTING + KEY PRICES */}
            <div style={S.glass}>
              <Text size="1" color="gray" as="p" mb="1" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {result.source.toUpperCase()} listing
              </Text>
              <Flex align="center" gap="2" mb="3">
                <h2 style={{ fontSize: "1.25rem", fontWeight: 700, lineHeight: 1.3, margin: 0, color: "var(--gray-12)", letterSpacing: "-0.01em" }}>
                  {l.title}
                </h2>
                <a
                  href={result.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Open original listing"
                  style={{
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                    color: "var(--gray-9)", transition: "color 0.2s, border-color 0.2s",
                    textDecoration: "none",
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 8.667V12.667A1.333 1.333 0 0 1 10.667 14H3.333A1.333 1.333 0 0 1 2 12.667V5.333A1.333 1.333 0 0 1 3.333 4H7.333" />
                    <path d="M10 2H14V6" />
                    <path d="M6.667 9.333L14 2" />
                  </svg>
                </a>
              </Flex>

              <div className="az-stats-grid">
                {l.price_eur != null && (
                  <div style={S.statBox}>
                    <Text size="1" color="gray" as="p" style={{ textTransform: "uppercase", fontSize: 10, letterSpacing: "0.06em", fontWeight: 600 }}>Asking</Text>
                    <Text size="5" weight="bold" as="p">{"\u20AC"}{l.price_eur.toLocaleString()}</Text>
                  </div>
                )}
                {l.price_per_m2 != null && (
                  <div style={S.statBox}>
                    <Text size="1" color="gray" as="p" style={{ textTransform: "uppercase", fontSize: 10, letterSpacing: "0.06em", fontWeight: 600 }}>
                      Per m{"\u00B2"}{l.parking_included && l.parking_price_eur != null && " (w/ park.)"}{l.parking_included === false && " (apt)"}
                    </Text>
                    <Text size="5" weight="bold" as="p">{"\u20AC"}{l.price_per_m2.toLocaleString()}</Text>
                    {l.parking_included && l.parking_price_eur != null && l.size_m2 != null && (
                      <Text size="1" color="gray" as="p">apt only: {"\u20AC"}{Math.round((l.price_eur! - l.parking_price_eur) / l.size_m2).toLocaleString()}/m{"\u00B2"}</Text>
                    )}
                  </div>
                )}
                {v.fair_value_eur_per_m2 != null && (
                  <div style={S.statBox}>
                    <Text size="1" color="gray" as="p" style={{ textTransform: "uppercase", fontSize: 10, letterSpacing: "0.06em", fontWeight: 600 }}>Fair / m{"\u00B2"}</Text>
                    <Text size="5" weight="bold" as="p">{"\u20AC"}{v.fair_value_eur_per_m2.toLocaleString()}</Text>
                    {v.fair_value_low_eur_per_m2 != null && v.fair_value_high_eur_per_m2 != null && (
                      <Text size="1" color="gray" as="p">{"\u20AC"}{v.fair_value_low_eur_per_m2.toLocaleString()}{" \u2013 "}{"\u20AC"}{v.fair_value_high_eur_per_m2.toLocaleString()}</Text>
                    )}
                    {v.fair_price_eur && <Text size="1" color="gray" as="p">Total: {"\u20AC"}{v.fair_price_eur.toLocaleString()}</Text>}
                  </div>
                )}
                {v.investment_score != null && (
                  <div style={S.statBox}>
                    <Text size="1" color="gray" as="p" style={{ textTransform: "uppercase", fontSize: 10, letterSpacing: "0.06em", fontWeight: 600 }}>Score</Text>
                    <Flex align="baseline" gap="1" justify="center">
                      <Text size="5" weight="bold" color={v.investment_score >= 7 ? "green" : v.investment_score >= 5 ? undefined : "red"}>
                        {v.investment_score.toFixed(1)}
                      </Text>
                      <Text size="1" color="gray">/10</Text>
                    </Flex>
                  </div>
                )}
              </div>

              <Flex gap="2" wrap="wrap" mb="2">
                {l.city && <span style={S.pill}><span style={S.pillLabel}>City</span> {l.city}</span>}
                {l.zone && <span style={S.pill}><span style={S.pillLabel}>Zone</span> {l.zone}</span>}
                {l.size_m2 != null && <span style={S.pill}><span style={S.pillLabel}>Size</span> {l.size_m2} m{"\u00B2"}</span>}
                {l.rooms != null && <span style={S.pill}><span style={S.pillLabel}>Rooms</span> {l.rooms}</span>}
                {l.floor != null && <span style={S.pill}><span style={S.pillLabel}>Floor</span> {l.floor}{l.total_floors ? `/${l.total_floors}` : ""}</span>}
                {l.condition && <span style={S.pill}><span style={S.pillLabel}>Condition</span> {l.condition}</span>}
                {l.parking_included != null && (
                  <span style={S.pill}>
                    <span style={S.pillLabel}>Parking</span>{" "}
                    {l.parking_included
                      ? <span style={{ color: "var(--green-11)" }}>incl.{l.parking_price_eur != null ? ` (~\u20AC${l.parking_price_eur.toLocaleString()})` : ""}</span>
                      : <span style={{ color: "var(--orange-11)" }}>separate{l.parking_price_eur != null ? ` (\u20AC${l.parking_price_eur.toLocaleString()})` : ""}</span>}
                  </span>
                )}
              </Flex>
            </div>

            {/* 3b2. NEIGHBORHOOD PROFILE */}
            {(result.zone_stats || v.neighborhood_stage) && (
              <NeighborhoodStageCard
                zone={l.zone}
                stage={v.neighborhood_stage}
                zoneStats={result.zone_stats}
                listingPricePerM2={l.price_per_m2}
              />
            )}

            {/* 3c. OPPORTUNITIES & RISKS */}
            {(v.opportunity_factors.length > 0 || v.risk_factors.length > 0) && (
              <div className="az-opps-risks">
                {v.opportunity_factors.length > 0 && (
                  <div style={{ ...S.glass, borderLeft: "3px solid var(--green-9)" }}>
                    <div style={{ ...S.secLabel, color: "var(--green-11)" }}>Opportunities</div>
                    {v.opportunity_factors.map((f, i) => (
                      <Flex key={i} gap="2" mb="2" align="start">
                        <span style={{ color: "var(--green-9)", fontWeight: 700, flexShrink: 0, fontSize: 14, lineHeight: "20px" }}>+</span>
                        <Text size="2" style={{ lineHeight: 1.5 }}>{f}</Text>
                      </Flex>
                    ))}
                  </div>
                )}
                {v.risk_factors.length > 0 && (
                  <div style={{ ...S.glass, borderLeft: "3px solid var(--red-9)" }}>
                    <div style={{ ...S.secLabel, color: "var(--red-11)" }}>Risks</div>
                    {v.risk_factors.map((f, i) => (
                      <Flex key={i} gap="2" mb="2" align="start">
                        <span style={{ color: "var(--red-9)", fontWeight: 700, flexShrink: 0, fontSize: 14, lineHeight: "20px" }}>{"\u2212"}</span>
                        <Text size="2" style={{ lineHeight: 1.5 }}>{f}</Text>
                      </Flex>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 3c2. ENVIRONMENTAL CONTEXT */}
            {result.environmental && result.environmental.hazards.length > 0 && (
              <EnvironmentalCard env={result.environmental} />
            )}

            {/* 3c3. RENTAL MARKET INTELLIGENCE */}
            {result.rental_market && result.rental_market.sample_count > 0 && (
              <div style={{ ...S.glass, borderLeft: "3px solid var(--blue-9)" }}>
                <div style={{ ...S.secLabel, color: "var(--blue-11)" }}>Rental Market Intelligence</div>
                <Flex gap="3" wrap="wrap" mb="3">
                  <Flex align="center" gap="1">
                    <Text size="1" color="gray" weight="bold" style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>Median Rent</Text>
                    <Text size="4" weight="bold">{"\u20AC"}{result.rental_market.median_rent.toLocaleString()}/mo</Text>
                  </Flex>
                  <Text size="1" color="gray">&middot;</Text>
                  <Flex align="center" gap="1">
                    <Text size="1" color="gray" weight="bold" style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>Range</Text>
                    <Text size="1" color="gray">{"\u20AC"}{result.rental_market.min_rent}{" \u2013 "}{"\u20AC"}{result.rental_market.max_rent}</Text>
                  </Flex>
                  <Text size="1" color="gray">&middot;</Text>
                  <Text size="1" color="gray">{result.rental_market.sample_count} listing{result.rental_market.sample_count !== 1 ? "s" : ""}</Text>
                  {result.rental_market.rent_per_m2_avg != null && (
                    <>
                      <Text size="1" color="gray">&middot;</Text>
                      <Text size="1" color="gray">{"\u20AC"}{result.rental_market.rent_per_m2_avg.toFixed(1)}/m{"\u00B2"}/mo</Text>
                    </>
                  )}
                </Flex>
                {/* LLM vs Market comparison */}
                {result.validated_yield && (
                  <Flex gap="4" wrap="wrap" mb="2">
                    <div style={{ flex: "1 1 140px", padding: "12px 14px", borderRadius: 10, background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.12)" }}>
                      <Text size="1" color="gray" weight="bold" style={{ textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 4 }}>Market Data</Text>
                      <Text size="4" weight="bold" style={{ color: "var(--blue-11)" }}>{"\u20AC"}{result.validated_yield.market_rent}/mo</Text>
                      <Flex gap="2" mt="1">
                        <Badge size="1" variant="soft" color="blue">Gross {result.validated_yield.gross_yield_pct.toFixed(1)}%</Badge>
                        <Badge size="1" variant="soft" color="teal">Net {result.validated_yield.net_yield_pct.toFixed(1)}%</Badge>
                      </Flex>
                    </div>
                    {result.validated_yield.llm_estimate != null && (
                      <div style={{ flex: "1 1 140px", padding: "12px 14px", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <Text size="1" color="gray" weight="bold" style={{ textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 4 }}>LLM Estimate</Text>
                        <Text size="4" weight="bold">{"\u20AC"}{result.validated_yield.llm_estimate}/mo</Text>
                        <Flex gap="2" mt="1">
                          <Badge size="1" variant="soft" color={result.validated_yield.rent_confidence === "high" ? "green" : result.validated_yield.rent_confidence === "medium" ? "orange" : "red"}>
                            {result.validated_yield.rent_confidence} confidence
                          </Badge>
                        </Flex>
                      </div>
                    )}
                  </Flex>
                )}
              </div>
            )}

            {/* 3c4. RENOVATION ESTIMATE */}
            {result.renovation && (
              <div style={{ ...S.glass, borderLeft: "3px solid var(--teal-9)" }}>
                <div style={{ ...S.secLabel, color: "var(--teal-11)" }}>Renovation Estimate</div>
                <Flex gap="3" wrap="wrap" mb="3" align="center">
                  <Badge size="2" variant="soft" color="teal" style={{ textTransform: "capitalize" }}>{result.renovation.scope}</Badge>
                  <Text size="4" weight="bold">{"\u20AC"}{result.renovation.total_cost_eur.toLocaleString()}</Text>
                  <Text size="1" color="gray">{"\u20AC"}{result.renovation.cost_per_m2.toFixed(0)}/m{"\u00B2"}</Text>
                  <Text size="1" color="gray">&middot;</Text>
                  <Text size="1" color="gray">{result.renovation.duration_weeks} weeks</Text>
                  {result.renovation.roi_pct != null && (
                    <>
                      <Text size="1" color="gray">&middot;</Text>
                      <Badge size="1" variant="soft" color={result.renovation.roi_pct > 50 ? "green" : result.renovation.roi_pct > 0 ? "teal" : "red"}>
                        ROI {result.renovation.roi_pct.toFixed(0)}%
                      </Badge>
                    </>
                  )}
                </Flex>
                {/* Itemized breakdown */}
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {result.renovation.items.map((item, i) => (
                    <Flex key={i} justify="between" align="center" style={{ padding: "6px 10px", borderRadius: 6, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                      <Flex gap="2" align="center" style={{ flex: 1, minWidth: 0 }}>
                        <Text size="1" weight="bold" style={{ textTransform: "capitalize", color: "var(--gray-11)", minWidth: 70 }}>{item.category}</Text>
                        <Text size="1" color="gray" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.description}</Text>
                      </Flex>
                      <Text size="1" weight="bold" style={{ flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>{"\u20AC"}{item.cost_eur.toLocaleString()}</Text>
                    </Flex>
                  ))}
                </div>
                {result.renovation.post_renovation_value != null && l.price_eur != null && (
                  <Flex justify="between" align="center" mt="3" style={{ padding: "10px 12px", borderRadius: 8, background: "rgba(45,212,191,0.06)", border: "1px solid rgba(45,212,191,0.12)" }}>
                    <Text size="1" color="gray">Post-renovation value</Text>
                    <Flex gap="2" align="center">
                      <Text size="1" color="gray" style={{ textDecoration: "line-through" }}>{"\u20AC"}{l.price_eur.toLocaleString()}</Text>
                      <Text size="2" weight="bold" style={{ color: "var(--teal-11)" }}>{"\u20AC"}{result.renovation.post_renovation_value.toLocaleString()}</Text>
                    </Flex>
                  </Flex>
                )}
              </div>
            )}

            {/* 3d. INVESTMENT METRICS DASHBOARD */}
            {(v.rental_estimate_eur != null || v.total_cost_eur != null || v.liquidity != null || v.price_trend != null || v.price_to_rent_ratio != null || v.time_on_market_weeks != null || v.renovation_upside_pct != null) && (
              <div style={S.glass}>
                <div style={S.secLabel}>Investment Metrics</div>
                <div className="az-m-grid">
                  {v.rental_estimate_eur != null && <MetricTile label="Est. Monthly Rent" value={`\u20AC${v.rental_estimate_eur.toLocaleString()}`} accent="var(--blue-9)" />}
                  {v.rental_yield_pct != null && (
                    <MetricTile label="Gross Yield" value={`${v.rental_yield_pct.toFixed(1)}%`}
                      accent={v.rental_yield_pct >= 6 ? "var(--green-9)" : v.rental_yield_pct >= 4 ? "var(--amber-9)" : "var(--red-9)"}
                      valueColor={v.rental_yield_pct >= 6 ? "var(--green-11)" : v.rental_yield_pct >= 4 ? "var(--amber-11)" : "var(--red-11)"} />
                  )}
                  {v.net_yield_pct != null && <MetricTile label="Net Yield" value={`${v.net_yield_pct.toFixed(1)}%`} accent="var(--teal-9)" valueColor="var(--teal-11)" />}
                  {v.negotiation_margin_pct != null && <MetricTile label="Negotiation Margin" value={`${v.negotiation_margin_pct.toFixed(1)}%`} accent="var(--orange-9)" valueColor="var(--orange-11)" />}
                  {v.total_cost_eur != null && <MetricTile label="Total Acq. Cost" value={`\u20AC${v.total_cost_eur.toLocaleString()}`} sub={`incl. fees${l.parking_included === false && l.parking_price_eur ? " + parking" : ""}`} accent="var(--gray-8)" />}
                  {v.price_to_rent_ratio != null && (
                    <MetricTile label="Price-to-Rent" value={`${v.price_to_rent_ratio.toFixed(1)}\u00D7`}
                      accent={v.price_to_rent_ratio < 12 ? "var(--green-9)" : v.price_to_rent_ratio < 18 ? "var(--amber-9)" : "var(--red-9)"}
                      valueColor={v.price_to_rent_ratio < 12 ? "var(--green-11)" : v.price_to_rent_ratio < 18 ? "var(--amber-11)" : "var(--gray-11)"} />
                  )}
                  {v.breakeven_years != null && <MetricTile label="Breakeven" value={`${v.breakeven_years.toFixed(1)} yrs`} accent="var(--iris-9)" />}
                  {v.appreciation_pct_1y != null && (
                    <MetricTile label="Est. 1Y Appreciation" value={`+${v.appreciation_pct_1y.toFixed(1)}%`}
                      accent={v.appreciation_pct_1y >= 5 ? "var(--green-9)" : "var(--gray-8)"}
                      valueColor={v.appreciation_pct_1y >= 5 ? "var(--green-11)" : undefined} />
                  )}
                  {v.time_on_market_weeks != null && (
                    <MetricTile
                      label="Time on Market"
                      value={v.time_on_market_weeks < 4 ? `${Math.round(v.time_on_market_weeks * 7)} days` : `${v.time_on_market_weeks.toFixed(0)} wks`}
                      accent={v.time_on_market_weeks <= 6 ? "var(--green-9)" : v.time_on_market_weeks <= 16 ? "var(--amber-9)" : "var(--orange-9)"}
                      valueColor={v.time_on_market_weeks <= 6 ? "var(--green-11)" : v.time_on_market_weeks <= 16 ? undefined : "var(--orange-11)"} />
                  )}
                  {v.renovation_upside_pct != null && <MetricTile label="Reno Upside" value={`+${v.renovation_upside_pct.toFixed(0)}%`} sub="if renovated" accent="var(--teal-9)" valueColor="var(--teal-11)" />}
                </div>

                {(v.liquidity != null || v.price_trend != null) && (
                  <Flex gap="3" wrap="wrap" mt="4">
                    {v.liquidity != null && (
                      <Flex align="center" gap="2">
                        <Text size="1" color="gray" weight="bold" style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>Liquidity</Text>
                        <Badge size="1" variant="soft" color={v.liquidity === "high" ? "green" : v.liquidity === "medium" ? "orange" : "red"}>{v.liquidity}</Badge>
                      </Flex>
                    )}
                    {v.price_trend != null && (
                      <Flex align="center" gap="2">
                        <Text size="1" color="gray" weight="bold" style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>Trend</Text>
                        <Badge size="1" variant="soft" color={v.price_trend === "rising" ? "green" : v.price_trend === "stable" ? "blue" : "red"}>
                          {v.price_trend === "rising" ? "\u2191 rising" : v.price_trend === "stable" ? "\u2192 stable" : "\u2193 declining"}
                        </Badge>
                      </Flex>
                    )}
                  </Flex>
                )}
              </div>
            )}

            {/* 3e. SCORE BREAKDOWN */}
            {v.score_breakdown && (
              <div style={S.glass}>
                <div style={S.secLabel}>Score Breakdown</div>
                <Box className="az-score-grid">
                  <ScoreBar label="Price" value={v.score_breakdown.price_score} />
                  <ScoreBar label="Location" value={v.score_breakdown.location_score} />
                  <ScoreBar label="Condition" value={v.score_breakdown.condition_score} />
                  <ScoreBar label="Market" value={v.score_breakdown.market_score} />
                </Box>
              </div>
            )}

            {/* 3f. MARKET CONTEXT & AI REASONING */}
            <div style={S.glass}>
              {(v.market_context || v.neighborhood_stage) && (
                <Box mb="4">
                  <Flex align="center" gap="2" mb="2">
                    <span style={{ ...S.secLabel, marginBottom: 0 }}>Market Context</span>
                    {v.neighborhood_stage && (
                      <Badge size="1" variant="soft" color={
                        v.neighborhood_stage === "early_growth" ? "green"
                        : v.neighborhood_stage === "maturing" ? "teal"
                        : v.neighborhood_stage === "established" ? "blue" : "red"
                      }>
                        {v.neighborhood_stage === "early_growth" ? "\u2191 Early Growth"
                          : v.neighborhood_stage === "maturing" ? "\u2197 Maturing"
                          : v.neighborhood_stage === "established" ? "\u2192 Established" : "\u2193 Declining"}
                      </Badge>
                    )}
                  </Flex>
                  {v.market_context && <Text size="2" as="p" style={{ lineHeight: 1.7 }} color="gray">{v.market_context}</Text>}
                  {v.neighborhood_stage && (
                    <Text size="1" as="p" style={{
                      lineHeight: 1.6,
                      marginTop: 10,
                      padding: "8px 12px",
                      borderRadius: 8,
                      background: v.neighborhood_stage === "early_growth" ? "rgba(34,197,94,0.06)"
                        : v.neighborhood_stage === "maturing" ? "rgba(45,212,191,0.06)"
                        : v.neighborhood_stage === "established" ? "rgba(59,130,246,0.06)"
                        : "rgba(239,68,68,0.06)",
                      border: v.neighborhood_stage === "early_growth" ? "1px solid rgba(34,197,94,0.12)"
                        : v.neighborhood_stage === "maturing" ? "1px solid rgba(45,212,191,0.12)"
                        : v.neighborhood_stage === "established" ? "1px solid rgba(59,130,246,0.12)"
                        : "1px solid rgba(239,68,68,0.12)",
                      color: v.neighborhood_stage === "early_growth" ? "var(--green-11)"
                        : v.neighborhood_stage === "maturing" ? "var(--teal-11)"
                        : v.neighborhood_stage === "established" ? "var(--blue-11)"
                        : "var(--red-11)",
                      fontStyle: "italic",
                    }}>
                      {v.neighborhood_stage === "early_growth"
                        ? "Emerging area with rising prices and new infrastructure. Higher risk but potential for above-market returns."
                        : v.neighborhood_stage === "maturing"
                        ? "Growth stabilizing with established amenities. Balanced risk/reward profile."
                        : v.neighborhood_stage === "established"
                        ? "Blue-chip zone with stable demand and premium pricing. Lower risk, steady appreciation."
                        : "Aging stock with reduced demand. Consider renovation potential or avoid for buy-to-let."}
                    </Text>
                  )}
                  <Separator my="4" size="4" />
                </Box>
              )}
              <div style={{ ...S.secLabel, color: "var(--accent-11)" }}>AI Analysis (DeepSeek)</div>
              <Text size="2" as="p" style={{ lineHeight: 1.7 }}>{v.reasoning}</Text>
              {v.key_factors.length > 0 && (
                <Flex gap="2" wrap="wrap" mt="3">
                  {v.key_factors.map((f, i) => <Badge key={i} variant="soft" color="gray" size="1">{f}</Badge>)}
                </Flex>
              )}
            </div>

            {/* 3g. COMPARABLES */}
            {result.comparables.length > 0 && (
              <div style={S.glass}>
                <div style={S.secLabel}>Similar Listings on 999.md</div>
                {result.zone_stats && result.zone_stats.min_price_per_m2 != null && result.zone_stats.max_price_per_m2 != null && (
                  <Box mb="4">
                    <Flex justify="between" wrap="wrap" gap="1" mb="1">
                      <Text size="1" color="gray">Zone avg: {"\u20AC"}{result.zone_stats.avg_price_per_m2?.toLocaleString()}/m{"\u00B2"} {"\u00B7"} {result.zone_stats.count} listings</Text>
                      <Text size="1" color="gray">Range: {"\u20AC"}{result.zone_stats.min_price_per_m2.toLocaleString()} {"\u2013"} {"\u20AC"}{result.zone_stats.max_price_per_m2.toLocaleString()}</Text>
                    </Flex>
                    <ZonePriceBar min={result.zone_stats.min_price_per_m2} max={result.zone_stats.max_price_per_m2} avg={result.zone_stats.avg_price_per_m2} listing={l.price_per_m2} />
                  </Box>
                )}
                <div className="az-comp-grid">
                  {result.comparables.map((comp, i) => <ComparableCard key={i} comp={comp} />)}
                </div>
              </div>
            )}

            {/* 3h. PRICE HISTORY */}
            {result.price_history && result.price_history.length > 1 && <PriceHistoryCard history={result.price_history} />}

            {/* Footer attribution */}
            <div style={S.fRow}>
              <Text size="1" color="gray">Source: {result.source} {"\u00B7"} Confidence: {(v.confidence * 100).toFixed(0)}%</Text>
              <Flex align="center" gap="3">
                <Text size="1" color="gray">{new Date(result.analyzed_at).toLocaleString()}</Text>
                <button
                  onClick={handleCopySummary}
                  style={{
                    background: "none",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 6,
                    padding: "4px 12px",
                    color: copied ? "var(--green-11)" : "var(--gray-9)",
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    transition: "color 0.2s, border-color 0.2s",
                  }}
                  onMouseEnter={(e) => { if (!copied) e.currentTarget.style.color = "var(--gray-11)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"; }}
                  onMouseLeave={(e) => { if (!copied) e.currentTarget.style.color = "var(--gray-9)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}
                >
                  {copied ? "Copied!" : "Copy Summary"}
                </button>
                <button
                  onClick={() => analyzeUrl(result.url)}
                  disabled={loading}
                  style={{
                    background: "none", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6,
                    padding: "4px 12px", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
                    textTransform: "uppercase" as const, color: "var(--gray-9)", cursor: "pointer",
                    transition: "color 0.2s, border-color 0.2s",
                  }}
                >
                  Re-analyze
                </button>
              </Flex>
            </div>
          </Flex>
        )}
      </Box>
      <Footer />
    </div>
  );
}
