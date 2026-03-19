"use client";

import { useState, useCallback, useRef, useMemo } from "react";
import Link from "next/link";
import {
  Badge,
  Box,
  Card,
  Flex,
  Heading,
  Separator,
  Text,
} from "@radix-ui/themes";

/* ------------------------------------------------------------------ */
/*  Types (mirrored from _content.tsx)                                 */
/* ------------------------------------------------------------------ */

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
  score_breakdown?: {
    price_score: number;
    location_score: number;
    condition_score: number;
    market_score: number;
  };
  fair_price_eur?: number;
  breakeven_years?: number;
  net_yield_pct?: number;
  appreciation_pct_1y?: number;
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

type Result = {
  url: string;
  source: string;
  listing: Listing;
  valuation: Valuation;
  analyzed_at: string;
  comparables: ComparableListing[];
  zone_stats: ZoneStats | null;
  price_history?: PriceSnapshot[];
};

type UrlStatus = "pending" | "analyzing" | "done" | "error";

type UrlEntry = {
  url: string;
  status: UrlStatus;
  result: Result | null;
  error: string | null;
};

type SortKey = "score" | "price" | "price_m2" | "deviation";
type FilterVerdict = "all" | "undervalued" | "fair" | "overvalued";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const ANALYZER_URL = process.env.NEXT_PUBLIC_ANALYZER_URL ?? "http://localhost:8005";
const MAX_URLS = 10;
const AVG_SECONDS_PER_URL = 25;

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

const STATUS_LABEL: Record<UrlStatus, string> = {
  pending: "Queued",
  analyzing: "Analyzing...",
  done: "Complete",
  error: "Failed",
};

/* ------------------------------------------------------------------ */
/*  Small helper components                                            */
/* ------------------------------------------------------------------ */

function InvestmentScoreBar({ score }: { score: number }) {
  const color =
    score >= 7 ? "var(--green-9)" : score >= 5 ? "var(--amber-9)" : "var(--red-9)";
  return (
    <Box style={{ height: 6, background: "var(--gray-4)", borderRadius: 3, width: "100%" }}>
      <Box
        style={{
          width: `${Math.min(score * 10, 100)}%`,
          height: "100%",
          background: color,
          borderRadius: 3,
          transition: "width 0.4s ease",
        }}
      />
    </Box>
  );
}

function StatusIcon({ status }: { status: UrlStatus }) {
  if (status === "pending") {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 20,
          height: 20,
          borderRadius: "50%",
          background: "var(--gray-3)",
          border: "2px solid var(--gray-6)",
          flexShrink: 0,
        }}
      />
    );
  }
  if (status === "analyzing") {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 20,
          height: 20,
          borderRadius: "50%",
          border: "2px solid transparent",
          borderTopColor: "var(--iris-9)",
          borderRightColor: "var(--iris-9)",
          flexShrink: 0,
          animation: "spin 0.8s linear infinite",
        }}
      />
    );
  }
  if (status === "done") {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 20,
          height: 20,
          borderRadius: "50%",
          background: "var(--green-9)",
          flexShrink: 0,
          color: "#fff",
          fontSize: 11,
          fontWeight: 700,
        }}
      >
        &#10003;
      </span>
    );
  }
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 20,
        height: 20,
        borderRadius: "50%",
        background: "var(--red-9)",
        flexShrink: 0,
        color: "#fff",
        fontSize: 12,
        fontWeight: 700,
      }}
    >
      !
    </span>
  );
}

function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = total > 0 ? (current / total) * 100 : 0;
  return (
    <Box style={{ height: 8, background: "var(--gray-3)", borderRadius: 4, width: "100%", overflow: "hidden" }}>
      <Box
        style={{
          width: `${pct}%`,
          height: "100%",
          background: "linear-gradient(90deg, var(--iris-9), var(--iris-11))",
          borderRadius: 4,
          transition: "width 0.6s cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      />
    </Box>
  );
}

function formatEta(seconds: number): string {
  if (seconds <= 0) return "finishing up...";
  const m = Math.floor(seconds / 60);
  const s = Math.ceil(seconds % 60);
  if (m > 0) return `~${m}m ${s}s remaining`;
  return `~${s}s remaining`;
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return url.slice(0, 30);
  }
}

/* ------------------------------------------------------------------ */
/*  Export helper                                                       */
/* ------------------------------------------------------------------ */

function buildExportText(results: Result[]): string {
  const sorted = [...results].sort(
    (a, b) => (b.valuation.investment_score ?? 0) - (a.valuation.investment_score ?? 0)
  );
  const lines: string[] = [
    "BATCH ANALYSIS RESULTS",
    `Generated: ${new Date().toLocaleString()}`,
    `Total listings: ${results.length}`,
    "",
    "=".repeat(60),
    "",
  ];

  sorted.forEach((r, i) => {
    lines.push(`#${i + 1} | ${r.listing.title}`);
    lines.push(`    Verdict: ${VERDICT_LABEL[r.valuation.verdict]}`);
    if (r.listing.price_eur != null) lines.push(`    Price: EUR${r.listing.price_eur.toLocaleString()}`);
    if (r.listing.price_per_m2 != null) lines.push(`    Price/m2: EUR${r.listing.price_per_m2.toLocaleString()}`);
    if (r.valuation.price_deviation_pct != null)
      lines.push(`    Deviation: ${r.valuation.price_deviation_pct > 0 ? "+" : ""}${r.valuation.price_deviation_pct.toFixed(1)}%`);
    if (r.valuation.investment_score != null)
      lines.push(`    Investment Score: ${r.valuation.investment_score.toFixed(1)}/10`);
    if (r.valuation.recommendation)
      lines.push(`    Recommendation: ${REC_LABEL[r.valuation.recommendation]}`);
    lines.push(`    Location: ${r.listing.city}${r.listing.zone ? `, ${r.listing.zone}` : ""}`);
    lines.push(`    URL: ${r.url}`);
    lines.push("");
  });

  return lines.join("\n");
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export function BatchAnalyzer() {
  const [rawInput, setRawInput] = useState("");
  const [entries, setEntries] = useState<UrlEntry[]>([]);
  const [running, setRunning] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(-1);
  const [sortBy, setSortBy] = useState<SortKey>("score");
  const [filterVerdict, setFilterVerdict] = useState<FilterVerdict>("all");
  const [copied, setCopied] = useState(false);
  const startTimeRef = useRef<number>(0);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const doneEntries = entries.filter((e) => e.status === "done" && e.result);
  const errorEntries = entries.filter((e) => e.status === "error");
  const results = doneEntries.map((e) => e.result!);

  /* ---- parse URLs ---- */
  const parseUrls = useCallback((text: string): string[] => {
    return text
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && (l.startsWith("http://") || l.startsWith("https://")))
      .slice(0, MAX_URLS);
  }, []);

  const urlCount = parseUrls(rawInput).length;
  const lineCount = rawInput.split("\n").filter((l) => l.trim().length > 0).length;
  const invalidCount = lineCount - urlCount;

  /* ---- run batch ---- */
  const runBatch = useCallback(async () => {
    const urls = parseUrls(rawInput);
    if (urls.length === 0) return;

    const initial: UrlEntry[] = urls.map((url) => ({
      url,
      status: "pending",
      result: null,
      error: null,
    }));
    setEntries(initial);
    setRunning(true);
    startTimeRef.current = Date.now();
    setElapsed(0);

    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);

    for (let i = 0; i < urls.length; i++) {
      setCurrentIdx(i);
      setEntries((prev) =>
        prev.map((e, j) => (j === i ? { ...e, status: "analyzing" } : e))
      );

      try {
        const analyzeRes = await fetch(`${ANALYZER_URL}/analyze`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: urls[i] }),
        });
        if (!analyzeRes.ok) throw new Error(`Backend returned ${analyzeRes.status}`);
        const data: Result = await analyzeRes.json();

        // Save to Neon
        await fetch("/api/save-analysis", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        setEntries((prev) =>
          prev.map((e, j) => (j === i ? { ...e, status: "done", result: data } : e))
        );
      } catch (err) {
        setEntries((prev) =>
          prev.map((e, j) =>
            j === i
              ? { ...e, status: "error", error: err instanceof Error ? err.message : "Unknown error" }
              : e
          )
        );
      }
    }

    if (timerRef.current) clearInterval(timerRef.current);
    setRunning(false);
    setCurrentIdx(-1);
  }, [rawInput, parseUrls]);

  /* ---- comparison metrics ---- */
  const bestValue =
    results.length > 0
      ? results.reduce((best, r) =>
          (r.valuation.price_deviation_pct ?? 999) < (best.valuation.price_deviation_pct ?? 999)
            ? r
            : best
        )
      : null;

  const bestInvestment =
    results.length > 0
      ? results.reduce((best, r) =>
          (r.valuation.investment_score ?? -1) > (best.valuation.investment_score ?? -1)
            ? r
            : best
        )
      : null;

  const cheapestPerM2 =
    results.length > 0
      ? results.reduce((best, r) =>
          (r.listing.price_per_m2 ?? Infinity) < (best.listing.price_per_m2 ?? Infinity)
            ? r
            : best
        )
      : null;

  const undervaluedCount = results.filter((r) => r.valuation.verdict === "undervalued").length;

  /* ---- sort & filter ---- */
  const sortedAndFiltered = useMemo(() => {
    let filtered = [...results];
    if (filterVerdict !== "all") {
      filtered = filtered.filter((r) => r.valuation.verdict === filterVerdict);
    }
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "score":
          return (b.valuation.investment_score ?? 0) - (a.valuation.investment_score ?? 0);
        case "price":
          return (a.listing.price_eur ?? Infinity) - (b.listing.price_eur ?? Infinity);
        case "price_m2":
          return (a.listing.price_per_m2 ?? Infinity) - (b.listing.price_per_m2 ?? Infinity);
        case "deviation":
          return (a.valuation.price_deviation_pct ?? 999) - (b.valuation.price_deviation_pct ?? 999);
        default:
          return 0;
      }
    });
    return filtered;
  }, [results, sortBy, filterVerdict]);

  const isWinner = (r: Result, category: "value" | "investment" | "cheapest") => {
    if (category === "value") return r.url === bestValue?.url;
    if (category === "investment") return r.url === bestInvestment?.url;
    return r.url === cheapestPerM2?.url;
  };

  /* ---- ETA ---- */
  const doneCount = doneEntries.length + errorEntries.length;
  const remaining = entries.length - doneCount;
  const avgPerItem = doneCount > 0 && elapsed > 0 ? elapsed / doneCount : AVG_SECONDS_PER_URL;
  const etaSeconds = remaining * avgPerItem;

  /* ---- export ---- */
  const handleCopy = useCallback(() => {
    const text = buildExportText(results);
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [results]);

  const hasFinished = !running && entries.length > 0;
  const hasResults = results.length > 0;

  /* ---- render ---- */
  return (
    <div>
      {/* Inline keyframes */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* Topbar */}
      <div className="yc-topbar">
        <Link href="/">
          <span className="yc-topbar-logo" />
          REAL ESTATE AI RESEARCH
        </Link>
        <Link href="/analyzer">
          <span style={{ fontSize: 13, opacity: 0.7 }}>Analyzer</span>
        </Link>
        <Link href="/dashboard">
          <span style={{ fontSize: 13, opacity: 0.7 }}>Dashboard</span>
        </Link>
        <Link href="/portfolio">
          <span style={{ fontSize: 13, opacity: 0.7 }}>Portfolio</span>
        </Link>
        <Link href="/trends">
          <span style={{ fontSize: 13, opacity: 0.7 }}>Trends</span>
        </Link>
        <span className="yc-topbar-count">Batch Mode</span>
      </div>

      <Box px="5" py="8" style={{ maxWidth: 1200, margin: "0 auto" }}>
        <Heading size="7" mb="2">
          Batch Price Analyzer
        </Heading>
        <Text color="gray" size="2" mb="6" as="p">
          Compare multiple listings side-by-side with AI-powered valuation.
        </Text>

        {/* ---- INPUT SECTION ---- */}
        <Card mb="6">
          <Flex justify="between" align="center" mb="3">
            <Heading size="3">Listing URLs</Heading>
            <Text
              size="1"
              style={{
                fontFamily: "var(--font-mono, monospace)",
                padding: "2px 10px",
                borderRadius: 6,
                background: urlCount >= MAX_URLS ? "var(--red-3)" : "var(--gray-3)",
                color: urlCount >= MAX_URLS ? "var(--red-11)" : "var(--gray-10)",
                fontWeight: 600,
                border: `1px solid ${urlCount >= MAX_URLS ? "var(--red-6)" : "var(--gray-5)"}`,
              }}
            >
              {urlCount} / {MAX_URLS}
            </Text>
          </Flex>

          <Box style={{ position: "relative" }}>
            <textarea
              value={rawInput}
              onChange={(e) => setRawInput(e.target.value)}
              placeholder="Paste multiple listing URLs, one per line&#10;&#10;https://999.md/ro/83929572&#10;https://999.md/ro/84012345&#10;https://www.imobiliare.ro/vanzare-apartamente/..."
              rows={7}
              disabled={running}
              style={{
                width: "100%",
                background: "var(--gray-2)",
                border: `1px solid ${rawInput.length > 0 && urlCount === 0 ? "var(--red-6)" : "var(--gray-5)"}`,
                borderRadius: 10,
                padding: "14px 16px",
                color: "var(--gray-12)",
                fontSize: 13,
                fontFamily: "var(--font-mono, monospace)",
                resize: "vertical",
                outline: "none",
                lineHeight: 1.8,
                transition: "border-color 0.2s ease, box-shadow 0.2s ease",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "var(--iris-7)";
                e.target.style.boxShadow = "0 0 0 3px var(--iris-3)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "var(--gray-5)";
                e.target.style.boxShadow = "none";
              }}
            />
          </Box>

          <Flex justify="between" align="center" mt="3" gap="3">
            <Flex align="center" gap="3" style={{ flexWrap: "wrap" }}>
              <Text size="1" color="gray">
                Supports 999.md and imobiliare.ro
              </Text>
              {urlCount > 0 && (
                <Badge size="1" color="iris" variant="soft">
                  {urlCount} valid URL{urlCount !== 1 ? "s" : ""} detected
                </Badge>
              )}
              {invalidCount > 0 && (
                <Badge size="1" color="red" variant="soft">
                  {invalidCount} invalid line{invalidCount !== 1 ? "s" : ""} skipped
                </Badge>
              )}
            </Flex>
            <button
              onClick={runBatch}
              disabled={running || urlCount === 0}
              style={{
                padding: "10px 28px",
                borderRadius: 10,
                border: "none",
                background:
                  running || urlCount === 0
                    ? "var(--gray-5)"
                    : "linear-gradient(135deg, var(--iris-9), var(--iris-10))",
                color: running || urlCount === 0 ? "var(--gray-8)" : "#fff",
                fontSize: 13,
                fontWeight: 600,
                cursor: running || urlCount === 0 ? "not-allowed" : "pointer",
                transition: "all 0.2s ease",
                whiteSpace: "nowrap",
                boxShadow:
                  running || urlCount === 0
                    ? "none"
                    : "0 2px 12px color-mix(in srgb, var(--iris-9) 25%, transparent)",
              }}
            >
              {running ? `Analyzing ${currentIdx + 1} of ${entries.length}...` : `Analyze ${urlCount > 0 ? urlCount : ""} URL${urlCount !== 1 ? "s" : ""}`}
            </button>
          </Flex>
        </Card>

        {/* ---- PROGRESS SECTION ---- */}
        {entries.length > 0 && running && (
          <Card mb="6">
            <Flex justify="between" align="center" mb="3">
              <Heading size="3">Progress</Heading>
              <Text size="1" color="gray" style={{ fontVariantNumeric: "tabular-nums" }}>
                {formatEta(etaSeconds)}
              </Text>
            </Flex>

            {/* Progress bar */}
            <Flex align="center" gap="3" mb="4">
              <ProgressBar current={doneCount} total={entries.length} />
              <Text
                size="2"
                weight="bold"
                style={{
                  fontVariantNumeric: "tabular-nums",
                  flexShrink: 0,
                  minWidth: 44,
                  textAlign: "right",
                }}
              >
                {doneCount}/{entries.length}
              </Text>
            </Flex>

            {/* Individual URL statuses */}
            <Flex direction="column" gap="1">
              {entries.map((entry, i) => (
                <Flex
                  key={i}
                  align="center"
                  gap="3"
                  py="2"
                  px="3"
                  style={{
                    borderRadius: 8,
                    background:
                      entry.status === "analyzing"
                        ? "color-mix(in srgb, var(--iris-9) 6%, transparent)"
                        : entry.status === "done"
                          ? "color-mix(in srgb, var(--green-9) 4%, transparent)"
                          : entry.status === "error"
                            ? "color-mix(in srgb, var(--red-9) 4%, transparent)"
                            : "transparent",
                    transition: "background 0.3s ease",
                  }}
                >
                  <StatusIcon status={entry.status} />
                  <Flex direction="column" gap="0" style={{ flex: 1, minWidth: 0 }}>
                    <Text
                      size="2"
                      weight={entry.status === "analyzing" ? "bold" : "regular"}
                      style={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {extractDomain(entry.url)}
                    </Text>
                    <Text
                      size="1"
                      color="gray"
                      style={{
                        fontFamily: "var(--font-mono, monospace)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        fontSize: 11,
                      }}
                    >
                      {entry.url}
                    </Text>
                  </Flex>
                  <Badge
                    size="1"
                    variant="soft"
                    color={
                      entry.status === "done"
                        ? "green"
                        : entry.status === "error"
                          ? "red"
                          : entry.status === "analyzing"
                            ? "iris"
                            : "gray"
                    }
                    style={{ flexShrink: 0 }}
                  >
                    {entry.status === "error" ? entry.error?.slice(0, 30) : STATUS_LABEL[entry.status]}
                  </Badge>
                </Flex>
              ))}
            </Flex>
          </Card>
        )}

        {/* ---- ERROR ENTRIES (after completion) ---- */}
        {!running && entries.some((e) => e.status === "error") && (
          <Card mb="6" style={{ border: "1px solid var(--red-6)" }}>
            <Heading size="3" mb="2" color="red">
              Failed URLs ({errorEntries.length})
            </Heading>
            {entries
              .filter((e) => e.status === "error")
              .map((entry, i) => (
                <Flex key={i} gap="2" mb="1" align="center">
                  <StatusIcon status="error" />
                  <Text
                    size="1"
                    color="red"
                    style={{
                      fontFamily: "var(--font-mono, monospace)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      flex: 1,
                    }}
                  >
                    {entry.url}
                  </Text>
                  <Text size="1" color="red" style={{ flexShrink: 0 }}>
                    {entry.error}
                  </Text>
                </Flex>
              ))}
          </Card>
        )}

        {/* ---- RESULTS ---- */}
        {hasFinished && hasResults && (
          <>
            {/* ---- SUMMARY STAT CARDS ---- */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 12,
                marginBottom: 24,
              }}
            >
              {/* Total analyzed */}
              <Box
                p="4"
                style={{
                  borderRadius: 12,
                  border: "1px solid var(--gray-5)",
                  background: "var(--gray-2)",
                  textAlign: "center",
                }}
              >
                <Text size="1" color="gray" weight="bold" as="p" style={{ textTransform: "uppercase", letterSpacing: "0.06em", fontSize: 10 }}>
                  Analyzed
                </Text>
                <Text size="6" weight="bold" as="p" style={{ fontVariantNumeric: "tabular-nums" }}>
                  {results.length}
                </Text>
                {errorEntries.length > 0 && (
                  <Text size="1" color="red" as="p">{errorEntries.length} failed</Text>
                )}
              </Box>

              {/* Undervalued */}
              <Box
                p="4"
                style={{
                  borderRadius: 12,
                  border: "1px solid var(--green-6)",
                  background: "linear-gradient(135deg, color-mix(in srgb, var(--green-9) 6%, transparent), transparent)",
                  textAlign: "center",
                }}
              >
                <Text size="1" color="green" weight="bold" as="p" style={{ textTransform: "uppercase", letterSpacing: "0.06em", fontSize: 10 }}>
                  Undervalued
                </Text>
                <Text size="6" weight="bold" color="green" as="p" style={{ fontVariantNumeric: "tabular-nums" }}>
                  {undervaluedCount}
                </Text>
                <Text size="1" color="gray" as="p">of {results.length} listings</Text>
              </Box>

              {/* Best deal */}
              {bestValue && (
                <Box
                  p="4"
                  style={{
                    borderRadius: 12,
                    border: "1px solid var(--iris-6)",
                    background: "linear-gradient(135deg, color-mix(in srgb, var(--iris-9) 6%, transparent), transparent)",
                    textAlign: "center",
                  }}
                >
                  <Text size="1" color="iris" weight="bold" as="p" style={{ textTransform: "uppercase", letterSpacing: "0.06em", fontSize: 10 }}>
                    Best Deal
                  </Text>
                  <Text size="3" weight="bold" as="p" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {bestValue.valuation.price_deviation_pct != null
                      ? `${bestValue.valuation.price_deviation_pct > 0 ? "+" : ""}${bestValue.valuation.price_deviation_pct.toFixed(1)}%`
                      : "N/A"}
                  </Text>
                  <Text size="1" color="gray" as="p" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {bestValue.listing.title}
                  </Text>
                </Box>
              )}

              {/* Top score */}
              {bestInvestment && (
                <Box
                  p="4"
                  style={{
                    borderRadius: 12,
                    border: "1px solid var(--amber-6)",
                    background: "linear-gradient(135deg, color-mix(in srgb, var(--amber-9) 6%, transparent), transparent)",
                    textAlign: "center",
                  }}
                >
                  <Text size="1" color="orange" weight="bold" as="p" style={{ textTransform: "uppercase", letterSpacing: "0.06em", fontSize: 10 }}>
                    Top Score
                  </Text>
                  <Flex align="baseline" gap="1" justify="center">
                    <Text size="6" weight="bold" as="span" style={{ fontVariantNumeric: "tabular-nums" }}>
                      {bestInvestment.valuation.investment_score?.toFixed(1) ?? "--"}
                    </Text>
                    <Text size="1" color="gray">/10</Text>
                  </Flex>
                  <Text size="1" color="gray" as="p" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {bestInvestment.listing.title}
                  </Text>
                </Box>
              )}
            </div>

            {/* ---- SORT / FILTER / EXPORT BAR ---- */}
            {results.length >= 2 && (
              <Card mb="6" style={{ padding: "12px 20px" }}>
                <Flex justify="between" align="center" gap="4" style={{ flexWrap: "wrap" }}>
                  {/* Sort */}
                  <Flex align="center" gap="3">
                    <Text size="1" color="gray" weight="bold" style={{ textTransform: "uppercase", letterSpacing: "0.06em", fontSize: 10 }}>
                      Sort by
                    </Text>
                    {(
                      [
                        { key: "score" as SortKey, label: "Score" },
                        { key: "deviation" as SortKey, label: "Deviation" },
                        { key: "price" as SortKey, label: "Price" },
                        { key: "price_m2" as SortKey, label: "Price/m2" },
                      ] as const
                    ).map(({ key, label }) => (
                      <button
                        key={key}
                        onClick={() => setSortBy(key)}
                        style={{
                          padding: "4px 12px",
                          borderRadius: 6,
                          border: `1px solid ${sortBy === key ? "var(--iris-7)" : "var(--gray-5)"}`,
                          background: sortBy === key ? "var(--iris-3)" : "transparent",
                          color: sortBy === key ? "var(--iris-11)" : "var(--gray-10)",
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </Flex>

                  {/* Filter */}
                  <Flex align="center" gap="3">
                    <Text size="1" color="gray" weight="bold" style={{ textTransform: "uppercase", letterSpacing: "0.06em", fontSize: 10 }}>
                      Filter
                    </Text>
                    {(
                      [
                        { key: "all" as FilterVerdict, label: "All" },
                        { key: "undervalued" as FilterVerdict, label: "Undervalued" },
                        { key: "fair" as FilterVerdict, label: "Fair" },
                        { key: "overvalued" as FilterVerdict, label: "Overvalued" },
                      ] as const
                    ).map(({ key, label }) => (
                      <button
                        key={key}
                        onClick={() => setFilterVerdict(key)}
                        style={{
                          padding: "4px 12px",
                          borderRadius: 6,
                          border: `1px solid ${filterVerdict === key ? "var(--iris-7)" : "var(--gray-5)"}`,
                          background: filterVerdict === key ? "var(--iris-3)" : "transparent",
                          color: filterVerdict === key ? "var(--iris-11)" : "var(--gray-10)",
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </Flex>

                  {/* Export */}
                  <button
                    onClick={handleCopy}
                    style={{
                      padding: "6px 16px",
                      borderRadius: 8,
                      border: "1px solid var(--gray-5)",
                      background: copied ? "var(--green-3)" : "transparent",
                      color: copied ? "var(--green-11)" : "var(--gray-10)",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {copied ? "Copied!" : "Copy Results"}
                  </button>
                </Flex>
              </Card>
            )}

            {/* ---- COMPARISON SUMMARY ---- */}
            {results.length >= 2 && (
              <Card mb="6">
                <Heading size="4" mb="4">
                  Comparison Summary
                </Heading>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                    gap: 16,
                  }}
                >
                  {/* Best Value */}
                  {bestValue && (
                    <Box
                      p="4"
                      style={{
                        borderRadius: 12,
                        border: "1px solid var(--green-6)",
                        background:
                          "linear-gradient(135deg, color-mix(in srgb, var(--green-9) 8%, transparent), transparent)",
                      }}
                    >
                      <Text
                        size="1"
                        color="green"
                        weight="bold"
                        as="p"
                        mb="2"
                        style={{ textTransform: "uppercase", letterSpacing: "0.05em" }}
                      >
                        Best Value (Lowest Deviation)
                      </Text>
                      <Text size="3" weight="bold" as="p" mb="1">
                        {bestValue.listing.title}
                      </Text>
                      <Text size="2" color="green" weight="bold">
                        {bestValue.valuation.price_deviation_pct != null
                          ? `${bestValue.valuation.price_deviation_pct > 0 ? "+" : ""}${bestValue.valuation.price_deviation_pct.toFixed(1)}%`
                          : "N/A"}
                      </Text>
                      <Text size="1" color="gray" as="p">
                        {bestValue.listing.city}
                        {bestValue.listing.zone ? `, ${bestValue.listing.zone}` : ""}
                      </Text>
                    </Box>
                  )}

                  {/* Best Investment */}
                  {bestInvestment && (
                    <Box
                      p="4"
                      style={{
                        borderRadius: 12,
                        border: "1px solid var(--iris-6)",
                        background:
                          "linear-gradient(135deg, color-mix(in srgb, var(--iris-9) 8%, transparent), transparent)",
                      }}
                    >
                      <Text
                        size="1"
                        color="iris"
                        weight="bold"
                        as="p"
                        mb="2"
                        style={{ textTransform: "uppercase", letterSpacing: "0.05em" }}
                      >
                        Best Investment (Highest Score)
                      </Text>
                      <Text size="3" weight="bold" as="p" mb="1">
                        {bestInvestment.listing.title}
                      </Text>
                      <Flex align="baseline" gap="1">
                        <Text size="4" weight="bold" color="iris">
                          {bestInvestment.valuation.investment_score?.toFixed(1) ?? "N/A"}
                        </Text>
                        <Text size="1" color="gray">
                          /10
                        </Text>
                      </Flex>
                      <Text size="1" color="gray" as="p">
                        {bestInvestment.listing.city}
                        {bestInvestment.listing.zone ? `, ${bestInvestment.listing.zone}` : ""}
                      </Text>
                    </Box>
                  )}

                  {/* Cheapest per m2 */}
                  {cheapestPerM2 && (
                    <Box
                      p="4"
                      style={{
                        borderRadius: 12,
                        border: "1px solid var(--amber-6)",
                        background:
                          "linear-gradient(135deg, color-mix(in srgb, var(--amber-9) 8%, transparent), transparent)",
                      }}
                    >
                      <Text
                        size="1"
                        color="orange"
                        weight="bold"
                        as="p"
                        mb="2"
                        style={{ textTransform: "uppercase", letterSpacing: "0.05em" }}
                      >
                        Cheapest per m2
                      </Text>
                      <Text size="3" weight="bold" as="p" mb="1">
                        {cheapestPerM2.listing.title}
                      </Text>
                      <Text size="4" weight="bold" color="orange">
                        {cheapestPerM2.listing.price_per_m2 != null
                          ? `€${cheapestPerM2.listing.price_per_m2.toLocaleString()}/m²`
                          : "N/A"}
                      </Text>
                      <Text size="1" color="gray" as="p">
                        {cheapestPerM2.listing.city}
                        {cheapestPerM2.listing.zone ? `, ${cheapestPerM2.listing.zone}` : ""}
                      </Text>
                    </Box>
                  )}
                </div>
              </Card>
            )}

            {/* ---- RANKINGS TABLE ---- */}
            {sortedAndFiltered.length >= 2 && (
              <Card mb="6">
                <Flex justify="between" align="center" mb="4">
                  <Heading size="4">Rankings</Heading>
                  {filterVerdict !== "all" && (
                    <Badge size="1" color={VERDICT_COLOR[filterVerdict]} variant="soft">
                      Showing {sortedAndFiltered.length} {VERDICT_LABEL[filterVerdict].toLowerCase()}
                    </Badge>
                  )}
                </Flex>
                <div style={{ overflowX: "auto" }}>
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      fontSize: 13,
                    }}
                  >
                    <thead>
                      <tr>
                        {["#", "Listing", "City / Zone", "Price", "Price/m2", "Deviation", "Score", "Verdict"].map(
                          (h) => (
                            <th
                              key={h}
                              style={{
                                textAlign: "left",
                                padding: "8px 10px",
                                borderBottom: "1px solid var(--gray-5)",
                                color: "var(--gray-9)",
                                fontSize: 11,
                                fontWeight: 600,
                                textTransform: "uppercase",
                                letterSpacing: "0.04em",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {h}
                            </th>
                          )
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {sortedAndFiltered.map((r, i) => {
                        const isBestVal = isWinner(r, "value");
                        const isBestInv = isWinner(r, "investment");
                        const isCheapest = isWinner(r, "cheapest");
                        return (
                          <tr
                            key={r.url}
                            style={{
                              background:
                                i === 0
                                  ? "color-mix(in srgb, var(--green-9) 5%, transparent)"
                                  : i % 2 === 0
                                    ? "var(--gray-2)"
                                    : "transparent",
                            }}
                          >
                            <td
                              style={{
                                padding: "10px",
                                borderBottom: "1px solid var(--gray-4)",
                                fontWeight: 700,
                                color: i === 0 ? "var(--green-11)" : "var(--gray-9)",
                              }}
                            >
                              {i + 1}
                            </td>
                            <td
                              style={{
                                padding: "10px",
                                borderBottom: "1px solid var(--gray-4)",
                                maxWidth: 220,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                fontWeight: 500,
                              }}
                            >
                              {r.listing.title}
                            </td>
                            <td
                              style={{
                                padding: "10px",
                                borderBottom: "1px solid var(--gray-4)",
                                color: "var(--gray-10)",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {r.listing.city}
                              {r.listing.zone ? `, ${r.listing.zone}` : ""}
                            </td>
                            <td
                              style={{
                                padding: "10px",
                                borderBottom: "1px solid var(--gray-4)",
                                fontVariantNumeric: "tabular-nums",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {r.listing.price_eur != null
                                ? `€${r.listing.price_eur.toLocaleString()}`
                                : "--"}
                            </td>
                            <td
                              style={{
                                padding: "10px",
                                borderBottom: "1px solid var(--gray-4)",
                                fontVariantNumeric: "tabular-nums",
                                fontWeight: isCheapest ? 700 : 400,
                                color: isCheapest ? "var(--amber-11)" : undefined,
                                whiteSpace: "nowrap",
                              }}
                            >
                              {r.listing.price_per_m2 != null
                                ? `€${r.listing.price_per_m2.toLocaleString()}`
                                : "--"}
                            </td>
                            <td
                              style={{
                                padding: "10px",
                                borderBottom: "1px solid var(--gray-4)",
                                fontWeight: isBestVal ? 700 : 400,
                                color: isBestVal
                                  ? "var(--green-11)"
                                  : r.valuation.price_deviation_pct != null
                                    ? r.valuation.price_deviation_pct < 0
                                      ? "var(--green-11)"
                                      : r.valuation.price_deviation_pct > 10
                                        ? "var(--red-11)"
                                        : undefined
                                    : undefined,
                                whiteSpace: "nowrap",
                              }}
                            >
                              {r.valuation.price_deviation_pct != null
                                ? `${r.valuation.price_deviation_pct > 0 ? "+" : ""}${r.valuation.price_deviation_pct.toFixed(1)}%`
                                : "--"}
                            </td>
                            <td
                              style={{
                                padding: "10px",
                                borderBottom: "1px solid var(--gray-4)",
                                fontWeight: isBestInv ? 700 : 500,
                                color: isBestInv
                                  ? "var(--iris-11)"
                                  : r.valuation.investment_score != null
                                    ? r.valuation.investment_score >= 7
                                      ? "var(--green-11)"
                                      : r.valuation.investment_score < 5
                                        ? "var(--red-11)"
                                        : undefined
                                    : undefined,
                                whiteSpace: "nowrap",
                              }}
                            >
                              {r.valuation.investment_score?.toFixed(1) ?? "--"}
                            </td>
                            <td
                              style={{
                                padding: "10px",
                                borderBottom: "1px solid var(--gray-4)",
                              }}
                            >
                              <Badge
                                size="1"
                                color={VERDICT_COLOR[r.valuation.verdict]}
                                variant="soft"
                              >
                                {VERDICT_LABEL[r.valuation.verdict]}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {/* ---- SIDE-BY-SIDE CARDS ---- */}
            <Flex justify="between" align="center" mb="4">
              <Heading size="4">
                Detailed Comparison
              </Heading>
              <Text size="1" color="gray">
                {sortedAndFiltered.length} listing{sortedAndFiltered.length !== 1 ? "s" : ""}
              </Text>
            </Flex>

            {sortedAndFiltered.length === 0 && (
              <Card mb="6" style={{ textAlign: "center", padding: 40 }}>
                <Text size="2" color="gray">No listings match the current filter.</Text>
                <Box mt="3">
                  <button
                    onClick={() => setFilterVerdict("all")}
                    style={{
                      padding: "6px 16px",
                      borderRadius: 8,
                      border: "1px solid var(--gray-5)",
                      background: "transparent",
                      color: "var(--iris-11)",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Show all results
                  </button>
                </Box>
              </Card>
            )}

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
                gap: 16,
                marginBottom: 32,
              }}
            >
              {sortedAndFiltered.map((r, i) => {
                const winnerValue = isWinner(r, "value");
                const winnerInvestment = isWinner(r, "investment");
                const winnerCheapest = isWinner(r, "cheapest");
                const hasWin = winnerValue || winnerInvestment || winnerCheapest;
                return (
                  <Card
                    key={r.url}
                    style={{
                      border: hasWin
                        ? "1px solid var(--iris-7)"
                        : "1px solid var(--gray-4)",
                      position: "relative",
                    }}
                  >
                    {/* Rank badge */}
                    <Box
                      style={{
                        position: "absolute",
                        top: 12,
                        right: 12,
                        width: 28,
                        height: 28,
                        borderRadius: "50%",
                        background:
                          i === 0
                            ? "var(--green-9)"
                            : i === 1
                              ? "var(--gray-7)"
                              : "var(--gray-5)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 12,
                        fontWeight: 700,
                        color: i === 0 ? "#fff" : "var(--gray-12)",
                      }}
                    >
                      {i + 1}
                    </Box>

                    {/* Winner tags */}
                    {hasWin && (
                      <Flex gap="1" mb="2" wrap="wrap">
                        {winnerValue && (
                          <Badge size="1" color="green" variant="surface">
                            Best Value
                          </Badge>
                        )}
                        {winnerInvestment && (
                          <Badge size="1" color="iris" variant="surface">
                            Best Investment
                          </Badge>
                        )}
                        {winnerCheapest && (
                          <Badge size="1" color="orange" variant="surface">
                            Cheapest /m2
                          </Badge>
                        )}
                      </Flex>
                    )}

                    {/* Title + verdict */}
                    <Text
                      size="3"
                      weight="bold"
                      as="p"
                      mb="2"
                      style={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        paddingRight: 36,
                      }}
                    >
                      {r.listing.title}
                    </Text>

                    <Flex gap="2" mb="3" wrap="wrap">
                      <Badge size="2" color={VERDICT_COLOR[r.valuation.verdict]}>
                        {VERDICT_LABEL[r.valuation.verdict]}
                      </Badge>
                      {r.valuation.recommendation && (
                        <Badge
                          size="2"
                          color={REC_COLOR[r.valuation.recommendation]}
                          variant="surface"
                        >
                          {REC_LABEL[r.valuation.recommendation]}
                        </Badge>
                      )}
                    </Flex>

                    <Separator mb="3" size="4" />

                    {/* Location */}
                    <Flex gap="2" mb="2" align="center">
                      <Text size="1" color="gray" weight="bold">
                        Location
                      </Text>
                      <Text size="2">
                        {r.listing.city}
                        {r.listing.zone ? `, ${r.listing.zone}` : ""}
                      </Text>
                    </Flex>

                    {/* Key metrics grid */}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "8px 16px",
                        marginBottom: 12,
                      }}
                    >
                      {r.listing.price_eur != null && (
                        <Box>
                          <Text size="1" color="gray" as="p">
                            Price
                          </Text>
                          <Text size="3" weight="bold">
                            €{r.listing.price_eur.toLocaleString()}
                          </Text>
                        </Box>
                      )}
                      {r.listing.price_per_m2 != null && (
                        <Box>
                          <Text size="1" color="gray" as="p">
                            Price/m2
                          </Text>
                          <Text
                            size="3"
                            weight="bold"
                            color={winnerCheapest ? "orange" : undefined}
                          >
                            €{r.listing.price_per_m2.toLocaleString()}
                          </Text>
                        </Box>
                      )}
                      {r.valuation.price_deviation_pct != null && (
                        <Box>
                          <Text size="1" color="gray" as="p">
                            Deviation
                          </Text>
                          <Text
                            size="3"
                            weight="bold"
                            color={
                              winnerValue
                                ? "green"
                                : r.valuation.price_deviation_pct < 0
                                  ? "green"
                                  : r.valuation.price_deviation_pct > 10
                                    ? "red"
                                    : undefined
                            }
                          >
                            {r.valuation.price_deviation_pct > 0 ? "+" : ""}
                            {r.valuation.price_deviation_pct.toFixed(1)}%
                          </Text>
                        </Box>
                      )}
                      {r.valuation.investment_score != null && (
                        <Box>
                          <Text size="1" color="gray" as="p">
                            Investment Score
                          </Text>
                          <Flex align="baseline" gap="1">
                            <Text
                              size="3"
                              weight="bold"
                              color={
                                winnerInvestment
                                  ? "iris"
                                  : r.valuation.investment_score >= 7
                                    ? "green"
                                    : r.valuation.investment_score < 5
                                      ? "red"
                                      : undefined
                              }
                            >
                              {r.valuation.investment_score.toFixed(1)}
                            </Text>
                            <Text size="1" color="gray">
                              /10
                            </Text>
                          </Flex>
                        </Box>
                      )}
                    </div>

                    {/* Score bar */}
                    {r.valuation.investment_score != null && (
                      <Box mb="3">
                        <InvestmentScoreBar score={r.valuation.investment_score} />
                      </Box>
                    )}

                    {/* Property details */}
                    <Flex gap="3" wrap="wrap" mb="3">
                      {r.listing.rooms != null && (
                        <Text size="1" color="gray">
                          <strong>{r.listing.rooms}</strong> rooms
                        </Text>
                      )}
                      {r.listing.size_m2 != null && (
                        <Text size="1" color="gray">
                          <strong>{r.listing.size_m2}</strong> m2
                        </Text>
                      )}
                      {r.listing.condition && (
                        <Text size="1" color="gray">
                          {r.listing.condition}
                        </Text>
                      )}
                      {r.listing.floor != null && (
                        <Text size="1" color="gray">
                          Floor {r.listing.floor}
                          {r.listing.total_floors ? `/${r.listing.total_floors}` : ""}
                        </Text>
                      )}
                    </Flex>

                    {/* Opportunities & risks */}
                    {(r.valuation.opportunity_factors.length > 0 ||
                      r.valuation.risk_factors.length > 0) && (
                      <>
                        <Separator mb="3" size="4" />
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: 12,
                          }}
                        >
                          {r.valuation.opportunity_factors.length > 0 && (
                            <Box>
                              <Text
                                size="1"
                                color="green"
                                weight="bold"
                                as="p"
                                mb="1"
                                style={{
                                  textTransform: "uppercase",
                                  letterSpacing: "0.05em",
                                  fontSize: 10,
                                }}
                              >
                                Opportunities
                              </Text>
                              {r.valuation.opportunity_factors.slice(0, 3).map((f, fi) => (
                                <Flex key={fi} gap="1" mb="1" align="start">
                                  <Text
                                    size="1"
                                    color="green"
                                    style={{ flexShrink: 0, fontSize: 10 }}
                                  >
                                    +
                                  </Text>
                                  <Text size="1" style={{ fontSize: 11, lineHeight: 1.4 }}>
                                    {f}
                                  </Text>
                                </Flex>
                              ))}
                            </Box>
                          )}
                          {r.valuation.risk_factors.length > 0 && (
                            <Box>
                              <Text
                                size="1"
                                color="red"
                                weight="bold"
                                as="p"
                                mb="1"
                                style={{
                                  textTransform: "uppercase",
                                  letterSpacing: "0.05em",
                                  fontSize: 10,
                                }}
                              >
                                Risks
                              </Text>
                              {r.valuation.risk_factors.slice(0, 3).map((f, fi) => (
                                <Flex key={fi} gap="1" mb="1" align="start">
                                  <Text
                                    size="1"
                                    color="red"
                                    style={{ flexShrink: 0, fontSize: 10 }}
                                  >
                                    -
                                  </Text>
                                  <Text size="1" style={{ fontSize: 11, lineHeight: 1.4 }}>
                                    {f}
                                  </Text>
                                </Flex>
                              ))}
                            </Box>
                          )}
                        </div>
                      </>
                    )}

                    {/* Footer link */}
                    <Separator mt="3" mb="2" size="4" />
                    <Flex justify="between" align="center">
                      <Text size="1" color="gray">
                        {r.source} | {new Date(r.analyzed_at).toLocaleDateString()}
                      </Text>
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          fontSize: 11,
                          color: "var(--iris-11)",
                          textDecoration: "none",
                        }}
                      >
                        View listing &#8599;
                      </a>
                    </Flex>
                  </Card>
                );
              })}
            </div>
          </>
        )}

        {/* Single result -- show simple card */}
        {!running && results.length === 1 && (
          <Card>
            <Text size="2" color="gray" as="p">
              Only one listing analyzed. Add more URLs above to compare.
            </Text>
            <Separator my="3" size="4" />
            <Flex justify="between" align="center">
              <Box>
                <Text size="3" weight="bold" as="p">
                  {results[0].listing.title}
                </Text>
                <Text size="1" color="gray">
                  {results[0].listing.city}
                  {results[0].listing.zone ? `, ${results[0].listing.zone}` : ""}
                </Text>
              </Box>
              <Flex gap="2" align="center">
                {results[0].listing.price_eur != null && (
                  <Text size="3" weight="bold">
                    €{results[0].listing.price_eur.toLocaleString()}
                  </Text>
                )}
                <Badge
                  size="2"
                  color={VERDICT_COLOR[results[0].valuation.verdict]}
                >
                  {VERDICT_LABEL[results[0].valuation.verdict]}
                </Badge>
              </Flex>
            </Flex>
          </Card>
        )}
      </Box>
    </div>
  );
}
